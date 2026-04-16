import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, User, Car, BarChart3, FileText,
  Edit, UserX, Unlink, Download, Send, Calendar
} from "lucide-react";

export const Route = createFileRoute("/dashboard/collaborateurs/$id")({
  component: CollaborateurFiche,
  head: () => ({
    meta: [
      { title: "ChargiZ — Fiche collaborateur" },
      { name: "description", content: "Détails du collaborateur et de ses recharges." },
    ],
  }),
});

interface CollabProfile {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  entreprise_id: string | null;
  filiale_id: string | null;
  site_id: string | null;
  cout_kwh_domicile: number | null;
  jours_suivi: string[];
  horaires_suivi: Record<string, unknown>;
  jours_conge: string[];
  is_active: boolean;
}

interface Vehicule {
  id: string;
  marque: string | null;
  modele: string | null;
  vin: string | null;
  immatriculation: string | null;
  capacite_batterie: number | null;
  statut_smartcar: string;
  statut_affectation: string;
}

interface Session {
  id: string;
  date_debut: string | null;
  date_fin: string | null;
  energie_kwh: number | null;
  is_domicile: boolean;
  cout_euro: number | null;
  kilometrage: number | null;
  jour_semaine: string | null;
}

function CollaborateurFiche() {
  const { id } = Route.useParams();
  const [profile, setProfile] = useState<CollabProfile | null>(null);
  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [entrepriseNom, setEntrepriseNom] = useState("");
  const [filialeNom, setFilialeNom] = useState("");
  const [siteNom, setSiteNom] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [detachOpen, setDetachOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [id, dateFrom, dateTo]);

  async function loadData() {
    const { data: p } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (p) {
      setProfile(p as CollabProfile);
      if (p.entreprise_id) {
        const { data: e } = await supabase.from("entreprises").select("nom").eq("id", p.entreprise_id).single();
        if (e) setEntrepriseNom(e.nom);
      }
      if (p.filiale_id) {
        const { data: f } = await supabase.from("filiales").select("nom").eq("id", p.filiale_id).single();
        if (f) setFilialeNom(f.nom);
      }
      if (p.site_id) {
        const { data: s } = await supabase.from("sites").select("nom").eq("id", p.site_id).single();
        if (s) setSiteNom(s.nom);
      }
    }

    const { data: v } = await supabase.from("vehicules").select("*").eq("collaborateur_id", id).limit(1).maybeSingle();
    if (v) setVehicule(v as Vehicule);

    const { data: sess } = await supabase.from("sessions_recharge").select("*")
      .eq("collaborateur_id", id)
      .gte("date_debut", dateFrom)
      .lte("date_debut", dateTo + "T23:59:59")
      .order("date_debut", { ascending: true });
    if (sess) setSessions(sess as Session[]);
  }

  const totalDomicile = sessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
  const totalHors = sessions.filter(s => !s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
  const totalKm = sessions.reduce((a, s) => a + (s.kilometrage || 0), 0);
  const consoMoyenne = totalKm > 0 ? ((totalDomicile + totalHors) / totalKm * 100) : 0;
  const co2Evite = (totalDomicile + totalHors) * 0.05;
  const sessionsDomicile = sessions.filter(s => s.is_domicile);

  const handleRevoke = async (vehiculeAction: "sortir" | "garder", abonnement?: "continuer" | "suspendre") => {
    await supabase.from("profiles").update({ is_active: false }).eq("id", id);
    if (vehicule) {
      if (vehiculeAction === "sortir") {
        await supabase.from("vehicules").update({ statut_affectation: "archive", collaborateur_id: null }).eq("id", vehicule.id);
      } else if (abonnement === "suspendre") {
        await supabase.from("vehicules").update({ statut_smartcar: "suspendu", collaborateur_id: null, statut_affectation: "non_affecte" }).eq("id", vehicule.id);
      } else {
        await supabase.from("vehicules").update({ collaborateur_id: null, statut_affectation: "non_affecte" }).eq("id", vehicule.id);
      }
    }
    setRevokeOpen(false);
    loadData();
  };

  const handleDetach = async (abonnement: "continuer" | "suspendre") => {
    if (!vehicule) return;
    if (abonnement === "suspendre") {
      await supabase.from("vehicules").update({ statut_smartcar: "suspendu", collaborateur_id: null, statut_affectation: "non_affecte" }).eq("id", vehicule.id);
    } else {
      await supabase.from("vehicules").update({ collaborateur_id: null, statut_affectation: "non_affecte" }).eq("id", vehicule.id);
    }
    setDetachOpen(false);
    loadData();
  };

  if (!profile) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-muted-foreground">Chargement...</div>
    </div>
  );

  const jours = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link to="/dashboard/collaborateurs" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
      </div>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{profile.prenom} {profile.nom}</h1>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
          <span className={`ml-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${profile.is_active ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-destructive/10 text-destructive"}`}>
            {profile.is_active ? "Actif" : "Révoqué"}
          </span>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            <Edit className="h-4 w-4" /> Modifier
          </button>
          <button onClick={() => setRevokeOpen(true)} className="flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
            <UserX className="h-4 w-4" /> Révoquer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bloc identité */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground mb-4">
            <User className="h-5 w-5 text-primary" /> Identité
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-muted-foreground">Nom</p><p className="font-medium text-card-foreground">{profile.nom}</p></div>
            <div><p className="text-muted-foreground">Prénom</p><p className="font-medium text-card-foreground">{profile.prenom}</p></div>
            <div><p className="text-muted-foreground">Email</p><p className="font-medium text-card-foreground">{profile.email}</p></div>
            <div><p className="text-muted-foreground">Téléphone</p><p className="font-medium text-card-foreground">{profile.telephone || "—"}</p></div>
            <div className="col-span-2"><p className="text-muted-foreground">Adresse</p><p className="font-medium text-card-foreground">{[profile.adresse, profile.code_postal, profile.ville].filter(Boolean).join(", ") || "—"}</p></div>
            <div><p className="text-muted-foreground">Entreprise</p><p className="font-medium text-card-foreground">{entrepriseNom || "—"}</p></div>
            <div><p className="text-muted-foreground">Filiale</p><p className="font-medium text-card-foreground">{filialeNom || "—"}</p></div>
            <div><p className="text-muted-foreground">Site</p><p className="font-medium text-card-foreground">{siteNom || "—"}</p></div>
            <div><p className="text-muted-foreground">Coût kWh domicile</p><p className="font-medium text-card-foreground">{profile.cout_kwh_domicile ? `${profile.cout_kwh_domicile} €` : "—"}</p></div>
          </div>
          {/* Jours de suivi */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">Jours de suivi de recharge</p>
            <div className="flex gap-2">
              {jours.map(j => {
                const active = Array.isArray(profile.jours_suivi) && profile.jours_suivi.includes(j.toLowerCase());
                return (
                  <span key={j} className={`rounded-md px-3 py-1 text-xs font-medium ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{j}</span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bloc véhicule */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
              <Car className="h-5 w-5 text-primary" /> Véhicule
            </h3>
            {vehicule && (
              <button onClick={() => setDetachOpen(true)} className="flex items-center gap-1 text-xs text-destructive hover:underline">
                <Unlink className="h-3.5 w-3.5" /> Détacher
              </button>
            )}
          </div>
          {vehicule ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Marque</p><p className="font-medium text-card-foreground">{vehicule.marque || "—"}</p></div>
              <div><p className="text-muted-foreground">Modèle</p><p className="font-medium text-card-foreground">{vehicule.modele || "—"}</p></div>
              <div><p className="text-muted-foreground">VIN</p><p className="font-medium font-mono text-xs text-card-foreground">{vehicule.vin || "—"}</p></div>
              <div><p className="text-muted-foreground">Immatriculation</p><p className="font-medium font-mono text-card-foreground">{vehicule.immatriculation || "—"}</p></div>
              <div><p className="text-muted-foreground">Capacité batterie</p><p className="font-medium text-card-foreground">{vehicule.capacite_batterie ? `${vehicule.capacite_batterie} kWh` : "—"}</p></div>
              <div><p className="text-muted-foreground">Statut Smartcar</p>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${vehicule.statut_smartcar === "connecte" ? "text-chargiz-teal" : "text-muted-foreground"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${vehicule.statut_smartcar === "connecte" ? "bg-chargiz-teal" : "bg-muted-foreground"}`} />
                  {vehicule.statut_smartcar === "connecte" ? "Connecté" : vehicule.statut_smartcar === "suspendu" ? "Suspendu" : "Déconnecté"}
                </span>
              </div>
              <div><p className="text-muted-foreground">Affectation</p><p className="font-medium text-card-foreground capitalize">{vehicule.statut_affectation.replace("_", " ")}</p></div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun véhicule affecté.</p>
          )}
        </div>

        {/* Bloc statistiques */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
              <BarChart3 className="h-5 w-5 text-primary" /> Statistiques
            </h3>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs" />
              <span className="text-xs text-muted-foreground">à</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-2xl font-bold text-chargiz-teal">{totalDomicile.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">kWh domicile</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-2xl font-bold text-chargiz-lime-dark">{totalHors.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">kWh hors domicile</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{consoMoyenne.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">kWh/100km</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{co2Evite.toFixed(1)} kg</p>
              <p className="text-xs text-muted-foreground">CO₂ évité</p>
            </div>
          </div>
        </div>

        {/* Bloc sessions domicile */}
        <div className="rounded-xl border border-border bg-card shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
              <FileText className="h-5 w-5 text-primary" /> Récapitulatif recharges domicile
            </h3>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted">
                <Download className="h-3.5 w-3.5" /> Télécharger PDF
              </button>
              <button className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-chargiz-teal-light">
                <Send className="h-3.5 w-3.5" /> Envoyer par email
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Jour</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Immat</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">kWh</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">€</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Km</th>
                </tr>
              </thead>
              <tbody>
                {sessionsDomicile.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Aucune session pour cette période</td></tr>
                ) : sessionsDomicile.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 text-card-foreground">{s.jour_semaine || "—"}</td>
                    <td className="px-6 py-3 text-card-foreground">{s.date_debut ? new Date(s.date_debut).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="px-6 py-3 font-mono text-xs text-card-foreground">{vehicule?.immatriculation || "—"}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{s.energie_kwh?.toFixed(2) || "0"}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{s.cout_euro?.toFixed(2) || "0"}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{s.kilometrage?.toFixed(1) || "—"}</td>
                  </tr>
                ))}
              </tbody>
              {sessionsDomicile.length > 0 && (
                <tfoot>
                  <tr className="bg-chargiz-teal/5 font-semibold">
                    <td colSpan={3} className="px-6 py-3 text-card-foreground">Total de la période</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{totalDomicile.toFixed(2)} kWh</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{sessionsDomicile.reduce((a, s) => a + (s.cout_euro || 0), 0).toFixed(2)} €</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{sessionsDomicile.reduce((a, s) => a + (s.kilometrage || 0), 0).toFixed(1)} km</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Revoke Dialog */}
      {revokeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl border border-border">
            <h3 className="text-lg font-semibold text-card-foreground mb-2">Révoquer {profile.prenom} {profile.nom} ?</h3>
            <p className="text-sm text-muted-foreground mb-4">Que souhaitez-vous faire du véhicule ?</p>
            <div className="space-y-2">
              <button onClick={() => handleRevoke("sortir")} className="w-full rounded-lg border border-border px-4 py-3 text-sm text-left text-foreground hover:bg-muted">Sortir le véhicule de la flotte</button>
              <button onClick={() => handleRevoke("garder", "continuer")} className="w-full rounded-lg border border-border px-4 py-3 text-sm text-left text-foreground hover:bg-muted">Garder — Continuer l'abonnement</button>
              <button onClick={() => {
                if (confirm("La suspension entraînera des frais de réactivation. Êtes-vous sûr ?")) {
                  handleRevoke("garder", "suspendre");
                }
              }} className="w-full rounded-lg border border-destructive/30 px-4 py-3 text-sm text-left text-destructive hover:bg-destructive/10">
                Garder — Suspendre l'abonnement
              </button>
            </div>
            <button onClick={() => setRevokeOpen(false)} className="mt-4 w-full rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Annuler</button>
          </div>
        </div>
      )}

      {/* Detach Vehicle Dialog */}
      {detachOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl border border-border">
            <h3 className="text-lg font-semibold text-card-foreground mb-2">Détacher le véhicule ?</h3>
            <p className="text-sm text-muted-foreground mb-4">Que faire de l'abonnement Smartcar ?</p>
            <div className="space-y-2">
              <button onClick={() => handleDetach("continuer")} className="w-full rounded-lg border border-border px-4 py-3 text-sm text-left text-foreground hover:bg-muted">Continuer l'abonnement</button>
              <button onClick={() => {
                if (confirm("La suspension entraînera des frais de réactivation. Êtes-vous sûr ?")) {
                  handleDetach("suspendre");
                }
              }} className="w-full rounded-lg border border-destructive/30 px-4 py-3 text-sm text-left text-destructive hover:bg-destructive/10">
                Suspendre l'abonnement
              </button>
            </div>
            <button onClick={() => setDetachOpen(false)} className="mt-4 w-full rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
