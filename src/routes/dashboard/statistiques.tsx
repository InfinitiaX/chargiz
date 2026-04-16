import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import KpiCard from "@/components/KpiCard";
import { Users, Car, Home, MapPin, Zap, Euro, Calendar } from "lucide-react";

export const Route = createFileRoute("/dashboard/statistiques")({
  component: StatistiquesPage,
  head: () => ({ meta: [{ title: "ChargiZ — Statistiques" }] }),
});

function StatistiquesPage() {
  const { profile } = useAuth();
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

  useEffect(() => {
    if (!entrepriseId) return;
    loadStats();
  }, [entrepriseId, dateFrom, dateTo]);

  async function loadStats() {
    const [collabs, vehicules, sessions] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact" }).eq("entreprise_id", entrepriseId).eq("is_active", true),
      supabase.from("vehicules").select("id", { count: "exact" }).eq("entreprise_id", entrepriseId),
      supabase.from("sessions_recharge").select("energie_kwh, is_domicile, cout_euro").eq("entreprise_id", entrepriseId)
        .gte("date_debut", dateFrom).lte("date_debut", dateTo + "T23:59:59"),
    ]);

    const sess = sessions.data || [];
    setStats({
      nbConducteurs: collabs.count || 0,
      nbVehicules: vehicules.count || 0,
      sessionsDom: sess.filter(s => s.is_domicile).length,
      sessionsHors: sess.filter(s => !s.is_domicile).length,
      energieDom: sess.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0),
      energieHors: sess.filter(s => !s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0),
      coutTotal: sess.filter(s => s.is_domicile).reduce((a, s) => a + (s.cout_euro || 0), 0),
    });
  }

  const energieTotal = stats.energieDom + stats.energieHors;
  const pctDom = energieTotal > 0 ? (stats.energieDom / energieTotal * 100) : 0;
  const pctHors = energieTotal > 0 ? (stats.energieHors / energieTotal * 100) : 0;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Statistiques</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vue globale de l'activité de recharge de l'entreprise</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-transparent text-xs outline-none" />
          <span className="text-xs text-muted-foreground">→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-transparent text-xs outline-none" />
        </div>
      </div>

      {/* 7 KPIs as spec */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Nombre conducteurs" value={String(stats.nbConducteurs)} icon={Users} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
        <KpiCard title="Nombre véhicules" value={String(stats.nbVehicules)} icon={Car} colorClass="bg-kpi-energy/10 text-kpi-energy" />
        <KpiCard title="Sessions domicile (mois)" value={String(stats.sessionsDom)} icon={Home} colorClass="bg-kpi-home/10 text-kpi-home" />
        <KpiCard title="Sessions hors domicile (mois)" value={String(stats.sessionsHors)} icon={MapPin} colorClass="bg-kpi-away/10 text-kpi-away" />
      </div>
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <KpiCard title="Énergie domicile" value={`${stats.energieDom.toFixed(1)} kWh`} icon={Zap} colorClass="bg-kpi-home/10 text-kpi-home" />
        <KpiCard title="Énergie hors domicile" value={`${stats.energieHors.toFixed(1)} kWh`} icon={Zap} colorClass="bg-kpi-away/10 text-kpi-away" />
        <KpiCard title="Coût total remboursable" value={`${stats.coutTotal.toFixed(2)} €`} icon={Euro} colorClass="bg-chargiz-lime/20 text-chargiz-lime-dark" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Énergie breakdown */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">Répartition énergie</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Domicile</span>
                <span className="text-sm font-semibold text-card-foreground">{pctDom.toFixed(1)}% — {stats.energieDom.toFixed(0)} kWh</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted">
                <div className="h-3 rounded-full bg-chargiz-teal transition-all" style={{ width: `${pctDom}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Hors domicile</span>
                <span className="text-sm font-semibold text-card-foreground">{pctHors.toFixed(1)}% — {stats.energieHors.toFixed(0)} kWh</span>
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
