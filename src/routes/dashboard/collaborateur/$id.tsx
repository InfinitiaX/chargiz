import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, User, Car, Mail, Phone, MapPin, Calendar, Database } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/dashboard/collaborateur/$id")({
  component: CollaborateurDetails,
  head: () => ({ meta: [{ title: "ChargiZ — Fiche Collaborateur" }] }),
});

interface Collaborateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  adresse: string | null;
  ville: string | null;
  is_active: boolean;
  created_at: string;
}

interface Vehicule {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
  statut_smartcar: string;
}

interface Session {
  id: string;
  date_session: string;
  energie_kwh: number;
  cout_euro: number;
  is_domicile: boolean;
}

function CollaborateurDetails() {
  const { id } = Route.useParams();
  const [collab, setCollab] = useState<Collaborateur | null>(null);
  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const c = await apiFetch<Collaborateur>(`/api/collaborateurs/${id}`);
      setCollab(c);

      const vs = await apiFetch<Vehicule[]>(`/api/vehicules?collaborateur_id=${id}`);
      if (vs.length > 0) setVehicule(vs[0]);

      const ss = await apiFetch<Session[]>(`/api/sessions?collaborateur_id=${id}`);
      setSessions(ss);
    } catch (err) {
      console.error("Error loading collaborator details:", err);
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

  if (!collab) return <div className="p-8 text-center text-muted-foreground">Collaborateur non trouvé.</div>;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <Link to="/dashboard/listes/collaborateurs" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{collab.prenom} {collab.nom}</h1>
            <p className="text-sm text-muted-foreground">{collab.is_active ? "Compte Actif" : "Compte Archivé"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Info Card */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Informations Personnelles</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-card-foreground">{collab.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Téléphone</p>
                  <p className="text-sm font-medium text-card-foreground">{collab.telephone || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Adresse</p>
                  <p className="text-sm font-medium text-card-foreground">{collab.adresse || "—"}, {collab.ville || ""}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Membre depuis</p>
                  <p className="text-sm font-medium text-card-foreground">{new Date(collab.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Véhicule Affecté</h3>
            {vehicule ? (
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chargiz-teal/10 text-chargiz-teal">
                  <Car className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-card-foreground">{vehicule.marque} {vehicule.modele}</p>
                  <p className="text-xs text-muted-foreground font-mono">{vehicule.immatriculation}</p>
                  <p className={`text-xs mt-1 font-medium ${vehicule.statut_smartcar === 'connecte' ? 'text-chargiz-teal' : 'text-kpi-away'}`}>
                    {vehicule.statut_smartcar === 'connecte' ? 'Connecté' : 'Hors ligne'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Aucun véhicule affecté.</p>
            )}
          </div>
        </div>

        {/* Sessions Card */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-card-foreground">Dernières sessions</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left">
                    <th className="px-6 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Lieu</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">Énergie (kWh)</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">Coût (€)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sessions.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Aucune session enregistrée</td></tr>
                  ) : sessions.map(s => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-card-foreground">{new Date(s.date_session).toLocaleDateString("fr-FR")}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.is_domicile ? 'bg-chargiz-teal/10 text-chargiz-teal' : 'bg-kpi-away/10 text-kpi-away'}`}>
                          {s.is_domicile ? 'Domicile' : 'Travail / Autre'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-card-foreground">{s.energie_kwh.toFixed(2)}</td>
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
