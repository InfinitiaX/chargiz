import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api, onDataChanged } from "@/lib/api";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import KpiCard from "@/components/KpiCard";
import CreateCollaborateurDialog from "@/components/CreateCollaborateurDialog";
import { Link } from "@tanstack/react-router";
import { Zap, Battery, Home, MapPin, Calendar, Plus, Download, Search, Users, Car, Building2, Euro, AlertTriangle, TrendingUp, Leaf, Eye } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
  head: () => ({
    meta: [
      { title: "ChargiZ — Tableau de bord" },
      { name: "description", content: "Tableau de bord ChargiZ adapté à votre rôle." },
    ],
  }),
});

function DashboardHome() {
  const { role, profile } = useAuth();

  if (!role || !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Chargement du tableau de bord...</div>
      </div>
    );
  }

  switch (role) {
    case "superadmin": return <SuperAdminDashboard />;
    case "gestionnaire_entreprise": return <GestEntrepriseDashboard />;
    // [Lot 2] dedicated scoped dashboards for filiale/site managers.
    // For Lot 1, fall back to the entreprise dashboard so existing test accounts keep working.
    case "gestionnaire_filiale":
    case "gestionnaire_site":
      return <GestEntrepriseDashboard />;
    // case "gestionnaire_filiale": return <ScopedManagerDashboard scope="filiale" />;
    // case "gestionnaire_site": return <ScopedManagerDashboard scope="site" />;
    case "collaborateur": return <ConducteurDashboard />;
    default: return <div className="p-8 text-muted-foreground">Rôle non reconnu.</div>;
  }
}

/* ═══════════════════════════════════════════
   Gestionnaire Filiale / Site — Dashboard scopé
   ═══════════════════════════════════════════ */
function ScopedManagerDashboard({ scope }: { scope: "filiale" | "site" }) {
  const { profile } = useAuth();
  const filialeId = profile?.filiale_id || "";
  const siteId = profile?.site_id || "";
  const scopeId = scope === "filiale" ? filialeId : siteId;

  const [scopeName, setScopeName] = useState<string>("");
  const [collabs, setCollabs] = useState<any[]>([]);
  const [vehicules, setVehicules] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddCollab, setShowAddCollab] = useState(false);

  useEffect(() => {
    if (!scopeId) { setLoading(false); return; }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeId, scope]);

  async function loadData() {
    setLoading(true);
    try {
      const filterKey = scope === "filiale" ? "filiale_id" : "site_id";
      const filter = { [filterKey]: scopeId } as Record<string, string>;

      const [collData, vehData, sessData] = await Promise.all([
        api.collaborateurs.list(filter),
        api.vehicules.list(filter),
        api.sessions.list(filter).catch(() => [] as any[]),
      ]);

      setCollabs(collData);
      setVehicules(vehData);
      setSessions(sessData);

      if (scope === "filiale") {
        const [filiale, sitesData] = await Promise.all([
          api.filiales.get(scopeId).catch(() => null),
          api.sites.list({ filiale_id: scopeId }).catch(() => [] as any[]),
        ]);
        setScopeName(filiale?.nom || "Ma filiale");
        setSites(sitesData);
      } else {
        const site = await api.sites.get(scopeId).catch(() => null);
        setScopeName(site?.nom || "Mon site");
      }
    } catch (err) {
      console.error("Error loading scoped dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!scopeId) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">
          Aucune {scope === "filiale" ? "filiale" : "site"} associée à votre compte.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // KPI calc
  const energieTotale = sessions.reduce((a, s) => a + (s.energie_kwh || 0), 0);
  const energieDomicile = sessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
  const coutTotal = sessions.reduce((a, s) => a + (s.cout_euro || 0), 0);
  const coutRemboursable = sessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.cout_euro || 0), 0);
  const nbSessionsDomicile = sessions.filter(s => s.is_domicile).length;

  const filtered = collabs.filter(c =>
    !search || `${c.nom} ${c.prenom} ${c.email || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const tableData = filtered.map(c => {
    const v = vehicules.find(v => v.collaborateur_id === c.id);
    const cSessions = sessions.filter(s => s.collaborateur_id === c.id);
    const rechDomKwh = cSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
    const rechDomEuro = cSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.cout_euro || 0), 0);
    const rechHorsDom = cSessions.filter(s => !s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
    // [Smartcar TODO] km / conso / CO2 require real odometer data from Smartcar.
    // Until the premium API is wired, these stay null and render as "—".
    const km: number | null = null;
    const conso: number | null = null;
    const co2: number | null = null;
    return {
      id: c.id, prenom: c.prenom, nom: c.nom,
      immatriculation: v?.immatriculation || "—",
      rechDomKwh, rechDomEuro, rechHorsDom, km, conso, co2,
    };
  });

  const scopeLabel = scope === "filiale" ? "Filiale" : "Site";

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {scopeLabel} — {scopeName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilotage de la flotte et des consommations de votre {scope === "filiale" ? "filiale" : "site"}
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Collaborateurs" value={String(collabs.length)} icon={Users} colorClass="bg-kpi-home/10 text-kpi-home" />
        <KpiCard title="Véhicules" value={String(vehicules.length)} icon={Car} colorClass="bg-kpi-energy/10 text-kpi-energy" />
        <KpiCard title="Recharges (période)" value={String(sessions.length)} icon={Zap} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
        <KpiCard title="Énergie totale" value={`${energieTotale.toFixed(0)} kWh`} icon={Battery} colorClass="bg-chargiz-lime/20 text-chargiz-lime-dark" />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Recharges domicile" value={String(nbSessionsDomicile)} icon={Home} colorClass="bg-kpi-home/10 text-kpi-home" />
        <KpiCard title="Énergie domicile" value={`${energieDomicile.toFixed(0)} kWh`} icon={Leaf} colorClass="bg-chargiz-lime/20 text-chargiz-lime-dark" />
        <KpiCard title="Coût total" value={`${coutTotal.toFixed(2)} €`} icon={Euro} colorClass="bg-kpi-away/10 text-kpi-away" />
        <KpiCard title="À rembourser" value={`${coutRemboursable.toFixed(2)} €`} icon={Euro} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
      </div>

      {scope === "filiale" && (
        <div className="mb-8 rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-card-foreground">Sites de la filiale</h3>
            <Link to="/dashboard/listes/sites" className="text-xs text-primary hover:underline font-medium">Tout voir</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Nom</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Ville</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Responsable</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">État</th>
              </tr></thead>
              <tbody>
                {sites.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    <MapPin className="h-6 w-6 mx-auto mb-2 opacity-30" />Aucun site
                  </td></tr>
                ) : sites.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 font-medium text-card-foreground">{s.nom}</td>
                    <td className="px-6 py-3 text-card-foreground">{s.ville || "—"}</td>
                    <td className="px-6 py-3 text-card-foreground">
                      {s.responsable_prenom || s.responsable_nom
                        ? `${s.responsable_prenom || ""} ${s.responsable_nom || ""}`.trim()
                        : "—"}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.is_active ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-destructive/10 text-destructive"}`}>
                        {s.is_active ? "Actif" : "Archivé"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button onClick={() => setShowAddCollab(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-95">
          <Plus className="h-4 w-4" /> Ajouter collaborateur
        </button>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher un collaborateur..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-card-foreground">Suivi des collaborateurs</h3>
          <Link to="/dashboard/listes/collaborateurs" className="text-xs text-primary hover:underline font-medium">Gestion complète</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50 whitespace-nowrap">
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Prénom</th>
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Nom</th>
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Immatriculation</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Rech. Dom (kWh)</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Rech. Dom (€)</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Rech. Hors (kWh)</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Km</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Conso (kWh/100)</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">CO₂ évité (kg)</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Action</th>
            </tr></thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr><td colSpan={10} className="px-6 py-8 text-center text-muted-foreground">Aucun collaborateur</td></tr>
              ) : tableData.slice(0, 15).map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 whitespace-nowrap">
                  <td className="px-6 py-3 font-medium text-card-foreground">{c.prenom}</td>
                  <td className="px-6 py-3 font-medium text-card-foreground">{c.nom}</td>
                  <td className="px-6 py-3 font-mono text-card-foreground">{c.immatriculation}</td>
                  <td className="px-6 py-3 text-right text-card-foreground">{c.rechDomKwh.toFixed(1)}</td>
                  <td className="px-6 py-3 text-right text-card-foreground">{c.rechDomEuro.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right text-card-foreground">{c.rechHorsDom.toFixed(1)}</td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{c.km != null ? c.km.toFixed(0) : "—"}</td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{c.conso != null ? c.conso.toFixed(1) : "—"}</td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{c.co2 != null ? c.co2.toFixed(1) : "—"}</td>
                  <td className="px-6 py-3 text-right">
                    <Link to="/dashboard/collaborateur/$id" params={{ id: c.id }} className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                      <Eye className="h-3 w-3" /> Fiche
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {profile?.entreprise_id && (
        <CreateCollaborateurDialog
          entrepriseId={profile.entreprise_id}
          open={showAddCollab}
          onClose={() => setShowAddCollab(false)}
          onCreated={loadData}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   1. SUPERADMIN — Vue plateforme globale
   ═══════════════════════════════════════════ */
function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    entreprises: 0,
    filiales: 0,
    sites: 0,
    conducteurs: 0,
    vehicules: 0,
    nbSessions: 0,
    nbSessionsDomicile: 0,
    energieTotal: 0,
    energieDomicile: 0,
    coutTotal: 0,
    coutRemboursable: 0,
  });
  const [entreprises, setEntreprises] = useState<{ id: string; nom: string; ville: string | null; created_at: string }[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [topEntreprises, setTopEntreprises] = useState<{ id: string; nom: string; nbSessions: number; energieTotal: number; coutTotal: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => { loadData(); }, [dateFrom, dateTo]);
  useEffect(() => {
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);
    const unsub = onDataChanged(() => loadData());
    return () => {
      window.removeEventListener("focus", onFocus);
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  async function loadData() {
    setLoading(true);
    try {
      const [entData, filData, siteData, collData, vehData, sessData] = await Promise.all([
        api.entreprises.list(),
        api.filiales.list(),
        api.sites.list(),
        api.collaborateurs.list(),
        api.vehicules.list(),
        api.sessions.list(),
      ]);

      setEntreprises(entData);

      // Filter sessions by date range (client-side — the backend doesn't support
      // date filtering on /api/sessions yet; switch to server-side once it does)
      const fromTs = dateFrom + "T00:00:00";
      const toTs = dateTo + "T23:59:59";
      const filteredSessions = sessData.filter((s: any) => {
        const d = s.date_session || s.date_debut;
        return d && d >= fromTs && d <= toTs;
      });

      // Recent sessions: take last 5 across the whole platform (no date filter)
      const sortedRecent = [...sessData]
        .sort((a, b) => (b.date_session || "").localeCompare(a.date_session || ""))
        .slice(0, 5);
      setRecentSessions(sortedRecent);

      // Top entreprises by session activity within the date range
      const perEntreprise = new Map<string, { nbSessions: number; energieTotal: number; coutTotal: number }>();
      for (const s of filteredSessions) {
        const cur = perEntreprise.get(s.entreprise_id) || { nbSessions: 0, energieTotal: 0, coutTotal: 0 };
        cur.nbSessions += 1;
        cur.energieTotal += (s.energie_kwh || 0);
        cur.coutTotal += (s.cout_euro || 0);
        perEntreprise.set(s.entreprise_id, cur);
      }
      const top = entData
        .map((e: any) => ({ id: e.id, nom: e.nom, ...(perEntreprise.get(e.id) || { nbSessions: 0, energieTotal: 0, coutTotal: 0 }) }))
        .sort((a, b) => b.nbSessions - a.nbSessions)
        .slice(0, 5);
      setTopEntreprises(top);

      const energieTotal = filteredSessions.reduce((acc: number, s: any) => acc + (s.energie_kwh || 0), 0);
      const energieDomicile = filteredSessions.filter((s: any) => s.is_domicile).reduce((acc: number, s: any) => acc + (s.energie_kwh || 0), 0);
      const coutTotal = filteredSessions.reduce((acc: number, s: any) => acc + (s.cout_euro || 0), 0);
      const coutRemboursable = filteredSessions.filter((s: any) => s.is_domicile).reduce((acc: number, s: any) => acc + (s.cout_euro || 0), 0);

      setStats({
        entreprises: entData.length,
        filiales: filData.length,
        sites: siteData.length,
        conducteurs: collData.length,
        vehicules: vehData.length,
        nbSessions: filteredSessions.length,
        nbSessionsDomicile: filteredSessions.filter((s: any) => s.is_domicile).length,
        energieTotal,
        energieDomicile,
        coutTotal,
        coutRemboursable,
      });
    } catch (err) {
      console.error("Error loading superadmin stats:", err);
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

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Plateforme ChargiZ</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vue globale multi-entreprises — SuperAdmin</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-transparent text-xs outline-none" />
          <span className="text-xs text-muted-foreground">→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-transparent text-xs outline-none" />
        </div>
      </div>

      {/* Plateforme — comptes globaux (indépendants de la période) */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Organisation</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard title="Entreprises" value={String(stats.entreprises)} icon={Building2} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
        <KpiCard title="Filiales" value={String(stats.filiales)} icon={Building2} colorClass="bg-kpi-energy/10 text-kpi-energy" />
        <KpiCard title="Sites" value={String(stats.sites)} icon={MapPin} colorClass="bg-kpi-away/10 text-kpi-away" />
        <KpiCard title="Conducteurs" value={String(stats.conducteurs)} icon={Users} colorClass="bg-kpi-home/10 text-kpi-home" />
        <KpiCard title="Véhicules" value={String(stats.vehicules)} icon={Car} colorClass="bg-chargiz-lime/20 text-chargiz-lime-dark" />
      </div>

      {/* Activité de recharge — sur la période sélectionnée */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Activité de recharge (période)</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard title="Sessions" value={String(stats.nbSessions)} icon={Zap} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
        <KpiCard title="Sessions domicile" value={String(stats.nbSessionsDomicile)} icon={Home} colorClass="bg-kpi-home/10 text-kpi-home" />
        <KpiCard title="Énergie totale" value={`${stats.energieTotal.toFixed(0)} kWh`} icon={Battery} colorClass="bg-kpi-energy/10 text-kpi-energy" />
        <KpiCard title="Énergie domicile" value={`${stats.energieDomicile.toFixed(0)} kWh`} icon={Leaf} colorClass="bg-chargiz-lime/20 text-chargiz-lime-dark" />
        <KpiCard title="Coût total" value={`${stats.coutTotal.toFixed(2)} €`} icon={Euro} colorClass="bg-kpi-away/10 text-kpi-away" />
        <KpiCard title="À rembourser" value={`${stats.coutRemboursable.toFixed(2)} €`} icon={Euro} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-card-foreground">Top entreprises (par activité)</h3>
            <Link to="/dashboard/listes/entreprises" className="text-xs text-primary hover:underline font-medium">Tout voir</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Entreprise</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Sessions</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">kWh</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Coût</th>
              </tr></thead>
              <tbody>
                {topEntreprises.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Aucune activité sur la période</td></tr>
                ) : topEntreprises.map(e => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 font-medium text-card-foreground">{e.nom}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{e.nbSessions}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{e.energieTotal.toFixed(1)}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{e.coutTotal.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-card-foreground">Sessions récentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">kWh</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Coût</th>
                <th className="px-6 py-3 text-center font-medium text-muted-foreground">Type</th>
              </tr></thead>
              <tbody>
                {recentSessions.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Aucune session</td></tr>
                ) : recentSessions.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 text-card-foreground">{s.date_session ? new Date(s.date_session).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{(s.energie_kwh || 0).toFixed(1)}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{(s.cout_euro || 0).toFixed(2)} €</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.is_domicile ? "bg-kpi-home/10 text-kpi-home" : "bg-kpi-away/10 text-kpi-away"}`}>
                        {s.is_domicile ? "Domicile" : "Hors dom."}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-card-foreground">Toutes les entreprises</h3>
          <Link to="/dashboard/listes/entreprises" className="text-xs text-primary hover:underline font-medium">Gestion complète</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Nom</th>
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Ville</th>
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Créée le</th>
            </tr></thead>
            <tbody>
              {entreprises.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">Aucune entreprise</td></tr>
              ) : entreprises.map(e => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-6 py-3 font-medium text-card-foreground">{e.nom}</td>
                  <td className="px-6 py-3 text-card-foreground">{e.ville || "—"}</td>
                  <td className="px-6 py-3 text-card-foreground">{new Date(e.created_at).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   2. GESTIONNAIRE ENTREPRISE — Vue entreprise complète
   ═══════════════════════════════════════════ */
function GestEntrepriseDashboard() {
  const { profile } = useAuth();
  const entrepriseId = profile?.entreprise_id || "";
  const [stats, setStats] = useState({
    collaborateurs: 0, vehicules: 0,
    energieTotal: 0, coutRemboursable: 0,
    nbSessions: 0, nbSessionsDomicile: 0, energieDomicile: 0
  });
  const [collabs, setCollabs] = useState<any[]>([]);
  const [vehicules, setVehicules] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showAddCollab, setShowAddCollab] = useState(false);

  useEffect(() => { if (entrepriseId) loadData(); }, [entrepriseId]);
  useEffect(() => {
    const onFocus = () => { if (entrepriseId) loadData(); };
    window.addEventListener("focus", onFocus);
    const unsub = onDataChanged(() => { if (entrepriseId) loadData(); });
    return () => {
      window.removeEventListener("focus", onFocus);
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrepriseId]);

  async function loadData() {
    try {
      const [collData, vehData, sessData] = await Promise.all([
        api.collaborateurs.list({ entreprise_id: entrepriseId }),
        api.vehicules.list({ entreprise_id: entrepriseId }),
        api.sessions.list({ entreprise_id: entrepriseId }),
      ]);
      
      setCollabs(collData);
      setVehicules(vehData);
      setSessions(sessData);
      
      const statsData = await api.stats.get(entrepriseId).catch(() => null);
      if (statsData) {
        const energieDomicile = sessData.filter(s => s.is_domicile).reduce((acc, s) => acc + (s.energie_kwh || 0), 0);
        setStats({
          collaborateurs: statsData.nb_collaborateurs,
          vehicules: statsData.nb_vehicules,
          energieTotal: statsData.energie_totale_kwh,
          coutRemboursable: statsData.cout_total_euro,
          nbSessions: statsData.nb_sessions,
          nbSessionsDomicile: statsData.sessions_domicile,
          energieDomicile: energieDomicile,
        });
      } else {
        setStats(prev => ({ ...prev, collaborateurs: collData.length, vehicules: vehData.length }));
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
  }

  const filtered = collabs.filter(c => !search || `${c.nom} ${c.prenom}`.toLowerCase().includes(search.toLowerCase()));

  // Compute stats per collaborator
  const tableData = filtered.map(c => {
    const v = vehicules.find(v => v.collaborateur_id === c.id);
    const cSessions = sessions.filter(s => s.collaborateur_id === c.id);
    
    const rechDomKwh = cSessions.filter(s => s.is_domicile).reduce((acc, s) => acc + (s.energie_kwh || 0), 0);
    const rechDomEuro = cSessions.filter(s => s.is_domicile).reduce((acc, s) => acc + (s.cout_euro || 0), 0);
    const rechHorsDom = cSessions.filter(s => !s.is_domicile).reduce((acc, s) => acc + (s.energie_kwh || 0), 0);

    // [Smartcar TODO] km / conso / CO2 require real odometer data — left null
    // until Smartcar premium is wired. UI renders "—" instead of fake numbers.
    const kilom: number | null = null;
    const consoMoyenne: number | null = null;
    const co2: number | null = null;

    return {
      id: c.id,
      prenom: c.prenom,
      nom: c.nom,
      immatriculation: v?.immatriculation || "—",
      rechDomKwh,
      rechDomEuro,
      rechHorsDom,
      kilom,
      consoMoyenne,
      co2
    };
  });

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Tableau de bord</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pilotage de la flotte et des consommations</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Recharges (période)" value={String(stats.nbSessions)} icon={Zap} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
        <KpiCard title="Recharges Domicile" value={String(stats.nbSessionsDomicile)} icon={Home} colorClass="bg-kpi-home/10 text-kpi-home" />
        <KpiCard title="Énergie Totale" value={`${stats.energieTotal.toFixed(0)} kWh`} icon={Battery} colorClass="bg-kpi-energy/10 text-kpi-energy" />
        <KpiCard title="Énergie Domicile" value={`${stats.energieDomicile.toFixed(0)} kWh`} icon={Leaf} colorClass="bg-chargiz-lime/20 text-chargiz-lime-dark" />
      </div>

      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button onClick={() => setShowAddCollab(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-95">
          <Plus className="h-4 w-4" /> Ajouter collaborateur
        </button>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher un membre..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-card-foreground">Suivi des collaborateurs</h3>
          <Link to="/dashboard/listes/collaborateurs" className="text-xs text-primary hover:underline font-medium">Gestion complète</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50 whitespace-nowrap">
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Prénom</th>
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Nom</th>
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Immatriculation</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Rech. Dom (kWh)</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Rech. Dom (€)</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Rech. Hors (kWh)</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Km</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Conso Moy. (kWh/100)</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">CO₂ évité (kg)</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Action</th>
            </tr></thead>
            <tbody>
              {tableData.slice(0, 10).map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 whitespace-nowrap">
                  <td className="px-6 py-3 font-medium text-card-foreground">{c.prenom}</td>
                  <td className="px-6 py-3 font-medium text-card-foreground">{c.nom}</td>
                  <td className="px-6 py-3 font-mono text-card-foreground">{c.immatriculation}</td>
                  <td className="px-6 py-3 text-right text-card-foreground">{c.rechDomKwh.toFixed(1)}</td>
                  <td className="px-6 py-3 text-right text-card-foreground">{c.rechDomEuro.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right text-card-foreground">{c.rechHorsDom.toFixed(1)}</td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{c.kilom != null ? c.kilom.toFixed(0) : "—"}</td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{c.consoMoyenne != null ? c.consoMoyenne.toFixed(1) : "—"}</td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{c.co2 != null ? c.co2.toFixed(1) : "—"}</td>
                  <td className="px-6 py-3 text-right">
                    <Link to="/dashboard/collaborateur/$id" params={{ id: c.id }} className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                      <Eye className="h-3 w-3" /> Fiche
                    </Link>
                  </td>
                </tr>
              ))}
              {tableData.length === 0 && <tr><td colSpan={10} className="px-6 py-8 text-center text-muted-foreground">Aucun collaborateur trouvé</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {entrepriseId && <CreateCollaborateurDialog entrepriseId={entrepriseId} open={showAddCollab} onClose={() => setShowAddCollab(false)} onCreated={loadData} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   3. CONDUCTEUR — Dashboard personnel
   ═══════════════════════════════════════════ */
function ConducteurDashboard() {
  const { profile } = useAuth();
  const [vehicule, setVehicule] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState({ energieTotal: 0, coutTotal: 0, energieDomicile: 0, coutRemboursable: 0, co2Evite: 0, km: 0, nbSessions: 0 });

  useEffect(() => { if (profile) loadData(); }, [profile]);

  async function loadData() {
    if (!profile) return;
    try {
      // Pas besoin de passer collaborateur_id : le backend scope déjà sur le user courant
      const [vehData, sessData] = await Promise.all([
        api.vehicules.list(),
        api.sessions.list(),
      ]);
      
      if (vehData.length > 0) setVehicule(vehData[0]);
      
      setSessions(sessData);
      const km = sessData.reduce((a, s) => a + (s.kilometrage || 0), 0);
      setStats({
        energieTotal: sessData.reduce((a, s) => a + (s.energie_kwh || 0), 0),
        coutTotal: sessData.reduce((a, s) => a + (s.cout_euro || 0), 0),
        energieDomicile: sessData.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0),
        coutRemboursable: sessData.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0),
        co2Evite: km * 0.146,
        km,
        nbSessions: sessData.length,
      });
    } catch (err) {
      console.error("Error loading conductor stats:", err);
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Ma performance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Votre activité de recharge individuelle</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="Sessions" value={String(stats.nbSessions)} icon={Zap} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
        <KpiCard title="Énergie totale" value={`${stats.energieTotal.toFixed(1)} kWh`} icon={Battery} colorClass="bg-kpi-energy/10 text-kpi-energy" />
        <KpiCard title="kWh domicile" value={`${stats.energieDomicile.toFixed(1)} kWh`} icon={Home} colorClass="bg-kpi-home/10 text-kpi-home" />
        <KpiCard title="€ remboursable" value={`${stats.coutRemboursable.toFixed(2)} €`} icon={Euro} colorClass="bg-chargiz-lime/20 text-chargiz-lime-dark" />
        <KpiCard title="CO₂ évité" value={`${stats.co2Evite.toFixed(0)} kg`} icon={Leaf} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
        <KpiCard title="Km parcourus" value={`${stats.km.toFixed(0)} km`} icon={TrendingUp} colorClass="bg-kpi-away/10 text-kpi-away" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Véhicule connecté */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-card-foreground">Mon véhicule</h3>
            {vehicule && <Link to="/dashboard/listes/vehicules/$vehiculeId" params={{ vehiculeId: vehicule.id }} className="text-xs text-primary font-medium hover:underline">Voir fiche</Link>}
          </div>
          <div className="p-6">
            {vehicule ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Marque / Modèle</p><p className="font-medium text-card-foreground">{vehicule.marque} {vehicule.modele}</p></div>
                <div><p className="text-muted-foreground">Immatriculation</p><p className="font-medium font-mono text-card-foreground">{vehicule.immatriculation || "—"}</p></div>
                <div><p className="text-muted-foreground">Batterie</p><p className="font-medium text-card-foreground">{vehicule.capacite_batterie ? `${vehicule.capacite_batterie} kWh` : "—"}</p></div>
                <div>
                  <p className="text-muted-foreground">Statut</p>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${vehicule.statut_smartcar === "connecte" ? "text-chargiz-teal" : "text-muted-foreground"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${vehicule.statut_smartcar === "connecte" ? "bg-chargiz-teal" : "bg-muted-foreground"}`} />
                    {vehicule.statut_smartcar === "connecte" ? "Connecté" : "Déconnecté"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Aucun véhicule affecté.</p>
            )}
          </div>
        </div>

        {/* Dernières recharges */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-card-foreground">Dernières recharges</h3>
            <Link to="/dashboard/mes-consommations" className="text-xs text-primary font-medium hover:underline">Tout voir</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">kWh</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Coût</th>
                <th className="px-6 py-3 text-center font-medium text-muted-foreground">Type</th>
              </tr></thead>
              <tbody>
                {sessions.slice(0, 5).map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 text-card-foreground">{s.date_session ? new Date(s.date_session).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{(s.energie_kwh || 0).toFixed(1)}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{(s.cout_euro || 0).toFixed(2)} €</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.is_domicile ? "bg-kpi-home/10 text-kpi-home" : "bg-kpi-away/10 text-kpi-away"}`}>
                        {s.is_domicile ? "Domicile" : "Hors dom."}
                      </span>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Aucune recharge</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
