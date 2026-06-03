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
import CreateFilialeDialog from "@/components/CreateFilialeDialog";
import CreateSiteDialog from "@/components/CreateSiteDialog";
import CreateEntrepriseDialog from "@/components/CreateEntrepriseDialog";
import { exportXLSX } from "@/lib/export";
import { normalizeImmat } from "@/lib/immat";
import ImmatBadge from "@/components/ImmatBadge";
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
   Même UI que GestEntrepriseDashboard mais filtres verrouillés
   sur la filiale ou le site du gestionnaire connecté.
   ═══════════════════════════════════════════ */
function ScopedManagerDashboard({ scope }: { scope: "filiale" | "site" }) {
  const { profile } = useAuth();
  const entrepriseId = profile?.entreprise_id || "";
  const filialeId = profile?.filiale_id || "";
  const siteId = profile?.site_id || "";
  const scopeId = scope === "filiale" ? filialeId : siteId;

  const [scopeName, setScopeName] = useState<string>("");
  const [collabs, setCollabs] = useState<any[]>([]);
  const [vehicules, setVehicules] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [kpisByCollab, setKpisByCollab] = useState<Record<string, { conso: number | null; co2: number | null; km: number | null }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [scopedPage, setScopedPage] = useState(1);
  const SCOPED_PAGE_SIZE = 10;
  const [showAddCollab, setShowAddCollab] = useState(false);
  const [showAddSite, setShowAddSite] = useState(false);

  // Filtres UI
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [unit, setUnit] = useState<"kwh" | "eur">("kwh");
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!scopeId) { setLoading(false); return; }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeId, scope, selectedSite, dateFrom, dateTo]);

  async function loadData() {
    setLoading(true);
    try {
      // Filtre selon scope + sélection éventuelle de site (filiale uniquement)
      const baseFilter: Record<string, string> = scope === "filiale"
        ? { filiale_id: scopeId }
        : { site_id: scopeId };
      if (scope === "filiale" && selectedSite) baseFilter.site_id = selectedSite;

      const [collData, vehData, sessData] = await Promise.all([
        api.collaborateurs.list({ ...baseFilter, active_only: "true" }),
        api.vehicules.list(baseFilter),
        api.sessions.list(baseFilter).catch(() => [] as any[]),
      ]);

      // Filtre date
      const fromTs = dateFrom + "T00:00:00";
      const toTs = dateTo + "T23:59:59";
      const dateFilteredSessions = sessData.filter((s: any) => {
        const d = s.date_session || s.date_debut;
        return d && d >= fromTs && d <= toTs;
      });
      const visibleCollabIds = new Set(collData.map((c: any) => c.id));
      const filteredSessions = dateFilteredSessions.filter((s: any) => visibleCollabIds.has(s.collaborateur_id));

      setCollabs(collData);
      setVehicules(vehData);
      setSessions(filteredSessions);

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

      // KPIs individuels par collaborateur (conso / CO₂ / km)
      const kpisResults = await Promise.all(
        collData.map(async (c: any) => {
          try {
            const kpi = await apiFetch<any>(
              `/api/collaborateurs/${c.id}/kpis?date_from=${dateFrom}&date_to=${dateTo}T23:59:59`
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
      console.error("Error loading scoped dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  // Formatage nombres FR
  const fmt0 = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  const fmt1 = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmt2 = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  // KPI calc
  const nbSessions = sessions.length;
  const nbSessionsDomicile = sessions.filter(s => s.is_domicile).length;
  const energieTotale  = sessions.reduce((a, s) => a + (s.energie_kwh || 0), 0);
  const energieDomicile = sessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
  const energieHorsDom = sessions.filter(s => !s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);

  const filtered = collabs.filter(c =>
    !search || `${c.nom} ${c.prenom} ${c.email || ""}`.toLowerCase().includes(search.toLowerCase())
  );
  const scopedTotalPages = Math.ceil(filtered.length / SCOPED_PAGE_SIZE);
  const scopedPaginatedCollabs = filtered.slice((scopedPage - 1) * SCOPED_PAGE_SIZE, scopedPage * SCOPED_PAGE_SIZE);

  const tableData = scopedPaginatedCollabs.map(c => {
    const cSessions = sessions.filter(s => s.collaborateur_id === c.id);
    const rechDomKwh = cSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
    const rechDomEuro = cSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.cout_euro || 0), 0);
    const rechHorsDomKwh = cSessions.filter(s => !s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
    const rechHorsDomEuro = cSessions.filter(s => !s.is_domicile).reduce((a, s) => a + (s.cout_euro || 0), 0);
    const kpi = kpisByCollab[c.id] || { conso: null, co2: null, km: null };
    const veh = vehicules.find((v: any) => v.collaborateur_id === c.id);
    return {
      id: c.id, prenom: c.prenom, nom: c.nom,
      immatriculation: veh?.immatriculation || null,
      rechDomKwh, rechDomEuro, rechHorsDomKwh, rechHorsDomEuro,
      kilom: kpi.km, consoMoyenne: kpi.conso, co2: kpi.co2,
    };
  });

  const scopeLabel = scope === "filiale" ? "Filiale" : "Site";

  function handleExport() {
    const rows = filtered.map(c => {
      const cSessions = sessions.filter(s => s.collaborateur_id === c.id);
      const rechDomKwh = cSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
      const rechDomEuro = cSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.cout_euro || 0), 0);
      const rechHorsDomKwh = cSessions.filter(s => !s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
      const kpi = kpisByCollab[c.id] || { conso: null, co2: null, km: null };
      return {
        "Prénom": c.prenom, "Nom": c.nom,
        "Rech. Dom (kWh)": Number(rechDomKwh.toFixed(2)),
        "Rech. Dom (€)":   Number(rechDomEuro.toFixed(2)),
        "Rech. Hors (kWh)": Number(rechHorsDomKwh.toFixed(2)),
        "Km": kpi.km != null ? Number((kpi.km as number).toFixed(0)) : "—",
        "Conso. moy. (kWh/100km)": kpi.conso != null ? Number((kpi.conso as number).toFixed(1)) : "—",
        "CO₂ évité (kg)": kpi.co2 != null ? Number((kpi.co2 as number).toFixed(0)) : "—",
      };
    });
    exportXLSX(`ChargiZ_${scopeLabel}_${(scopeName || "").replace(/[^a-zA-Z0-9]+/g, "_")}_${dateFrom}_${dateTo}`, rows, `${scopeLabel} ${scopeName}`);
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">

      {/* ─── Barre supérieure : périmètre + dates + toggle + export ─── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Périmètre verrouillé (selon rôle) */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-foreground/80">{scopeLabel}</label>
          <select
            disabled
            value={scopeId}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none disabled:opacity-100 disabled:cursor-default"
          >
            <option value={scopeId}>{scopeName}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-foreground/80">Date de</label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={e => {
              const v = e.target.value;
              setDateFrom(v);
              // Auto-correction : si la nouvelle date de début dépasse la date de fin, on aligne la fin
              if (v && dateTo && v > dateTo) setDateTo(v);
            }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-all hover:border-[#0f4b49]/40 focus:border-[#0f4b49] focus:ring-2 focus:ring-[#0f4b49]/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-foreground/80">Date à</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={e => {
              const v = e.target.value;
              setDateTo(v);
              // Auto-correction : si la fin est antérieure au début, on aligne le début
              if (v && dateFrom && v < dateFrom) setDateFrom(v);
            }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-all hover:border-[#0f4b49]/40 focus:border-[#0f4b49] focus:ring-2 focus:ring-[#0f4b49]/20"
          />
        </div>
        <div className="ml-2 flex overflow-hidden rounded-lg border border-border bg-card">
          <button onClick={() => setUnit("kwh")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${unit === "kwh" ? "bg-chargiz-teal text-white" : "text-foreground hover:bg-muted"}`}>kWh</button>
          <button onClick={() => setUnit("eur")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${unit === "eur" ? "bg-chargiz-teal text-white" : "text-foreground hover:bg-muted"}`}>€</button>
        </div>
        <button onClick={handleExport}
          className="ml-auto flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          title="Télécharger un fichier Excel (.xlsx)">
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      {/* ─── 5 KPI cards (mêmes dimensions que la page Statistiques) ─── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Nombre total sessions" value={fmt0(nbSessions)}               icon={Zap}     iconClass="bg-violet-100 text-violet-600" />
        <KpiCard title="Sessions domicile"     value={fmt0(nbSessionsDomicile)}       icon={Home}    iconClass="bg-emerald-100 text-emerald-600" />
        <KpiCard title="Énergie totale"        value={`${fmt1(energieTotale)} kWh`}   icon={Battery} iconClass="bg-slate-200 text-slate-700" />
        <KpiCard title="Énergie domicile"      value={`${fmt1(energieDomicile)} kWh`} icon={Battery} iconClass="bg-teal-100 text-teal-600" />
        <KpiCard title="Énergie hors domicile" value={`${fmt1(energieHorsDom)} kWh`}  icon={MapPin}  iconClass="bg-orange-100 text-orange-600" />
      </div>

      {/* ─── Filtres + actions (scope filiale a un dropdown site, scope site rien) ─── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {scope === "filiale" && (
          <>
            <select
              value={selectedSite}
              onChange={e => { setSelectedSite(e.target.value); setScopedPage(1); }}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Tous les sites de la filiale</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
            <button onClick={() => setShowAddSite(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              <Plus className="h-4 w-4" /> Ajouter site
            </button>
          </>
        )}
        <button onClick={() => setShowAddCollab(true)}
          className={`${scope === "site" ? "" : ""} flex items-center gap-1.5 rounded-lg bg-chargiz-lime px-4 py-2 text-sm font-semibold text-chargiz-teal-dark hover:brightness-95 transition-colors shadow-sm`}>
          <Plus className="h-4 w-4" /> Ajouter collaborateur
        </button>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher..." value={search}
            onChange={e => { setSearch(e.target.value); setScopedPage(1); }}
            className="w-52 rounded-lg border border-input bg-card pl-10 pr-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      {/* ─── Tableau collaborateurs ─── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="text-sm cz-table-collab" style={{ width: "100%" }}>
            <thead className="cz-table-head">
              <tr className="border-b border-border">
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground">Prénom</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground">Nom</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground">Immat.</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground">Recharge domicile</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground">Recharge hors domicile</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground">Kilométrage</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground">Consommation moyenne</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground">CO₂ évité</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">Aucun collaborateur trouvé</td></tr>
              ) : tableData.map(c => (
                <tr key={c.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => { window.location.href = `/dashboard/collaborateur/${c.id}`; }}>
                  <td className="px-6 py-4 text-card-foreground">{c.prenom}</td>
                  <td className="px-6 py-4 text-card-foreground">{c.nom}</td>
                  <td className="px-6 py-4 text-card-foreground font-mono text-xs"><ImmatBadge value={c.immatriculation} /></td>
                  <td className="px-6 py-4 text-right text-card-foreground tabular-nums">
                    {unit === "kwh" ? `${fmt1(c.rechDomKwh)} kWh` : `${fmt2(c.rechDomEuro)} €`}
                  </td>
                  <td className="px-6 py-4 text-right text-card-foreground tabular-nums">
                    {`${fmt1(c.rechHorsDomKwh)} kWh`}
                  </td>
                  <td className="px-6 py-4 text-right text-card-foreground tabular-nums">
                    {c.kilom != null ? `${fmt0(c.kilom as number)} km` : "—"}
                  </td>
                  <td className="px-6 py-4 text-right text-card-foreground tabular-nums">
                    {c.consoMoyenne != null ? `${fmt1(c.consoMoyenne as number)} kWh/100km` : "—"}
                  </td>
                  <td className="px-6 py-4 text-right text-card-foreground tabular-nums">
                    {c.co2 != null ? `${fmt1(((c.co2 as number)) / 1000)} t` : "—"}
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

      {/* Dialogs */}
      {entrepriseId && (
        <CreateCollaborateurDialog
          entrepriseId={entrepriseId}
          open={showAddCollab}
          onClose={() => setShowAddCollab(false)}
          onCreated={loadData}
        />
      )}
      {scope === "filiale" && (
        <CreateSiteDialog
          open={showAddSite}
          onClose={() => setShowAddSite(false)}
          onCreated={() => {
            api.sites.list({ filiale_id: scopeId }).then(setSites).catch(console.error);
            loadData();
          }}
          filialeId={scopeId}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   1. SUPERADMIN — Vue plateforme globale
   Même design que GestEntrepriseDashboard avec un sélecteur Entreprise
   en plus pour zoomer sur une entreprise précise.
   ═══════════════════════════════════════════ */
function SuperAdminDashboard() {
  const { role } = useAuth();
  // ── Données globales ──
  const [entreprises, setEntreprises] = useState<{ id: string; nom: string }[]>([]);
  const [filiales, setFiliales] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [collabs, setCollabs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [vehicules, setVehicules] = useState<any[]>([]);
  const [kpisByCollab, setKpisByCollab] = useState<Record<string, { conso: number | null; co2: number | null; km: number | null }>>({});

  // ── KPI agrégés ──
  const [stats, setStats] = useState({
    nbSessions: 0, nbSessionsDomicile: 0,
    energieTotal: 0, energieDomicile: 0, energieHorsDom: 0,
    coutRemboursable: 0,
  });

  // ── Filtres ──
  const [selectedEntreprise, setSelectedEntreprise] = useState<string>("");
  const [selectedFiliale, setSelectedFiliale] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [unit, setUnit] = useState<"kwh" | "eur">("kwh");
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  // ── UI ──
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [showAddEntreprise, setShowAddEntreprise] = useState(false);
  const [showAddFiliale, setShowAddFiliale] = useState(false);
  const [showAddSite, setShowAddSite] = useState(false);
  const [showAddCollab, setShowAddCollab] = useState(false);

  // Charge la liste des entreprises au montage
  useEffect(() => {
    api.entreprises.list({ active_only: "true" })
      .then(d => setEntreprises(d.map((e: any) => ({ id: e.id, nom: e.nom }))))
      .catch(console.error);
  }, []);

  // Charge les filiales filtrées selon l'entreprise sélectionnée
  useEffect(() => {
    setSelectedFiliale("");
    setSelectedSite("");
    const filter: Record<string, string> = { active_only: "true" };
    if (selectedEntreprise) filter.entreprise_id = selectedEntreprise;
    api.filiales.list(filter).then(setFiliales).catch(console.error);
  }, [selectedEntreprise]);

  // Charge les sites selon la filiale (ou entreprise)
  useEffect(() => {
    setSelectedSite("");
    const filter: Record<string, string> = { active_only: "true" };
    if (selectedFiliale) filter.filiale_id = selectedFiliale;
    else if (selectedEntreprise) filter.entreprise_id = selectedEntreprise;
    api.sites.list(filter).then(setSites).catch(console.error);
  }, [selectedEntreprise, selectedFiliale]);

  // Charge les données collabs+sessions à chaque changement de filtre
  useEffect(() => {
    if (isDateRangeValid(dateFrom, dateTo)) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntreprise, selectedFiliale, selectedSite, dateFrom, dateTo]);

  useEffect(() => {
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);
    const unsub = onDataChanged(() => loadData());
    return () => {
      window.removeEventListener("focus", onFocus);
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Construit le filtre selon le scope sélectionné
      const baseFilter: Record<string, string> = { active_only: "true" };
      if (selectedEntreprise) baseFilter.entreprise_id = selectedEntreprise;
      if (selectedFiliale) baseFilter.filiale_id = selectedFiliale;
      if (selectedSite) baseFilter.site_id = selectedSite;

      const [collData, sessData, vehData] = await Promise.all([
        api.collaborateurs.list(baseFilter),
        api.sessions.list(baseFilter).catch(() => [] as any[]),
        api.vehicules.list(baseFilter).catch(() => [] as any[]),
      ]);
      setVehicules(vehData);

      // Filtre par date
      const fromTs = dateFrom + "T00:00:00";
      const toTs = dateTo + "T23:59:59";
      const dateFiltered = sessData.filter((s: any) => {
        const d = s.date_session || s.date_debut;
        return d && d >= fromTs && d <= toTs;
      });

      // Cohérence KPI ↔ tableau : ne garder que les sessions des collabs visibles
      const visibleIds = new Set(collData.map((c: any) => c.id));
      const filteredSessions = dateFiltered.filter((s: any) => visibleIds.has(s.collaborateur_id));

      setCollabs(collData);
      setSessions(filteredSessions);

      const energieTotal     = filteredSessions.reduce((a: number, s: any) => a + (s.energie_kwh || 0), 0);
      const energieDomicile  = filteredSessions.filter((s: any) =>  s.is_domicile).reduce((a: number, s: any) => a + (s.energie_kwh || 0), 0);
      const energieHorsDom   = filteredSessions.filter((s: any) => !s.is_domicile).reduce((a: number, s: any) => a + (s.energie_kwh || 0), 0);
      const coutRemboursable = filteredSessions.filter((s: any) =>  s.is_domicile).reduce((a: number, s: any) => a + (s.cout_euro || 0), 0);

      setStats({
        nbSessions: filteredSessions.length,
        nbSessionsDomicile: filteredSessions.filter((s: any) => s.is_domicile).length,
        energieTotal,
        energieDomicile,
        energieHorsDom,
        coutRemboursable,
      });

      // KPIs individuels (conso / CO₂ / km) — uniquement quand on a < 100 collabs
      // pour éviter une avalanche de requêtes en vue plateforme globale.
      if (collData.length <= 100) {
        const kpisResults = await Promise.all(
          collData.map(async (c: any) => {
            try {
              const kpi = await apiFetch<any>(
                `/api/collaborateurs/${c.id}/kpis?date_from=${dateFrom}&date_to=${dateTo}T23:59:59`
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
      } else {
        setKpisByCollab({});
      }
    } catch (err) {
      console.error("Error loading superadmin dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  // Format FR
  const fmt0 = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  const fmt1 = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmt2 = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const filtered = collabs.filter(c =>
    !search || `${c.nom} ${c.prenom} ${c.email || ""}`.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedCollabs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tableData = paginatedCollabs.map(c => {
    const cSessions = sessions.filter(s => s.collaborateur_id === c.id);
    const rechDomKwh     = cSessions.filter(s =>  s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
    const rechDomEuro    = cSessions.filter(s =>  s.is_domicile).reduce((a, s) => a + (s.cout_euro  || 0), 0);
    const rechHorsDomKwh = cSessions.filter(s => !s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
    const rechHorsDomEuro= cSessions.filter(s => !s.is_domicile).reduce((a, s) => a + (s.cout_euro  || 0), 0);
    const kpi = kpisByCollab[c.id] || { conso: null, co2: null, km: null };
    const veh = vehicules.find((v: any) => v.collaborateur_id === c.id);
    return {
      id: c.id, prenom: c.prenom, nom: c.nom,
      immatriculation: veh?.immatriculation || null,
      rechDomKwh, rechDomEuro, rechHorsDomKwh, rechHorsDomEuro,
      kilom: kpi.km, consoMoyenne: kpi.conso, co2: kpi.co2,
    };
  });

  function handleExport() {
    const rows = filtered.map(c => {
      const cSessions = sessions.filter(s => s.collaborateur_id === c.id);
      const rechDomKwh     = cSessions.filter(s =>  s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
      const rechDomEuro    = cSessions.filter(s =>  s.is_domicile).reduce((a, s) => a + (s.cout_euro  || 0), 0);
      const rechHorsDomKwh = cSessions.filter(s => !s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
      const kpi = kpisByCollab[c.id] || { conso: null, co2: null, km: null };
      return {
        "Prénom": c.prenom, "Nom": c.nom,
        "Rech. Dom (kWh)": Number(rechDomKwh.toFixed(2)),
        "Rech. Dom (€)":   Number(rechDomEuro.toFixed(2)),
        "Rech. Hors (kWh)": Number(rechHorsDomKwh.toFixed(2)),
        "Km": kpi.km != null ? Number((kpi.km as number).toFixed(0)) : "—",
        "Conso. moy. (kWh/100km)": kpi.conso != null ? Number((kpi.conso as number).toFixed(1)) : "—",
        "CO₂ évité (kg)": kpi.co2 != null ? Number((kpi.co2 as number).toFixed(0)) : "—",
      };
    });
    const label = selectedEntreprise
      ? entreprises.find(e => e.id === selectedEntreprise)?.nom || "Entreprise"
      : "Toutes les entreprises";
    exportXLSX(`ChargiZ_SuperAdmin_${label.replace(/[^a-zA-Z0-9]+/g, "_")}_${dateFrom}_${dateTo}`, rows, label);
  }

  if (loading && collabs.length === 0) {
    return <PageSkeleton kpiCount={5} rowCount={6} />;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">

      {/* ──────────────────────────────────────────────────────────
          Barre supérieure : Entreprise / Date de / Date à / kWh/€ / Export
          ────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-foreground/80">Entreprise</label>
          <select
            value={selectedEntreprise}
            onChange={e => setSelectedEntreprise(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-all hover:border-[#0f4b49]/40 focus:border-[#0f4b49] focus:ring-2 focus:ring-[#0f4b49]/20"
          >
            <option value="">Toutes les entreprises</option>
            {entreprises.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-foreground/80">Date de</label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={e => {
              const v = e.target.value;
              setDateFrom(v);
              if (v && dateTo && v > dateTo) setDateTo(v);
            }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-all hover:border-[#0f4b49]/40 focus:border-[#0f4b49] focus:ring-2 focus:ring-[#0f4b49]/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-foreground/80">Date à</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={e => {
              const v = e.target.value;
              setDateTo(v);
              if (v && dateFrom && v < dateFrom) setDateFrom(v);
            }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-all hover:border-[#0f4b49]/40 focus:border-[#0f4b49] focus:ring-2 focus:ring-[#0f4b49]/20"
          />
        </div>
        <div className="ml-2 flex overflow-hidden rounded-lg border border-border bg-card">
          <button onClick={() => setUnit("kwh")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${unit === "kwh" ? "bg-chargiz-teal text-white" : "text-foreground hover:bg-muted"}`}>kWh</button>
          <button onClick={() => setUnit("eur")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${unit === "eur" ? "bg-chargiz-teal text-white" : "text-foreground hover:bg-muted"}`}>€</button>
        </div>
        <button onClick={handleExport}
          className="ml-auto flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          title="Télécharger un fichier Excel (.xlsx)">
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────
          5 KPI cards (mêmes dimensions que la page Statistiques)
          ────────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Nombre total sessions" value={fmt0(stats.nbSessions)}               icon={Zap}     iconClass="bg-violet-100 text-violet-600" />
        <KpiCard title="Sessions domicile"     value={fmt0(stats.nbSessionsDomicile)}       icon={Home}    iconClass="bg-emerald-100 text-emerald-600" />
        <KpiCard title="Énergie totale"        value={`${fmt1(stats.energieTotal)} kWh`}    icon={Battery} iconClass="bg-slate-200 text-slate-700" />
        <KpiCard title="Énergie domicile"      value={`${fmt1(stats.energieDomicile)} kWh`} icon={Battery} iconClass="bg-teal-100 text-teal-600" />
        <KpiCard title="Énergie hors domicile" value={`${fmt1(stats.energieHorsDom)} kWh`}  icon={MapPin}  iconClass="bg-orange-100 text-orange-600" />
      </div>

      {/* ──────────────────────────────────────────────────────────
          Filtres filiale/site + boutons d'action (avec Entreprise en + pour superadmin)
          ────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={selectedFiliale}
          onChange={e => { setSelectedFiliale(e.target.value); setPage(1); }}
          disabled={!selectedEntreprise && filiales.length > 200}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Toutes les filiales</option>
          {filiales.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
        </select>
        <select
          value={selectedSite}
          onChange={e => { setSelectedSite(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Tous les sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </select>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {(role === "superadmin" || role === "admin") && (
            <button onClick={() => setShowAddEntreprise(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              <Plus className="h-4 w-4" /> Ajouter entreprise
            </button>
          )}
          <button onClick={() => setShowAddFiliale(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Plus className="h-4 w-4" /> Ajouter filiale
          </button>
          <button onClick={() => setShowAddSite(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Plus className="h-4 w-4" /> Ajouter site
          </button>
          <button onClick={() => setShowAddCollab(true)}
            className="flex items-center gap-1.5 rounded-lg bg-chargiz-lime px-4 py-2 text-sm font-semibold text-chargiz-teal-dark hover:brightness-95 transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Ajouter collaborateur
          </button>
        </div>
      </div>

      {/* Barre de recherche secondaire */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher un collaborateur..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-64 rounded-lg border border-input bg-card pl-10 pr-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
        <p className="ml-auto text-xs text-muted-foreground">
          {filtered.length} collaborateur{filtered.length > 1 ? "s" : ""}
          {search && ` (filtré${filtered.length > 1 ? "s" : ""} sur ${collabs.length})`}
        </p>
      </div>

      {/* ──────────────────────────────────────────────────────────
          Tableau des collaborateurs (lignes cliquables)
          ────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="text-sm cz-table-collab" style={{ width: "100%" }}>
            <thead className="cz-table-head">
              <tr className="border-b border-border">
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground">Prénom</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground">Nom</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground">Immat.</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground">Recharge domicile</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground">Recharge hors domicile</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground">Kilométrage</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground">Consommation moyenne</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground">CO₂ évité</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">Aucun collaborateur trouvé</td></tr>
              ) : tableData.map(c => (
                <tr key={c.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => { window.location.href = `/dashboard/collaborateur/${c.id}`; }}>
                  <td className="px-6 py-4 text-card-foreground">{c.prenom}</td>
                  <td className="px-6 py-4 text-card-foreground">{c.nom}</td>
                  <td className="px-6 py-4 text-card-foreground font-mono text-xs"><ImmatBadge value={c.immatriculation} /></td>
                  <td className="px-6 py-4 text-right text-card-foreground tabular-nums">
                    {unit === "kwh" ? `${fmt1(c.rechDomKwh)} kWh` : `${fmt2(c.rechDomEuro)} €`}
                  </td>
                  <td className="px-6 py-4 text-right text-card-foreground tabular-nums">
                    {`${fmt1(c.rechHorsDomKwh)} kWh`}
                  </td>
                  <td className="px-6 py-4 text-right text-card-foreground tabular-nums">
                    {c.kilom != null ? `${fmt0(c.kilom as number)} km` : "—"}
                  </td>
                  <td className="px-6 py-4 text-right text-card-foreground tabular-nums">
                    {c.consoMoyenne != null ? `${fmt1(c.consoMoyenne as number)} kWh/100km` : "—"}
                  </td>
                  <td className="px-6 py-4 text-right text-card-foreground tabular-nums">
                    {c.co2 != null ? `${fmt1(((c.co2 as number)) / 1000)} t` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TablePagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />

      {/* Note quand > 100 collabs (vue plateforme globale) */}
      {collabs.length > 100 && Object.keys(kpisByCollab).length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground italic">
          Plus de 100 collaborateurs — les indicateurs Kilométrage / Consommation moyenne / CO₂ évité ne sont calculés qu'à partir d'une sélection d'entreprise pour éviter une avalanche de requêtes.
        </p>
      )}

      {/* ─── Dialogs ─── */}
      <CreateEntrepriseDialog
        open={showAddEntreprise}
        onClose={() => setShowAddEntreprise(false)}
        onCreated={() => {
          api.entreprises.list({ active_only: "true" })
            .then(d => setEntreprises(d.map((e: any) => ({ id: e.id, nom: e.nom }))))
            .catch(console.error);
          loadData();
        }}
      />
      <CreateFilialeDialog
        open={showAddFiliale}
        onClose={() => setShowAddFiliale(false)}
        onCreated={() => {
          const filter: Record<string, string> = { active_only: "true" };
          if (selectedEntreprise) filter.entreprise_id = selectedEntreprise;
          api.filiales.list(filter).then(setFiliales).catch(console.error);
          loadData();
        }}
        entrepriseId={selectedEntreprise || undefined}
        isSuperadmin
      />
      <CreateSiteDialog
        open={showAddSite}
        onClose={() => setShowAddSite(false)}
        onCreated={() => {
          const filter: Record<string, string> = { active_only: "true" };
          if (selectedFiliale) filter.filiale_id = selectedFiliale;
          else if (selectedEntreprise) filter.entreprise_id = selectedEntreprise;
          api.sites.list(filter).then(setSites).catch(console.error);
          loadData();
        }}
        filialeId={selectedFiliale || null}
        selectableFiliales={filiales}
      />
      {(selectedEntreprise || entreprises[0]?.id) && (
        <CreateCollaborateurDialog
          entrepriseId={selectedEntreprise || entreprises[0]?.id}
          open={showAddCollab}
          onClose={() => setShowAddCollab(false)}
          onCreated={loadData}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   2. GESTIONNAIRE ENTREPRISE — Vue entreprise complète
   ═══════════════════════════════════════════ */
function GestEntrepriseDashboard() {
  const { profile } = useAuth();
  const entrepriseId = profile?.entreprise_id || "";

  // ── Data ──────────────────────────────────────────────────────────
  const [entrepriseName, setEntrepriseName] = useState<string>("");
  const [collabs, setCollabs] = useState<any[]>([]);
  const [vehicules, setVehicules] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [filiales, setFiliales] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [kpisByCollab, setKpisByCollab] = useState<Record<string, { conso: number | null; co2: number | null; km: number | null }>>({});

  // ── KPI stats ─────────────────────────────────────────────────────
  const [stats, setStats] = useState({
    collaborateurs: 0, vehicules: 0,
    nbSessions: 0, nbSessionsDomicile: 0,
    energieTotal: 0, energieDomicile: 0, energieHorsDom: 0,
    coutRemboursable: 0,
  });

  // ── Filters ───────────────────────────────────────────────────────
  const [selectedFiliale, setSelectedFiliale] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [unit, setUnit] = useState<"kwh" | "eur">("kwh");
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  // ── UI ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [showAddCollab, setShowAddCollab] = useState(false);
  const [showAddFiliale, setShowAddFiliale] = useState(false);
  const [showAddSite, setShowAddSite] = useState(false);

  // Charge le nom de l'entreprise + les filiales au montage
  useEffect(() => {
    if (!entrepriseId) return;
    api.entreprises.get(entrepriseId).then(e => setEntrepriseName(e?.nom || "")).catch(() => {});
    api.filiales.list({ entreprise_id: entrepriseId }).then(setFiliales).catch(console.error);
  }, [entrepriseId]);

  // Recharge les sites quand la filiale sélectionnée change
  useEffect(() => {
    setSelectedSite("");
    if (!entrepriseId) return;
    const filter = selectedFiliale
      ? { filiale_id: selectedFiliale }
      : { entreprise_id: entrepriseId };
    api.sites.list(filter).then(setSites).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrepriseId, selectedFiliale]);

  // Recharge les données quand les filtres changent
  useEffect(() => {
    if (entrepriseId && isDateRangeValid(dateFrom, dateTo)) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrepriseId, selectedFiliale, selectedSite, dateFrom, dateTo]);

  // Refresh on window focus / data events
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
      // Construit le filtre selon le scope sélectionné
      const baseFilter: Record<string, string> = { entreprise_id: entrepriseId };
      if (selectedFiliale) baseFilter.filiale_id = selectedFiliale;
      if (selectedSite) baseFilter.site_id = selectedSite;

      const [collDataRaw, vehData, sessData] = await Promise.all([
        api.collaborateurs.list({ ...baseFilter, active_only: "true" }),
        api.vehicules.list(baseFilter),
        api.sessions.list(baseFilter),
      ]);

      // Filtre par date
      const fromTs = dateFrom + "T00:00:00";
      const toTs = dateTo + "T23:59:59";
      const dateFilteredSessions = sessData.filter((s: any) => {
        const d = s.date_session || s.date_debut;
        return d && d >= fromTs && d <= toTs;
      });

      // Cohérence KPI ↔ tableau : seulement les sessions des collaborateurs visibles
      const visibleCollabIds = new Set(collDataRaw.map((c: any) => c.id));
      const filteredSessions = dateFilteredSessions.filter((s: any) => visibleCollabIds.has(s.collaborateur_id));

      setCollabs(collDataRaw);
      setVehicules(vehData);
      setSessions(filteredSessions);

      const energieTotal = filteredSessions.reduce((a: number, s: any) => a + (s.energie_kwh || 0), 0);
      const energieDomicile = filteredSessions.filter((s: any) => s.is_domicile).reduce((a: number, s: any) => a + (s.energie_kwh || 0), 0);
      const energieHorsDom = filteredSessions.filter((s: any) => !s.is_domicile).reduce((a: number, s: any) => a + (s.energie_kwh || 0), 0);
      const coutRemboursable = filteredSessions.filter((s: any) => s.is_domicile).reduce((a: number, s: any) => a + (s.cout_euro || 0), 0);

      setStats({
        collaborateurs: collDataRaw.length,
        vehicules: vehData.length,
        nbSessions: filteredSessions.length,
        nbSessionsDomicile: filteredSessions.filter((s: any) => s.is_domicile).length,
        energieTotal,
        energieDomicile,
        energieHorsDom,
        coutRemboursable,
      });

      // KPIs individuels (conso / CO₂ / km) par collaborateur
      const kpisResults = await Promise.all(
        collDataRaw.map(async (c: any) => {
          try {
            const kpi = await apiFetch<any>(
              `/api/collaborateurs/${c.id}/kpis?date_from=${dateFrom}&date_to=${dateTo}T23:59:59`
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

  const filtered = collabs.filter(c =>
    !search || `${c.nom} ${c.prenom}`.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedCollabs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tableData = paginatedCollabs.map(c => {
    const cSessions = sessions.filter(s => s.collaborateur_id === c.id);
    const rechDomKwh  = cSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
    const rechDomEuro = cSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.cout_euro  || 0), 0);
    const rechHorsDomKwh  = cSessions.filter(s => !s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
    const rechHorsDomEuro = cSessions.filter(s => !s.is_domicile).reduce((a, s) => a + (s.cout_euro  || 0), 0);
    const kpi = kpisByCollab[c.id] || { conso: null, co2: null, km: null };
    const veh = vehicules.find((v: any) => v.collaborateur_id === c.id);
    return {
      id: c.id, prenom: c.prenom, nom: c.nom,
      immatriculation: veh?.immatriculation || null,
      rechDomKwh, rechDomEuro, rechHorsDomKwh, rechHorsDomEuro,
      kilom: kpi.km, consoMoyenne: kpi.conso, co2: kpi.co2,
    };
  });

  // Export Excel (toutes les lignes filtrées, pas seulement la page)
  function handleExport() {
    const rows = filtered.map(c => {
      const cSessions = sessions.filter(s => s.collaborateur_id === c.id);
      const rechDomKwh  = cSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
      const rechDomEuro = cSessions.filter(s => s.is_domicile).reduce((a, s) => a + (s.cout_euro  || 0), 0);
      const rechHorsDomKwh  = cSessions.filter(s => !s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0);
      const kpi = kpisByCollab[c.id] || { conso: null, co2: null, km: null };
      return {
        "Prénom": c.prenom, "Nom": c.nom,
        "Rech. Dom (kWh)": Number(rechDomKwh.toFixed(2)),
        "Rech. Dom (€)":   Number(rechDomEuro.toFixed(2)),
        "Rech. Hors (kWh)": Number(rechHorsDomKwh.toFixed(2)),
        "Km": kpi.km   != null ? Number((kpi.km   as number).toFixed(0)) : "—",
        "Conso. moy. (kWh/100km)": kpi.conso != null ? Number((kpi.conso as number).toFixed(1)) : "—",
        "CO₂ évité (kg)":  kpi.co2  != null ? Number((kpi.co2  as number).toFixed(0)) : "—",
      };
    });
    exportXLSX(`ChargiZ_Dashboard_${dateFrom}_${dateTo}`, rows, `Période ${dateFrom} → ${dateTo}`);
  }

  // Formatage des nombres (locale FR, espace comme séparateur de milliers)
  const fmt0 = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  const fmt1 = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmt2 = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-4 sm:p-6 md:p-8">

      {/* ──────────────────────────────────────────────────────────
          Barre supérieure : Entreprise / Date de / Date à / kWh/€ / Export
          ────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Entreprise */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-foreground/80">Entreprise</label>
          <select
            disabled
            value={entrepriseId}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none disabled:opacity-100 disabled:cursor-default"
          >
            <option value={entrepriseId}>{entrepriseName || "Toutes les entreprises"}</option>
          </select>
        </div>

        {/* Date de */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-foreground/80">Date de</label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={e => {
              const v = e.target.value;
              setDateFrom(v);
              if (v && dateTo && v > dateTo) setDateTo(v);
            }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-all hover:border-[#0f4b49]/40 focus:border-[#0f4b49] focus:ring-2 focus:ring-[#0f4b49]/20"
          />
        </div>

        {/* Date à */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-foreground/80">Date à</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={e => {
              const v = e.target.value;
              setDateTo(v);
              if (v && dateFrom && v < dateFrom) setDateFrom(v);
            }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-all hover:border-[#0f4b49]/40 focus:border-[#0f4b49] focus:ring-2 focus:ring-[#0f4b49]/20"
          />
        </div>

        {/* Toggle kWh / € */}
        <div className="ml-2 flex overflow-hidden rounded-lg border border-border bg-card">
          <button
            onClick={() => setUnit("kwh")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${unit === "kwh" ? "bg-chargiz-teal text-white" : "text-foreground hover:bg-muted"}`}
          >kWh</button>
          <button
            onClick={() => setUnit("eur")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${unit === "eur" ? "bg-chargiz-teal text-white" : "text-foreground hover:bg-muted"}`}
          >€</button>
        </div>

        {/* Export (à droite) */}
        <button
          onClick={handleExport}
          className="ml-auto flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          title="Télécharger un fichier Excel (.xlsx)"
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────
          5 KPI cards (mêmes dimensions que la page Statistiques)
          ────────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Nombre total sessions" value={fmt0(stats.nbSessions)}               icon={Zap}     iconClass="bg-violet-100 text-violet-600" />
        <KpiCard title="Sessions domicile"     value={fmt0(stats.nbSessionsDomicile)}       icon={Home}    iconClass="bg-emerald-100 text-emerald-600" />
        <KpiCard title="Énergie totale"        value={`${fmt1(stats.energieTotal)} kWh`}    icon={Battery} iconClass="bg-slate-200 text-slate-700" />
        <KpiCard title="Énergie domicile"      value={`${fmt1(stats.energieDomicile)} kWh`} icon={Battery} iconClass="bg-teal-100 text-teal-600" />
        <KpiCard title="Énergie hors domicile" value={`${fmt1(stats.energieHorsDom)} kWh`}  icon={MapPin}  iconClass="bg-orange-100 text-orange-600" />
      </div>

      {/* ──────────────────────────────────────────────────────────
          Ligne filtres + boutons d'action
          ────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={selectedFiliale}
          onChange={e => { setSelectedFiliale(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Filiale</option>
          {filiales.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
        </select>
        <select
          value={selectedSite}
          onChange={e => { setSelectedSite(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Site</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </select>

        <button
          onClick={() => setShowAddFiliale(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Plus className="h-4 w-4" /> Ajouter filiale
        </button>
        <button
          onClick={() => setShowAddSite(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Plus className="h-4 w-4" /> Ajouter site
        </button>
        <button
          onClick={() => setShowAddCollab(true)}
          className="flex items-center gap-1.5 rounded-lg bg-chargiz-lime px-4 py-2 text-sm font-semibold text-chargiz-teal-dark hover:brightness-95 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Ajouter collaborateur
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────
          Tableau des collaborateurs (sans en-tête de carte, sans Action)
          ────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="text-sm cz-table-collab" style={{ width: "100%" }}>
            <thead className="cz-table-head">
              <tr className="border-b border-border">
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground">Prénom</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground">Nom</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground">Immat.</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground">Recharge domicile</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground">Recharge hors domicile</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground">Kilométrage</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground">Consommation moyenne</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground">CO₂ évité</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">Aucun collaborateur trouvé</td></tr>
              ) : tableData.map(c => (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => { window.location.href = `/dashboard/collaborateur/${c.id}`; }}
                >
                  <td className="px-6 py-4 text-card-foreground">{c.prenom}</td>
                  <td className="px-6 py-4 text-card-foreground">{c.nom}</td>
                  <td className="px-6 py-4 text-card-foreground font-mono text-xs"><ImmatBadge value={c.immatriculation} /></td>
                  <td className="px-6 py-4 text-right text-card-foreground tabular-nums">
                    {unit === "kwh" ? `${fmt1(c.rechDomKwh)} kWh` : `${fmt2(c.rechDomEuro)} €`}
                  </td>
                  <td className="px-6 py-4 text-right text-card-foreground tabular-nums">
                    {`${fmt1(c.rechHorsDomKwh)} kWh`}
                  </td>
                  <td className="px-6 py-4 text-right text-card-foreground tabular-nums">
                    {c.kilom != null ? `${fmt0(c.kilom as number)} km` : "—"}
                  </td>
                  <td className="px-6 py-4 text-right text-card-foreground tabular-nums">
                    {c.consoMoyenne != null ? `${fmt1(c.consoMoyenne as number)} kWh/100km` : "—"}
                  </td>
                  <td className="px-6 py-4 text-right text-card-foreground tabular-nums">
                    {c.co2 != null ? `${fmt1(((c.co2 as number)) / 1000)} t` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TablePagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />

      {/* ─── Dialogs ─── */}
      {entrepriseId && (
        <CreateCollaborateurDialog
          entrepriseId={entrepriseId}
          open={showAddCollab}
          onClose={() => setShowAddCollab(false)}
          onCreated={loadData}
        />
      )}
      <CreateFilialeDialog
        open={showAddFiliale}
        onClose={() => setShowAddFiliale(false)}
        onCreated={() => {
          api.filiales.list({ entreprise_id: entrepriseId }).then(setFiliales).catch(console.error);
          loadData();
        }}
        entrepriseId={entrepriseId}
      />
      <CreateSiteDialog
        open={showAddSite}
        onClose={() => setShowAddSite(false)}
        onCreated={() => {
          const filter = selectedFiliale ? { filiale_id: selectedFiliale } : { entreprise_id: entrepriseId };
          api.sites.list(filter).then(setSites).catch(console.error);
          loadData();
        }}
        filialeId={selectedFiliale || null}
        selectableFiliales={filiales}
      />
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
        {/* Même design que la dashboard gestionnaire entreprise :
            cards blanches uniformes avec icône colorée en haut à gauche,
            label discret, valeur en gros tabular-nums (KpiCard partagé). */}
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            title="Sessions"
            value={stats.nbSessions.toLocaleString("fr-FR")}
            icon={Zap}
            iconClass="bg-violet-100 text-violet-600"
          />
          <KpiCard
            title="Énergie totale"
            value={`${stats.energieTotal.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh`}
            icon={Battery}
            iconClass="bg-slate-200 text-slate-700"
          />
          <KpiCard
            title="kWh domicile"
            value={`${stats.energieDomicile.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh`}
            icon={Home}
            iconClass="bg-emerald-100 text-emerald-600"
          />
          <KpiCard
            title="Remboursable"
            value={`${stats.coutRemboursable.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
            icon={Euro}
            iconClass="bg-chargiz-lime/30 text-chargiz-teal"
          />
          <KpiCard
            title="CO₂ évité"
            value={`${stats.co2Evite.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} kg`}
            icon={Leaf}
            iconClass="bg-teal-100 text-teal-600"
          />
          <KpiCard
            title="Km odomètre"
            value={stats.km > 0 ? `${stats.km.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} km` : "—"}
            icon={MapPin}
            iconClass="bg-orange-100 text-orange-600"
          />
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
