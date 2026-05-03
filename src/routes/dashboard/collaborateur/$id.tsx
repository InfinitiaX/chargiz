import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, User, Car, Mail, Phone, MapPin, Calendar, Database, Filter } from "lucide-react";
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
  
  // Date filter state (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

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

  // Filter sessions
  const filteredSessions = useMemo(() => {
    if (selectedMonth === "all") return sessions;
    return sessions.filter(s => {
      const date = new Date(s.date_session);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthStr === selectedMonth;
    });
  }, [sessions, selectedMonth]);

  // Extract available months for filter
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    sessions.forEach(s => {
      const date = new Date(s.date_session);
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(months).sort().reverse(); // newest first
  }, [sessions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!collab) return <div className="p-8 text-center text-muted-foreground">Collaborateur non trouvé.</div>;

  // Compute totals for current filter
  const totalKwh = filteredSessions.reduce((acc, s) => acc + s.energie_kwh, 0);
  const totalCout = filteredSessions.reduce((acc, s) => acc + s.cout_euro, 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 print:p-0 print:m-0">
      <div className="mb-6 print:hidden">
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
        <div className="flex items-center gap-3">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:brightness-95 print:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Télécharger PDF
          </button>
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
          
          {/* Summary Card for Print */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm hidden print:block">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Récapitulatif Période</h3>
            <div className="space-y-2">
              <p className="text-sm"><span className="text-muted-foreground">Période :</span> {selectedMonth === 'all' ? 'Toutes' : selectedMonth}</p>
              <p className="text-sm"><span className="text-muted-foreground">Nombre de recharges :</span> {filteredSessions.length}</p>
              <p className="text-sm"><span className="text-muted-foreground">Énergie totale :</span> {totalKwh.toFixed(2)} kWh</p>
              <p className="text-sm font-bold mt-2"><span className="text-muted-foreground font-normal">Montant total remboursable :</span> {totalCout.toFixed(2)} €</p>
            </div>
          </div>
        </div>

        {/* Sessions Card */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-card-foreground">Sessions de recharge</h3>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:border-primary"
                >
                  <option value="all">Toutes les périodes</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
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
                  {filteredSessions.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Aucune session enregistrée</td></tr>
                  ) : filteredSessions.map(s => (
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
                  
                  {/* Totals row */}
                  {filteredSessions.length > 0 && (
                    <tr className="bg-muted/10 font-bold border-t-2 border-border">
                      <td colSpan={2} className="px-6 py-4 text-right">Total :</td>
                      <td className="px-6 py-4 text-right">{totalKwh.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-primary">{totalCout.toFixed(2)} €</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
