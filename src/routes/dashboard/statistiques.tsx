import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import KpiCard from "@/components/KpiCard";
import PageSkeleton from "@/components/PageSkeleton";
import DateRangeFilter, { isDateRangeValid } from "@/components/DateRangeFilter";
import { exportXLSX } from "@/lib/export";
import { Users, Car, Home, MapPin, Zap, Euro, Leaf, Download, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";

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

  const [monthlySummary, setMonthlySummary] = useState<
    { label: string; sessions: number; energie: number; energieDom: number; energieHors: number; cout: number }[]
  >([]);

  // Données brutes conservées pour l'export §3.1.2 (agrégation par collaborateur).
  const [rawData, setRawData] = useState<{ collabs: any[]; vehicules: any[]; sessions: any[] }>({
    collabs: [], vehicules: [], sessions: [],
  });
  const [exporting, setExporting] = useState(false);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSuperadmin && !entrepriseId) { setLoading(false); return; }
    if (!isDateRangeValid(dateFrom, dateTo)) { setLoading(false); return; }
    loadStats();
  }, [entrepriseId, dateFrom, dateTo, isSuperadmin]);

  async function loadStats() {
    setLoading(true);
    try {
      const filter       = isSuperadmin ? {} : { entreprise_id: entrepriseId };
      const collabFilter = isSuperadmin ? { active_only: "true" } : { entreprise_id: entrepriseId, active_only: "true" };

      const [collabs, vehicules, sessions] = await Promise.all([
        api.collaborateurs.list(collabFilter),
        api.vehicules.list(filter),
        api.sessions.list(filter),
      ]);

      const filteredSessions = sessions.filter((s: any) => {
        const d = s.date_session || s.date_debut;
        if (!d) return false;
        return d >= dateFrom && d <= (dateTo + "T23:59:59");
      });

      // Conserve les données filtrées pour l'export (agrégation par collaborateur).
      setRawData({ collabs, vehicules, sessions: filteredSessions });

      // ── Résumé mensuel (avec split domicile / hors domicile) ──────────────
      const monthlyMap = new Map<string, { sessions: number; energie: number; energieDom: number; energieHors: number; cout: number }>();
      for (const s of filteredSessions) {
        const d = (s.date_session || s.date_debut) as string;
        if (!d) continue;
        const month = d.slice(0, 7); // "YYYY-MM"
        const cur = monthlyMap.get(month) || { sessions: 0, energie: 0, energieDom: 0, energieHors: 0, cout: 0 };
        cur.sessions += 1;
        cur.energie  += s.energie_kwh || 0;
        if (s.is_domicile) cur.energieDom += s.energie_kwh || 0;
        else cur.energieHors += s.energie_kwh || 0;
        cur.cout += s.cout_euro || 0;
        monthlyMap.set(month, cur);
      }
      setMonthlySummary(
        Array.from(monthlyMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, data]) => ({
            label: new Date(month + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
            ...data,
          }))
      );

      setStats({
        nbConducteurs: collabs.length,
        nbVehicules:   vehicules.length,
        sessionsDom:   filteredSessions.filter((s: any) =>  s.is_domicile).length,
        sessionsHors:  filteredSessions.filter((s: any) => !s.is_domicile).length,
        energieDom:    filteredSessions.filter((s: any) =>  s.is_domicile).reduce((a: number, s: any) => a + (s.energie_kwh || 0), 0),
        energieHors:   filteredSessions.filter((s: any) => !s.is_domicile).reduce((a: number, s: any) => a + (s.energie_kwh || 0), 0),
        coutTotal:     filteredSessions.reduce((a: number, s: any) => a + (s.cout_euro || 0), 0),
      });
    } catch (err) {
      console.error("Error loading stats:", err);
    } finally {
      setLoading(false);
    }
  }

  // ── Export §3.1.2 — données agrégées par collaborateur ───────────────────
  // Colonnes CDC : énergie domicile, énergie hors domicile, dernier kilométrage,
  // état du parc (statut véhicule). On ajoute identité + immat pour la lisibilité.
  async function handleExportDonnees() {
    setExporting(true);
    try {
      const { collabs, vehicules, sessions } = rawData;
      // Index véhicule par collaborateur (1 véhicule courant par collab)
      const vehByCollab = new Map<string, any>();
      for (const v of vehicules) if (v.collaborateur_id) vehByCollab.set(v.collaborateur_id, v);

      // Agrège énergie dom / hors-dom + dernier odomètre par collaborateur
      const agg = new Map<string, { dom: number; hors: number; km: number | null }>();
      for (const s of sessions) {
        const cur = agg.get(s.collaborateur_id) || { dom: 0, hors: 0, km: null };
        if (s.is_domicile) cur.dom += s.energie_kwh || 0;
        else cur.hors += s.energie_kwh || 0;
        if (s.kilometrage != null) cur.km = Math.max(cur.km ?? 0, s.kilometrage);
        agg.set(s.collaborateur_id, cur);
      }

      const statutLabel = (v: any) => {
        if (!v) return "Aucun véhicule";
        if (v.statut_affectation === "archive" || v.is_active === false) return "Archivé";
        if (v.statut_smartcar === "suspendu") return "Suspendu";
        if (v.statut_smartcar === "connecte") return "Connecté";
        return v.statut_affectation === "affecte" ? "Affecté" : "Non affecté";
      };

      const rows = collabs.map((c: any) => {
        const v = vehByCollab.get(c.id);
        const a = agg.get(c.id) || { dom: 0, hors: 0, km: null };
        return {
          "Collaborateur": `${c.prenom} ${c.nom}`,
          "Email": c.email || "",
          "Véhicule": v ? `${v.marque || ""} ${v.modele || ""}`.trim() : "—",
          "Immatriculation": v?.immatriculation || "—",
          "Énergie domicile (kWh)": Number(a.dom.toFixed(2)),
          "Énergie hors domicile (kWh)": Number(a.hors.toFixed(2)),
          "Dernier kilométrage (km)": a.km != null ? Math.round(a.km) : "—",
          "État du parc": statutLabel(v),
        };
      });

      if (rows.length === 0) {
        const { toast } = await import("sonner");
        toast.warning("Aucune donnée à exporter sur la période.");
        return;
      }
      await exportXLSX(`ChargiZ_Export_${dateFrom}_${dateTo}`, rows, "Données");
    } finally {
      setExporting(false);
    }
  }

  const energieTotal       = stats.energieDom + stats.energieHors;
  const pctDom             = energieTotal > 0 ? (stats.energieDom  / energieTotal * 100) : 0;
  const pctHors            = energieTotal > 0 ? (stats.energieHors / energieTotal * 100) : 0;
  const nbMois             = monthlySummary.length || 1;
  const consoParVehicule   = stats.nbVehicules   > 0 ? energieTotal / stats.nbVehicules   / nbMois : 0;
  const consoParConducteur = stats.nbConducteurs > 0 ? energieTotal / stats.nbConducteurs / nbMois : 0;
  const co2EviteTotal      = energieTotal * 0.26; // ~0.26 kg CO₂ économisé par kWh vs thermique

  if (loading) {
    return <PageSkeleton kpiCount={7} rowCount={0} showFilters={false} />;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">

      {/* ─── En-tête ─── */}
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Statistiques</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vue d'ensemble des données de l'entreprise</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
          <button
            onClick={handleExportDonnees}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> {exporting ? "Export…" : "Export données"}
          </button>
        </div>
      </div>

      {/* ─── Ligne 1 : 4 KPI cards ─── */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Nombre conducteurs"          value={String(stats.nbConducteurs)} icon={Users} iconClass="bg-blue-100 text-blue-600" />
        <KpiCard title="Nombre véhicules"            value={String(stats.nbVehicules)}   icon={Car}   iconClass="bg-violet-100 text-violet-600" />
        <KpiCard title="Sessions domicile mois"      value={String(stats.sessionsDom)}   icon={Home}  iconClass="bg-emerald-100 text-emerald-600" />
        <KpiCard title="Sessions hors domicile mois" value={String(stats.sessionsHors)}  icon={MapPin} iconClass="bg-orange-100 text-orange-600" />
      </div>

      {/* ─── Ligne 2 : 3 KPI cards (mêmes dimensions que ligne 1 — 4e case laissée vide) ─── */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Énergie domicile"        value={`${stats.energieDom.toFixed(2)} kWh`}  icon={Zap}  iconClass="bg-teal-100 text-teal-600" />
        <KpiCard title="Énergie hors domicile"   value={`${stats.energieHors.toFixed(2)} kWh`} icon={Zap}  iconClass="bg-cyan-100 text-cyan-600" />
        <KpiCard title="Coût total remboursable" value={`${stats.coutTotal.toFixed(2)} €`}      icon={Euro} iconClass="bg-amber-100 text-amber-600" />
        {/* 4e cellule laissée vide volontairement pour préserver la largeur des cartes */}
        <div aria-hidden="true" className="hidden lg:block" />
      </div>

      {/* ─── Graphique d'évolution mensuelle (énergie dom/hors + coût) ─── */}
      <div className="mb-8 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Évolution mensuelle</h3>
        </div>
        <div className="p-4 sm:p-6">
          {monthlySummary.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucune donnée sur la période sélectionnée
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={monthlySummary} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="kwh"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v: number) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}`}
                />
                <YAxis
                  yAxisId="eur"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v: number) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "Coût (€)") return [`${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, name];
                    return [`${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kWh`, name];
                  }}
                  contentStyle={{ borderRadius: 12, border: "1px solid #E2E8E0", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar yAxisId="kwh" dataKey="energieDom"  name="Énergie domicile (kWh)"      stackId="e" fill="#225560" radius={[0, 0, 0, 0]} />
                <Bar yAxisId="kwh" dataKey="energieHors" name="Énergie hors domicile (kWh)" stackId="e" fill="#B8CC3A" radius={[4, 4, 0, 0]} />
                <Line yAxisId="eur" type="monotone" dataKey="cout" name="Coût (€)" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ─── Résumé mensuel (pleine largeur) ─── */}
      <div className="mb-8 rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-card-foreground">Résumé mensuel</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="cz-table-head">
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left  font-medium text-muted-foreground">Mois</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Sessions</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Énergie (kWh)</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Coût (€)</th>
              </tr>
            </thead>
            <tbody>
              {monthlySummary.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                    Aucune donnée sur la période sélectionnée
                  </td>
                </tr>
              ) : monthlySummary.map((m, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium text-card-foreground capitalize">{m.label}</td>
                  <td className="px-6 py-4 text-right text-card-foreground">{m.sessions.toLocaleString("fr-FR")}</td>
                  <td className="px-6 py-4 text-right text-card-foreground">{m.energie.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}</td>
                  <td className="px-6 py-4 text-right text-card-foreground">{m.cout.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Ligne basse : Répartition | Consommation moyenne ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Répartition par type de recharge */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-5 text-base font-semibold text-card-foreground">Répartition par type de recharge</h3>
          <div className="space-y-5">
            {/* Domicile */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Recharge domicile</span>
                <span className="text-sm font-semibold text-card-foreground">{pctDom.toFixed(1)}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted">
                <div
                  className="h-2.5 rounded-full bg-chargiz-teal transition-all duration-500"
                  style={{ width: `${pctDom}%` }}
                />
              </div>
            </div>
            {/* Hors domicile */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Recharge hors domicile</span>
                <span className="text-sm font-semibold text-card-foreground">{pctHors.toFixed(1)}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted">
                <div
                  className="h-2.5 rounded-full bg-chargiz-lime transition-all duration-500"
                  style={{ width: `${pctHors}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Consommation moyenne */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-5 text-base font-semibold text-card-foreground">Consommation moyenne</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Par véhicule</span>
              <span className="text-sm font-semibold text-card-foreground">
                {consoParVehicule.toFixed(1)} kWh/mois
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Par conducteur</span>
              <span className="text-sm font-semibold text-card-foreground">
                {consoParConducteur.toFixed(1)} kWh/mois
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Leaf className="h-4 w-4 text-chargiz-teal" />
                <span className="text-sm text-muted-foreground">CO₂ évité total</span>
              </div>
              <span className="text-sm font-semibold text-chargiz-teal">
                {co2EviteTotal.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} kg
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
