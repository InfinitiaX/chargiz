import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Car } from "lucide-react";

export const Route = createFileRoute("/dashboard/listes/vehicules/$vehiculeId")({
  component: FicheVehicule,
  head: () => ({ meta: [{ title: "ChargiZ — Fiche véhicule" }] }),
});

interface Vehicule {
  id: string;
  marque: string | null;
  modele: string | null;
  vin: string | null;
  immatriculation: string | null;
  capacite_batterie: number | null;
  statut_smartcar: string;
  statut_affectation: string;
  collaborateur_id: string | null;
  entreprise_id: string;
}

interface AffectationRow {
  collaborateur_nom: string;
  collaborateur_prenom: string;
  date_debut: string;
  date_fin: string | null;
}

interface SessionRow {
  id: string;
  collaborateur_nom: string;
  collaborateur_prenom: string;
  jour_semaine: string | null;
  date_debut: string | null;
  energie_kwh: number | null;
  cout_euro: number | null;
  kilometrage: number | null;
}

function FicheVehicule() {
  const { vehiculeId } = Route.useParams();
  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [currentCollab, setCurrentCollab] = useState<{ nom: string; prenom: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [vehiculeId]);

  async function loadData() {
    const { data: v } = await supabase.from("vehicules").select("*").eq("id", vehiculeId).single();
    if (v) {
      setVehicule(v as Vehicule);
      if (v.collaborateur_id) {
        const { data: p } = await supabase.from("profiles").select("nom, prenom").eq("id", v.collaborateur_id).single();
        if (p) setCurrentCollab(p);
      }
    }

    const { data: sess } = await supabase.from("sessions_recharge").select("id, collaborateur_id, jour_semaine, date_debut, energie_kwh, cout_euro, kilometrage")
      .eq("vehicule_id", vehiculeId)
      .order("date_debut", { ascending: false })
      .limit(50);

    if (sess) {
      const collabIds = [...new Set(sess.map(s => s.collaborateur_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, nom, prenom").in("id", collabIds);
      const profileMap: Record<string, { nom: string; prenom: string }> = {};
      if (profiles) profiles.forEach(p => { profileMap[p.id] = p; });

      setSessions(sess.map(s => ({
        id: s.id,
        collaborateur_nom: profileMap[s.collaborateur_id]?.nom || "—",
        collaborateur_prenom: profileMap[s.collaborateur_id]?.prenom || "",
        jour_semaine: s.jour_semaine,
        date_debut: s.date_debut,
        energie_kwh: s.energie_kwh,
        cout_euro: s.cout_euro,
        kilometrage: s.kilometrage,
      })));
    }
  }

  if (!vehicule) return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Chargement...</div></div>;

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link to="/dashboard/listes/vehicules" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour aux véhicules
        </Link>
      </div>

      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
          <Car className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{vehicule.marque || "—"} {vehicule.modele || ""}</h1>
          <p className="text-sm text-muted-foreground font-mono">{vehicule.immatriculation || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Informations générales */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Informations générales</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-muted-foreground">Marque</p><p className="font-medium text-card-foreground">{vehicule.marque || "—"}</p></div>
            <div><p className="text-muted-foreground">Modèle</p><p className="font-medium text-card-foreground">{vehicule.modele || "—"}</p></div>
            <div><p className="text-muted-foreground">VIN</p><p className="font-medium font-mono text-xs text-card-foreground">{vehicule.vin || "—"}</p></div>
            <div><p className="text-muted-foreground">Immatriculation</p><p className="font-medium font-mono text-card-foreground">{vehicule.immatriculation || "—"}</p></div>
            <div><p className="text-muted-foreground">Capacité batterie</p><p className="font-medium text-card-foreground">{vehicule.capacite_batterie ? `${vehicule.capacite_batterie} kWh` : "—"}</p></div>
            <div><p className="text-muted-foreground">Collaborateur actuel</p><p className="font-medium text-card-foreground">{currentCollab ? `${currentCollab.prenom} ${currentCollab.nom}` : "Aucun"}</p></div>
          </div>
        </div>

        {/* État actuel */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">État actuel</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Statut d'affectation</p>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                vehicule.statut_affectation === "affecte" ? "bg-chargiz-teal/10 text-chargiz-teal"
                : vehicule.statut_affectation === "archive" ? "bg-muted text-muted-foreground"
                : "bg-kpi-sessions/10 text-kpi-sessions"
              }`}>
                {vehicule.statut_affectation === "affecte" ? "Affecté" : vehicule.statut_affectation === "archive" ? "Archivé" : "Non affecté"}
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Statut de connexion</p>
              <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${vehicule.statut_smartcar === "connecte" ? "text-chargiz-teal" : vehicule.statut_smartcar === "suspendu" ? "text-kpi-away" : "text-muted-foreground"}`}>
                <span className={`h-2 w-2 rounded-full ${vehicule.statut_smartcar === "connecte" ? "bg-chargiz-teal" : vehicule.statut_smartcar === "suspendu" ? "bg-kpi-away" : "bg-muted-foreground"}`} />
                {vehicule.statut_smartcar === "connecte" ? "Connecté" : vehicule.statut_smartcar === "suspendu" ? "Suspendu" : "Déconnecté"}
              </span>
            </div>
          </div>
        </div>

        {/* Historique des recharges */}
        <div className="rounded-xl border border-border bg-card shadow-sm lg:col-span-2">
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-lg font-semibold text-card-foreground">Historique des recharges</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Nom</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Prénom</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Jour</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">kWh</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Coût</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Km</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Aucune session</td></tr>
                ) : sessions.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 text-card-foreground">{s.collaborateur_nom}</td>
                    <td className="px-6 py-3 text-card-foreground">{s.collaborateur_prenom}</td>
                    <td className="px-6 py-3 text-card-foreground">{s.jour_semaine || "—"}</td>
                    <td className="px-6 py-3 text-card-foreground">{s.date_debut ? new Date(s.date_debut).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{s.energie_kwh?.toFixed(2) || "0"}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{s.cout_euro?.toFixed(2) || "0"} €</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{s.kilometrage?.toFixed(1) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
