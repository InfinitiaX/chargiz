import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api, apiFetch, onDataChanged } from "@/lib/api";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import KpiCard from "@/components/KpiCard";
import PageSkeleton from "@/components/PageSkeleton";
import SectionHeader from "@/components/SectionHeader";
import DateRangeFilter, { isDateRangeValid } from "@/components/DateRangeFilter";
import TablePagination from "@/components/TablePagination";
import CreateCollaborateurDialog from "@/components/CreateCollaborateurDialog";
import { exportXLSX } from "@/lib/export";
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
    return <PageSkeleton kpiCount={4} rowCount={6} />;
  }

  switch (role) {
    case "superadmin": return <SuperAdminDashboard />;
    // L'admin a une vue similaire au superadmin mais limitée aux entreprises
    // qui lui sont attribuées (filtrage automatique côté backend via /api/entreprises).
    case "admin": return <SuperAdminDashboard />;
    case "gestionnaire_entreprise": return <GestEntrepriseDashboard />;
    case "gestionnaire_filiale": return <ScopedManagerDashboard scope="filiale" />;
    case "gestionnaire_site": return <ScopedManagerDashboard scope="site" />;
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
  const [scopedPage, setScopedPage] = useState(1);
  const SCOPED_PAGE_SIZE = 10;
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
        api.collaborateurs.list({ ...filter, active_only: "true" }),  // BugID_013
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
    return <PageSkeleton kpiCount={4} rowCount={6} />;
  }

  // KPI calc — on ne compte que les sessions des collabs effectivement visibles
  // (cohérence KPI ↔ tableau : la somme des colonnes dom + hors dom = Énergie totale)
  const visibleCollabIds = new Set(collabs.map(c => c.id));
  const scopedSessions = sessions.filter(s => visibleCollabIds.has(s.collaborateur_id));
  const energieTotale = scopedSessions.reduce((a, s) => a + (s.energie_kwh || 0), 0);
  const energieDomicile = scopedSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
  const coutTotal = scopedSessions.reduce((a, s) => a + (s.cout_euro || 0), 0);
  const coutRemboursable = scopedSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.cout_euro || 0), 0);
  const nbSessionsDomicile = scopedSessions.filter(s => s.is_domicile).length;

  const filtered = collabs.filter(c =>
    !search || `${c.nom} ${c.prenom} ${c.email || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const scopedTotalPages = Math.ceil(filtered.length / SCOPED_PAGE_SIZE);
  const scopedPaginatedCollabs = filtered.slice((scopedPage - 1) * SCOPED_PAGE_SIZE, scopedPage * SCOPED_PAGE_SIZE);

  const tableData = scopedPaginatedCollabs.map(c => {
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
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {scopeLabel} — {scopeName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilotage de la flotte et des consommations de votre {scope === "filiale" ? "filiale" : "site"}
          </p>
        </div>
        {/* BugID_033 — Export Excel (Scoped Filiale/Site) */}
        <button
          onClick={() => exportXLSX(`ChargiZ_${scopeLabel}_${(scopeName || "").replace(/[^a-zA-Z0-9]+/g, "_")}`, tableData.map(r => ({
            "Prénom": r.prenom,
            "Nom": r.nom,
            "Immatriculation": r.immatriculation,
            "Rech. Dom (kWh)": Number(r.rechDomKwh.toFixed(2)),
            "Rech. Dom (€)": Number(r.rechDomEuro.toFixed(2)),
            "Rech. Hors (kWh)": Number(r.rechHorsDom.toFixed(2)),
            "Km": r.km != null ? Number((r.km as number).toFixed(0)) : "—",
            "Conso. moy. (kWh/100km)": r.conso != null ? Number((r.conso as number).toFixed(1)) : "—",
            "CO₂ évité (kg)": r.co2 != null ? Number((r.co2 as number).toFixed(0)) : "—",
          })), `${scopeLabel} ${scopeName}`)}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors self-start"
          title="Télécharger un fichier Excel (.xlsx) des collaborateurs du périmètre"
        >
          <Download className="h-4 w-4" /> Export Excel
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Collaborateurs" value={String(collabs.length)} icon={Users} tone="neutral" />
        <KpiCard title="Véhicules" value={String(vehicules.length)} icon={Car} tone="neutral" />
        <KpiCard title="Recharges (période)" value={String(sessions.length)} icon={Zap} tone="primary" />
        <KpiCard title="Énergie totale" value={`${energieTotale.toFixed(2)} kWh`} icon={Battery} tone="primary" />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Recharges domicile" value={String(nbSessionsDomicile)} icon={Home} tone="accent" />
        {/* BugID_021 — format décimal 2 chiffres */}
        <KpiCard title="Énergie domicile" value={`${energieDomicile.toFixed(2)} kWh`} icon={Leaf} tone="accent" />
        <KpiCard title="Coût total" value={`${coutTotal.toFixed(2)} €`} icon={Euro} tone="primary" />
        <KpiCard title="À rembourser" value={`${coutRemboursable.toFixed(2)} €`} icon={Euro} tone="accent" />
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
          <input type="text" placeholder="Rechercher un collaborateur..." value={search} onChange={e => { setSearch(e.target.value); setScopedPage(1); }}
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
              ) : tableData.map(c => (
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

      <TablePagination
        page={scopedPage}
        totalPages={scopedTotalPages}
        totalItems={filtered.length}
        pageSize={SCOPED_PAGE_SIZE}
        onPageChange={setScopedPage}
      />

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

  useEffect(() => { if (isDateRangeValid(dateFrom, dateTo)) loadData(); }, [dateFrom, dateTo]);
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
      // Dashboard SuperAdmin : exclure systématiquement les entités archivées
      // (entreprises, filiales, sites, collabs, véhicules + sessions d'entreprises archivées).
      // L'archivage cascade via is_active=False sur chaque entité enfant.
      const [entData, filData, siteData, collData, vehData, sessData] = await Promise.all([
        api.entreprises.list({ active_only: "true" }),
        api.filiales.list({ active_only: "true" }),
        api.sites.list({ active_only: "true" }),
        api.collaborateurs.list({ active_only: "true" }),
        api.vehicules.list({ active_only: "true" }),
        api.sessions.list({ active_only: "true" }),
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
    return <PageSkeleton kpiCount={4} rowCount={6} />;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Plateforme ChargiZ</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vue globale multi-entreprises — SuperAdmin</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
          {/* BugID_033 — Export Excel (SuperAdmin) */}
          <button
            onClick={() => exportXLSX(`ChargiZ_SuperAdmin_${dateFrom}_${dateTo}`, topEntreprises.map(e => ({
              "Entreprise": e.nom,
              "Sessions": e.nbSessions,
              "Énergie totale (kWh)": Number(e.energieTotal.toFixed(2)),
              "Coût total (€)": Number(e.coutTotal.toFixed(2)),
            })), `Période ${dateFrom} → ${dateTo}`)}
            className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            title="Télécharger un fichier Excel (.xlsx) des entreprises filtrées sur la période"
          >
            <Download className="h-4 w-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* Plateforme — comptes globaux (indépendants de la période) */}
      <SectionHeader>Organisation</SectionHeader>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard title="Entreprises" value={String(stats.entreprises)} icon={Building2} tone="primary" />
        <KpiCard title="Filiales" value={String(stats.filiales)} icon={Building2} tone="neutral" />
        <KpiCard title="Sites" value={String(stats.sites)} icon={MapPin} tone="neutral" />
        <KpiCard title="Conducteurs" value={String(stats.conducteurs)} icon={Users} tone="neutral" />
        <KpiCard title="Véhicules" value={String(stats.vehicules)} icon={Car} tone="neutral" />
      </div>

      {/* Activité de recharge — sur la période sélectionnée */}
      <SectionHeader>Activité de recharge sur la période</SectionHeader>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard title="Sessions" value={String(stats.nbSessions)} icon={Zap} tone="primary" />
        <KpiCard title="Sessions domicile" value={String(stats.nbSessionsDomicile)} icon={Home} tone="accent" />
        <KpiCard title="Énergie totale" value={`${stats.energieTotal.toFixed(2)} kWh`} icon={Battery} tone="primary" />
        <KpiCard title="Énergie domicile" value={`${stats.energieDomicile.toFixed(2)} kWh`} icon={Leaf} tone="accent" />
        <KpiCard title="Coût total" value={`${stats.coutTotal.toFixed(2)} €`} icon={Euro} tone="primary" />
        <KpiCard title="À rembourser" value={`${stats.coutRemboursable.toFixed(2)} €`} icon={Euro} tone="accent" />
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
  const [kpisByCollab, setKpisByCollab] = useState<Record<string, { conso: number | null; co2: number | null; km: number | null }>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [showAddCollab, setShowAddCollab] = useState(false);

  // Filtre de date (CDC §6.1.3.2)
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => { if (entrepriseId && isDateRangeValid(dateFrom, dateTo)) loadData(); }, [entrepriseId, dateFrom, dateTo]);
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
      const [collDataRaw, vehData, sessData] = await Promise.all([
        api.collaborateurs.list({ entreprise_id: entrepriseId, active_only: "true" }),  // BugID_013 : exclure archivés du tableau opérationnel
        api.vehicules.list({ entreprise_id: entrepriseId }),
        api.sessions.list({ entreprise_id: entrepriseId }),
      ]);
      const collData = collDataRaw;

      // Filtre les sessions par date
      const fromTs = dateFrom + "T00:00:00";
      const toTs = dateTo + "T23:59:59";
      const dateFilteredSessions = sessData.filter(s => {
        const d = s.date_session || s.date_debut;
        return d && d >= fromTs && d <= toTs;
      });

      // Cohérence KPI ↔ tableau : on ne compte que les sessions rattachées à un
      // collaborateur effectivement présent dans la liste (évite les orphelins
      // après suppression). Comme ça la somme des colonnes du tableau =
      // Énergie totale du KPI exactement.
      const visibleCollabIds = new Set(collData.map((c: any) => c.id));
      const filteredSessions = dateFilteredSessions.filter(s => visibleCollabIds.has(s.collaborateur_id));

      setCollabs(collData);
      setVehicules(vehData);
      setSessions(filteredSessions);

      // Stats agrégés sur la période (= somme exacte des colonnes du tableau)
      const energieTotal = filteredSessions.reduce((a, s) => a + (s.energie_kwh || 0), 0);
      const energieDomicile = filteredSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
      const coutRemboursable = filteredSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.cout_euro || 0), 0);

      setStats({
        collaborateurs: collData.length,
        vehicules: vehData.length,
        nbSessions: filteredSessions.length,
        nbSessionsDomicile: filteredSessions.filter(s => s.is_domicile).length,
        energieTotal,
        energieDomicile,
        coutRemboursable,
      });

      // Charge les KPIs réels (conso/CO2/km) pour chaque collaborateur en parallèle
      const kpisResults = await Promise.all(
        collData.map(async (c: any) => {
          try {
            const kpi = await apiFetch<any>(
              `/api/collaborateurs/${c.id}/kpis?date_from=${dateFrom}&date_to=${dateTo}`
            );
            return [c.id, {
              conso: kpi.conso_moyenne_kwh_100km,
              co2: kpi.co2_evite_kg,
              km: kpi.dernier_km,
            }] as const;
          } catch {
            return [c.id, { conso: null, co2: null, km: null }] as const;
          }
        })
      );
      setKpisByCollab(Object.fromEntries(kpisResults));
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
  }

  const filtered = collabs.filter(c => !search || `${c.nom} ${c.prenom}`.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedCollabs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Compute stats per collaborator (sur la page courante uniquement, pour économiser le rendu)
  const tableData = paginatedCollabs.map(c => {
    const v = vehicules.find(v => v.collaborateur_id === c.id);
    const cSessions = sessions.filter(s => s.collaborateur_id === c.id);

    const rechDomKwh = cSessions.filter(s => s.is_domicile).reduce((acc, s) => acc + (s.energie_kwh || 0), 0);
    const rechDomEuro = cSessions.filter(s => s.is_domicile).reduce((acc, s) => acc + (s.cout_euro || 0), 0);
    const rechHorsDom = cSessions.filter(s => !s.is_domicile).reduce((acc, s) => acc + (s.energie_kwh || 0), 0);

    const kpi = kpisByCollab[c.id] || { conso: null, co2: null, km: null };

    return {
      id: c.id,
      prenom: c.prenom,
      nom: c.nom,
      immatriculation: v?.immatriculation || "—",
      rechDomKwh,
      rechDomEuro,
      rechHorsDom,
      kilom: kpi.km,
      consoMoyenne: kpi.conso,
      co2: kpi.co2,
    };
  });

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Tableau de bord</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pilotage de la flotte et des consommations</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm self-start sm:self-auto">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-transparent text-xs outline-none" />
          <span className="text-xs text-muted-foreground">→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-transparent text-xs outline-none" />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Recharges (période)" value={String(stats.nbSessions)} icon={Zap} tone="primary" />
        <KpiCard title="Recharges domicile" value={String(stats.nbSessionsDomicile)} icon={Home} tone="accent" />
        <KpiCard title="Énergie totale" value={`${stats.energieTotal.toFixed(2)} kWh`} icon={Battery} tone="primary" />
        <KpiCard title="Énergie domicile" value={`${stats.energieDomicile.toFixed(2)} kWh`} icon={Leaf} tone="accent" />
      </div>

      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex w-full sm:w-auto items-center gap-2">
          <button onClick={() => setShowAddCollab(true)} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-95">
            <Plus className="h-4 w-4" /> Ajouter collaborateur
          </button>
          {/* BugID_033 — Export Excel depuis l'Accueil (toutes les données filtrées, pas juste la page) */}
          <button
            onClick={() => {
              const fullRows = filtered.map(c => {
                const v = vehicules.find(v => v.collaborateur_id === c.id);
                const cSessions = sessions.filter(s => s.collaborateur_id === c.id);
                const rechDomKwh = cSessions.filter(s => s.is_domicile).reduce((acc, s) => acc + (s.energie_kwh || 0), 0);
                const rechDomEuro = cSessions.filter(s => s.is_domicile).reduce((acc, s) => acc + (s.cout_euro || 0), 0);
                const rechHorsDom = cSessions.filter(s => !s.is_domicile).reduce((acc, s) => acc + (s.energie_kwh || 0), 0);
                const kpi = kpisByCollab[c.id] || { conso: null, co2: null, km: null };
                return {
                  "Prénom": c.prenom,
                  "Nom": c.nom,
                  "Email": c.email || "—",
                  "Immatriculation": v?.immatriculation || "—",
                  "Rech. Dom (kWh)": Number(rechDomKwh.toFixed(2)),
                  "Rech. Dom (€)": Number(rechDomEuro.toFixed(2)),
                  "Rech. Hors (kWh)": Number(rechHorsDom.toFixed(2)),
                  "Km": kpi.km != null ? Number(kpi.km.toFixed(0)) : "—",
                  "Conso. moy. (kWh/100km)": kpi.conso != null ? Number(kpi.conso.toFixed(1)) : "—",
                  "CO₂ évité (kg)": kpi.co2 != null ? Number(kpi.co2.toFixed(0)) : "—",
                };
              });
              exportXLSX(`ChargiZ_Accueil_${dateFrom}_${dateTo}`, fullRows, `Période ${dateFrom} → ${dateTo}`);
            }}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            title="Télécharger un fichier Excel (.xlsx) avec les données du tableau filtrées sur la période sélectionnée"
          >
            <Download className="h-4 w-4" /> Export Excel
          </button>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher un membre..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full sm:w-64 rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">Suivi des collaborateurs</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filtered.length} collaborateur{filtered.length > 1 ? "s" : ""}
              {search && ` (filtré${filtered.length > 1 ? "s" : ""} sur ${collabs.length})`}
            </p>
          </div>
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
              {tableData.map(c => (
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

      <TablePagination
        page={page}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

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
  const now = new Date();
  const dateLabel = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();

  useEffect(() => { if (profile) loadData(); }, [profile]);

  async function loadData() {
    if (!profile) return;
    try {
      const [vehData, sessData] = await Promise.all([
        api.vehicules.list(),
        api.sessions.list(),
      ]);
      if (vehData.length > 0) setVehicule(vehData[0]);
      setSessions(sessData);
      const km = sessData.reduce((a: number, s: any) => a + (s.kilometrage || 0), 0);
      setStats({
        energieTotal: sessData.reduce((a: number, s: any) => a + (s.energie_kwh || 0), 0),
        coutTotal: sessData.reduce((a: number, s: any) => a + (s.cout_euro || 0), 0),
        energieDomicile: sessData.filter((s: any) => s.is_domicile).reduce((a: number, s: any) => a + (s.energie_kwh || 0), 0),
        coutRemboursable: sessData.filter((s: any) => s.is_domicile).reduce((a: number, s: any) => a + (s.cout_euro || 0), 0),
        co2Evite: km * 0.146,
        km,
        nbSessions: sessData.length,
      });
    } catch (err) {
      console.error("Error loading conductor stats:", err);
    }
  }

  const pctDomicile = stats.energieTotal > 0
    ? Math.round((stats.energieDomicile / stats.energieTotal) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero header ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border bg-card px-6 py-8 sm:px-10 sm:py-10">
        {/* Subtle dot-grid background */}
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, oklch(0.38 0.06 190 / 0.07) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        {/* Teal gradient glow top-left */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-chargiz-teal opacity-[0.07] blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-chargiz-teal">
              Chargiz // Performance
            </p>
            <h1 className="text-3xl font-extrabold leading-none tracking-tight text-foreground sm:text-4xl">
              {profile?.prenom} <span className="text-chargiz-teal">{profile?.nom}.</span>
            </h1>
            <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Smartcar status pill */}
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
              vehicule?.statut_smartcar === "connecte"
                ? "border-chargiz-teal/30 bg-chargiz-teal/8 text-chargiz-teal"
                : "border-border bg-muted text-muted-foreground"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${vehicule?.statut_smartcar === "connecte" ? "animate-pulse bg-chargiz-teal" : "bg-muted-foreground"}`} />
              {vehicule?.statut_smartcar === "connecte" ? "Smartcar actif" : "Non connecté"}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-chargiz-lime/40 bg-chargiz-lime/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-chargiz-lime-dark">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-chargiz-lime-dark" />
              Live
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 sm:px-10">

        {/* ── Section label ─────────────────────────────────────────── */}
        <div className="mb-5 flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-chargiz-teal">Métriques // 01</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* ── KPI strip ─────────────────────────────────────────────── */}
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Sessions", value: stats.nbSessions, unit: "", color: "border-kpi-sessions/50 text-kpi-sessions bg-kpi-sessions/5" },
            { label: "Énergie totale", value: stats.energieTotal.toFixed(2), unit: "kWh", color: "border-kpi-energy/50 text-kpi-energy bg-kpi-energy/5" },
            { label: "kWh domicile", value: stats.energieDomicile.toFixed(2), unit: "kWh", color: "border-kpi-home/50 text-kpi-home bg-kpi-home/5" },
            { label: "Remboursable", value: stats.coutRemboursable.toFixed(2), unit: "€", color: "border-chargiz-lime/50 text-chargiz-lime-dark bg-chargiz-lime/8" },
            { label: "CO₂ évité", value: stats.co2Evite.toFixed(0), unit: "kg", color: "border-kpi-sessions/50 text-kpi-sessions bg-kpi-sessions/5" },
            { label: "Km odomètre", value: stats.km > 0 ? stats.km.toLocaleString("fr-FR") : "—", unit: stats.km > 0 ? "km" : "", color: "border-kpi-away/50 text-kpi-away bg-kpi-away/5" },
          ].map(kpi => (
            <div key={kpi.label} className={`rounded-xl border-l-4 bg-card p-4 shadow-sm ${kpi.color}`}>
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{kpi.label}</p>
              <p className={`text-2xl font-extrabold leading-none tracking-tight tabular-nums ${kpi.color.split(" ")[1]}`}>
                {kpi.value}
              </p>
              {kpi.unit && <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{kpi.unit}</p>}
            </div>
          ))}
        </div>

        {/* ── Barre de répartition domicile / hors domicile ─────────── */}
        {stats.energieTotal > 0 && (
          <div className="mb-10 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Répartition de l'énergie</p>
              <p className="text-xs font-semibold text-muted-foreground">{stats.energieTotal.toFixed(1)} kWh total</p>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-kpi-home transition-all duration-700"
                style={{ width: `${pctDomicile}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center gap-6 text-xs">
              <span className="flex items-center gap-1.5 text-kpi-home font-semibold">
                <span className="h-2 w-2 rounded-sm bg-kpi-home" />
                Domicile — {pctDomicile}%
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                <span className="h-2 w-2 rounded-sm bg-muted-foreground/40" />
                Hors domicile — {100 - pctDomicile}%
              </span>
            </div>
          </div>
        )}

        {/* ── Section 2 ─────────────────────────────────────────────── */}
        <div className="mb-5 flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-chargiz-teal">Flotte & Activité // 02</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

          {/* Véhicule — 2 cols */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Card accent header */}
            <div className="relative bg-chargiz-teal px-6 py-5 overflow-hidden">
              <div className="pointer-events-none absolute right-0 top-0 h-full w-24 opacity-20"
                style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 5px)" }} />
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-chargiz-lime mb-1">Flotte // 01</p>
              <h3 className="text-lg font-extrabold text-white leading-tight tracking-tight">
                {vehicule ? `${vehicule.marque} ${vehicule.modele}` : "Aucun véhicule"}
              </h3>
              {vehicule?.immatriculation && (
                <p className="mt-0.5 font-mono text-xs text-white/70">{vehicule.immatriculation}</p>
              )}
              {vehicule && (
                <Link to="/dashboard/listes/vehicules/$vehiculeId" params={{ vehiculeId: vehicule.id }}
                  className="absolute right-4 top-4 rounded-md bg-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-white/25 transition-colors">
                  Fiche →
                </Link>
              )}
            </div>

            {vehicule ? (
              <div className="p-5 grid grid-cols-2 gap-4">
                {[
                  { label: "Batterie", value: vehicule.capacite_batterie ? `${vehicule.capacite_batterie} kWh` : "—" },
                  { label: "VIN", value: vehicule.vin ? vehicule.vin.slice(-8) + "…" : "—" },
                  { label: "Affectation", value: vehicule.statut_affectation === "affecte" ? "Affecté" : "Disponible" },
                  { label: "Connexion", value: vehicule.statut_smartcar === "connecte" ? "Smartcar connecté" : "Déconnecté" },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{item.label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-card-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-sm italic text-muted-foreground">Aucun véhicule affecté.</p>
            )}
          </div>

          {/* Sessions — 3 cols */}
          <div className="lg:col-span-3 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-chargiz-teal mb-0.5">Activité // 02</p>
                <h3 className="text-base font-extrabold tracking-tight text-card-foreground">Dernières recharges</h3>
              </div>
              <Link to="/dashboard/mes-consommations"
                className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary hover:bg-muted transition-colors">
                Tout voir →
              </Link>
            </div>

            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <Zap className="mb-3 h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Aucune recharge enregistrée</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {sessions.slice(0, 5).map((s: any, i: number) => (
                  <div key={s.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/30 transition-colors">
                    {/* Index */}
                    <span className="w-5 text-center text-[10px] font-bold text-muted-foreground/50 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {/* Date */}
                    <div className="min-w-[70px]">
                      <p className="text-xs font-semibold text-card-foreground">
                        {s.date_session ? new Date(s.date_session).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.date_session ? new Date(s.date_session).getFullYear() : ""}
                      </p>
                    </div>
                    {/* Type badge */}
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      s.is_domicile ? "bg-kpi-home/10 text-kpi-home" : "bg-kpi-away/10 text-kpi-away"
                    }`}>
                      {s.is_domicile ? "Dom." : "Ext."}
                    </span>
                    {/* Energy bar */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold tabular-nums text-card-foreground">{(s.energie_kwh || 0).toFixed(1)} kWh</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${s.is_domicile ? "bg-kpi-home" : "bg-kpi-away"}`}
                          style={{ width: `${Math.min(100, ((s.energie_kwh || 0) / Math.max(...sessions.map((x: any) => x.energie_kwh || 0), 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                    {/* Cost */}
                    <div className="text-right min-w-[52px]">
                      <p className="text-xs font-extrabold tabular-nums text-card-foreground">{(s.cout_euro || 0).toFixed(2)} €</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
