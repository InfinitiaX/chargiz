import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import KpiCard from "@/components/KpiCard";
import PageSkeleton from "@/components/PageSkeleton";
import DateRangeFilter, { isDateRangeValid } from "@/components/DateRangeFilter";
import { Users, Car, Home, MapPin, Zap, Euro, Calendar } from "lucide-react";

export const Route = createFileRoute("/dashboard/statistiques")({
  component: StatistiquesPage,
  head: () => ({ meta: [{ title: "ChargiZ — Statistiques" }] }),
});

function StatistiquesPage() {
  const { profile, role } = useAuth();
  const isSuperadmin = role === "superadmin";
  const entrepriseId = profile?.entreprise_id || "";
  const [stats, setStats] = useState({
    nbConducteurs: 0,
    nbVehicules: 0,
    sessionsDom: 0,
    sessionsHors: 0,
    energieDom: 0,
    energieHors: 0,
    coutTotal: 0,
  });
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Superadmin: load platform-wide; otherwise scope to entreprise
    if (!isSuperadmin && !entrepriseId) {
      setLoading(false);
      return;
    }
    // Évite les requêtes inutiles si la plage est invalide
    if (!isDateRangeValid(dateFrom, dateTo)) {
      setLoading(false);
      return;
    }
    loadStats();
  }, [entrepriseId, dateFrom, dateTo, isSuperadmin]);

  async function loadStats() {
    setLoading(true);
    try {
      // For superadmin, no entreprise_id filter — backend returns all data.
      // For other roles, the backend auto-scopes by user role (entreprise/filiale/site).
      const filter = isSuperadmin ? {} : { entreprise_id: entrepriseId };
      const collabFilter = isSuperadmin ? { active_only: "true" } : { entreprise_id: entrepriseId, active_only: "true" };

      const [collabs, vehicules, sessions] = await Promise.all([
        api.collaborateurs.list(collabFilter),
        api.vehicules.list(filter),
        api.sessions.list(filter),
      ]);

      const filteredSessions = sessions.filter(s => {
        const d = s.date_session || s.date_debut;
        if (!d) return false;
        return d >= dateFrom && d <= (dateTo + "T23:59:59");
      });

      setStats({
        nbConducteurs: collabs.length,
        nbVehicules: vehicules.length,
        sessionsDom: filteredSessions.filter(s => s.is_domicile).length,
        sessionsHors: filteredSessions.filter(s => !s.is_domicile).length,
        energieDom: filteredSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0),
        energieHors: filteredSessions.filter(s => !s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0),
        coutTotal: filteredSessions.reduce((a, s) => a + (s.cout_euro || 0), 0),
      });
    } catch (err) {
      console.error("Error loading stats:", err);
    } finally {
      setLoading(false);
    }
  }

  const energieTotal = stats.energieDom + stats.energieHors;
  const pctDom = energieTotal > 0 ? (stats.energieDom / energieTotal * 100) : 0;
  const pctHors = energieTotal > 0 ? (stats.energieHors / energieTotal * 100) : 0;

  if (loading) {
    return <PageSkeleton kpiCount={7} rowCount={0} showFilters={false} />;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Statistiques</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSuperadmin
              ? "Vue globale plateforme — toutes entreprises confondues"
              : "Vue globale de l'activité de recharge de l'entreprise"}
          </p>
        </div>
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onFromChange={setDateFrom}
          onToChange={setDateTo}
        />
      </div>

      {/* 7 KPIs as spec */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Nombre conducteurs" value={String(stats.nbConducteurs)} icon={Users} tone="neutral" />
        <KpiCard title="Nombre véhicules" value={String(stats.nbVehicules)} icon={Car} tone="neutral" />
        <KpiCard title="Sessions domicile (mois)" value={String(stats.sessionsDom)} icon={Home} tone="accent" />
        <KpiCard title="Sessions hors domicile (mois)" value={String(stats.sessionsHors)} icon={MapPin} tone="primary" />
      </div>
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* BugID_021 — format décimal 2 chiffres */}
        <KpiCard title="Énergie domicile" value={`${stats.energieDom.toFixed(2)} kWh`} icon={Zap} tone="accent" />
        <KpiCard title="Énergie hors domicile" value={`${stats.energieHors.toFixed(2)} kWh`} icon={Zap} tone="primary" />
        <KpiCard title="Coût total remboursable" value={`${stats.coutTotal.toFixed(2)} €`} icon={Euro} tone="accent" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Énergie breakdown */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">Répartition énergie</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Domicile</span>
                <span className="text-sm font-semibold text-card-foreground">{pctDom.toFixed(1)}% — {stats.energieDom.toFixed(2)} kWh</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted">
                <div className="h-3 rounded-full bg-chargiz-teal transition-all" style={{ width: `${pctDom}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Hors domicile</span>
                <span className="text-sm font-semibold text-card-foreground">{pctHors.toFixed(1)}% — {stats.energieHors.toFixed(2)} kWh</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted">
                <div className="h-3 rounded-full bg-chargiz-lime transition-all" style={{ width: `${pctHors}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Sessions summary */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">Sessions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/50 p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{stats.sessionsDom + stats.sessionsHors}</p>
              <p className="text-sm text-muted-foreground mt-1">Total sessions</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-6 text-center">
              <p className="text-3xl font-bold text-chargiz-teal">{stats.sessionsDom}</p>
              <p className="text-sm text-muted-foreground mt-1">Domicile</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-6 text-center">
              <p className="text-3xl font-bold text-chargiz-lime-dark">{stats.sessionsHors}</p>
              <p className="text-sm text-muted-foreground mt-1">Hors domicile</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{stats.coutTotal.toFixed(0)} €</p>
              <p className="text-sm text-muted-foreground mt-1">Remboursable</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
