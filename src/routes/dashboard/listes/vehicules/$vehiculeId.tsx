import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Car, User, Calendar, Zap, Gauge, ShieldCheck, History, Building2, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

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

interface Collaborateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

interface Entreprise {
  id: string;
  nom: string;
}

interface Session {
  id: string;
  date_session: string;
  energie_kwh: number;
  cout_euro: number;
  kilometrage: number | null;
  is_domicile: boolean;
}

function FicheVehicule() {
  const { vehiculeId } = Route.useParams();
  const { role } = useAuth();
  const isSuperadmin = role === "superadmin";
  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [collab, setCollab] = useState<Collaborateur | null>(null);
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [vehiculeId]);

  async function loadData() {
    setLoading(true);
    try {
      const v = await apiFetch<Vehicule>(`/api/vehicules/${vehiculeId}`);
      setVehicule(v);

      // Hiérarchie : entreprise → collaborateur → véhicule
      const fetches: Promise<any>[] = [];
      if (v.entreprise_id) {
        fetches.push(
          apiFetch<Entreprise>(`/api/entreprises/${v.entreprise_id}`).then(setEntreprise).catch(() => {})
        );
      }
      if (v.collaborateur_id) {
        fetches.push(
          apiFetch<Collaborateur>(`/api/collaborateurs/${v.collaborateur_id}`).then(setCollab).catch(() => {})
        );
      }
      fetches.push(
        apiFetch<Session[]>(`/api/sessions?vehicule_id=${vehiculeId}`).then(setSessions).catch(() => {})
      );
      await Promise.all(fetches);
    } catch (err) {
      console.error("Error loading vehicle details:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!vehicule) return <div className="p-8 text-center text-muted-foreground">Véhicule non trouvé.</div>;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <Link to="/dashboard/listes/vehicules" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour aux véhicules
        </Link>
      </div>

      {/* Fil d'Ariane : Entreprise → Collaborateur → Véhicule */}
      <div className="mb-6 flex items-center gap-2 flex-wrap text-sm">
        {/* Entreprise */}
        {entreprise ? (
          <Link
            to={isSuperadmin ? "/dashboard/listes/entreprises/$id" : "/dashboard/listes/entreprises"}
            params={isSuperadmin ? { id: entreprise.id } : undefined}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 hover:border-primary hover:text-primary transition-colors"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span className="font-medium">{entreprise.nom}</span>
          </Link>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> <span className="text-xs italic">Sans entreprise</span>
          </span>
        )}

        <ChevronRight className="h-4 w-4 text-muted-foreground" />

        {/* Collaborateur */}
        {collab ? (
          <Link
            to="/dashboard/collaborateur/$id"
            params={{ id: collab.id }}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 hover:border-primary hover:text-primary transition-colors"
          >
            <User className="h-3.5 w-3.5" />
            <span className="font-medium">{collab.prenom} {collab.nom}</span>
          </Link>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-dashed border-border bg-muted px-3 py-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5" /> <span className="text-xs italic">Aucun collaborateur affilié</span>
          </span>
        )}

        <ChevronRight className="h-4 w-4 text-muted-foreground" />

        {/* Véhicule (current) */}
        <span className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-primary-foreground">
          <Car className="h-3.5 w-3.5" />
          <span className="font-medium">{vehicule.marque} {vehicule.modele}</span>
        </span>
      </div>

      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
          <Car className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{vehicule.marque || "—"} {vehicule.modele || ""}</h1>
          <p className="text-sm text-muted-foreground font-mono">{vehicule.immatriculation || "Immatriculation non renseignée"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Info Card */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Détails techniques
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">VIN</p>
                <p className="text-sm font-medium text-card-foreground font-mono">{vehicule.vin || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Capacité batterie</p>
                <p className="text-sm font-medium text-card-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3 text-yellow-500" /> {vehicule.capacite_batterie ? `${vehicule.capacite_batterie} kWh` : "Non renseignée"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Statut d'affectation</p>
                <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  vehicule.statut_affectation === "affecte" ? "bg-chargiz-teal/10 text-chargiz-teal"
                  : "bg-kpi-sessions/10 text-kpi-sessions"
                }`}>
                  {vehicule.statut_affectation === "affecte" ? "Affecté" : "Disponible"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Collaborateur affecté
            </h3>
            {collab ? (
              <Link to="/dashboard/collaborateur/$id" params={{ id: collab.id }} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-card-foreground">{collab.prenom} {collab.nom}</p>
                  <p className="text-xs text-muted-foreground">Voir la fiche</p>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground italic">Aucun collaborateur affecté.</p>
            )}
          </div>
        </div>

        {/* Sessions Card */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-card-foreground">Historique des recharges</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left">
                    <th className="px-6 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Lieu</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">Énergie (kWh)</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">Km (Odomètre)</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">Coût (€)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sessions.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Aucune session enregistrée pour ce véhicule</td></tr>
                  ) : sessions.map(s => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-card-foreground">{new Date(s.date_session).toLocaleDateString("fr-FR")}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.is_domicile ? 'bg-chargiz-teal/10 text-chargiz-teal' : 'bg-kpi-away/10 text-kpi-away'}`}>
                          {s.is_domicile ? 'Domicile' : 'Extérieur'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-card-foreground">{s.energie_kwh.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-card-foreground flex items-center justify-end gap-1">
                        <Gauge className="h-3 w-3 text-muted-foreground" /> {s.kilometrage?.toLocaleString() || "—"}
                      </td>
                      <td className="px-6 py-4 text-right text-card-foreground font-medium">{s.cout_euro.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
