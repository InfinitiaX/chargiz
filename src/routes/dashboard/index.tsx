import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import KpiCard from "@/components/KpiCard";
import CreateFilialeDialog from "@/components/CreateFilialeDialog";
import CreateSiteDialog from "@/components/CreateSiteDialog";
import CreateCollaborateurDialog from "@/components/CreateCollaborateurDialog";
import { Link } from "@tanstack/react-router";
import { Zap, Battery, Home, MapPin, Calendar, Plus, Download, Search } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
  head: () => ({
    meta: [
      { title: "ChargiZ — Accueil" },
      { name: "description", content: "Vue d'ensemble de vos recharges de véhicules électriques." },
    ],
  }),
});

interface CollabRow {
  id: string;
  nom: string;
  prenom: string;
  entreprise_id: string | null;
  filiale_id: string | null;
  site_id: string | null;
}

interface SessionRow {
  collaborateur_id: string;
  energie_kwh: number;
  is_domicile: boolean;
  cout_euro: number;
  kilometrage: number;
}

function DashboardHome() {
  const { profile } = useAuth();
  const entrepriseId = profile?.entreprise_id || "";
  const [collaborateurs, setCollaborateurs] = useState<CollabRow[]>([]);
  const [vehiculeMap, setVehiculeMap] = useState<Record<string, string>>({});
  const [filiales, setFiliales] = useState<{ id: string; nom: string }[]>([]);
  const [sites, setSites] = useState<{ id: string; nom: string }[]>([]);
  const [filterFiliale, setFilterFiliale] = useState("");
  const [filterSite, setFilterSite] = useState("");
  const [search, setSearch] = useState("");
  const [showAddFiliale, setShowAddFiliale] = useState(false);
  const [showAddSite, setShowAddSite] = useState(false);
  const [showAddCollab, setShowAddCollab] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!entrepriseId) return;
    loadData();
  }, [entrepriseId, filterFiliale, filterSite, dateFrom, dateTo]);

  async function loadData() {
    const { data: fil } = await supabase.from("filiales").select("id, nom").eq("entreprise_id", entrepriseId);
    if (fil) setFiliales(fil);

    let sitesQuery = supabase.from("sites").select("id, nom, filiale_id");
    if (filterFiliale) sitesQuery = sitesQuery.eq("filiale_id", filterFiliale);
    const { data: sit } = await sitesQuery;
    if (sit) setSites(sit);

    let collabQuery = supabase.from("profiles").select("id, nom, prenom, entreprise_id, filiale_id, site_id").eq("entreprise_id", entrepriseId).eq("is_active", true);
    if (filterFiliale) collabQuery = collabQuery.eq("filiale_id", filterFiliale);
    if (filterSite) collabQuery = collabQuery.eq("site_id", filterSite);
    const { data: collabs } = await collabQuery;
    if (collabs) {
      setCollaborateurs(collabs);
      // Load vehicule immatriculations for each collaborateur
      const collabIds = collabs.map(c => c.id);
      if (collabIds.length > 0) {
        const { data: vehs } = await supabase.from("vehicules").select("collaborateur_id, immatriculation").in("collaborateur_id", collabIds);
        const map: Record<string, string> = {};
        if (vehs) vehs.forEach(v => { if (v.collaborateur_id && v.immatriculation) map[v.collaborateur_id] = v.immatriculation; });
        setVehiculeMap(map);
      }
    }

    const { data: sess } = await supabase.from("sessions_recharge").select("collaborateur_id, energie_kwh, is_domicile, cout_euro, kilometrage")
      .eq("entreprise_id", entrepriseId)
      .gte("date_debut", dateFrom)
      .lte("date_debut", dateTo + "T23:59:59");
    if (sess) setSessions(sess.map(s => ({ collaborateur_id: s.collaborateur_id, energie_kwh: s.energie_kwh ?? 0, is_domicile: s.is_domicile ?? false, cout_euro: s.cout_euro ?? 0, kilometrage: s.kilometrage ?? 0 })));
  }

  const totalSessions = sessions.length;
  const sessionsDomicile = sessions.filter(s => s.is_domicile).length;
  const energieTotal = sessions.reduce((a, s) => a + s.energie_kwh, 0);
  const energieDomicile = sessions.filter(s => s.is_domicile).reduce((a, s) => a + s.energie_kwh, 0);
  const energieHors = sessions.filter(s => !s.is_domicile).reduce((a, s) => a + s.energie_kwh, 0);

  const filteredCollabs = collaborateurs.filter(c =>
    !search || `${c.nom} ${c.prenom}`.toLowerCase().includes(search.toLowerCase())
  );

  const getCollabStats = (collabId: string) => {
    const cs = sessions.filter(s => s.collaborateur_id === collabId);
    const domKwh = cs.filter(s => s.is_domicile).reduce((a, s) => a + s.energie_kwh, 0);
    const domEur = cs.filter(s => s.is_domicile).reduce((a, s) => a + s.cout_euro, 0);
    const horsKwh = cs.filter(s => !s.is_domicile).reduce((a, s) => a + s.energie_kwh, 0);
    const km = cs.reduce((a, s) => a + s.kilometrage, 0);
    const totalE = domKwh + horsKwh;
    const consoMoy = km > 0 ? (totalE / km * 100) : 0;
    // CO₂ évité = km × (0.193 thermique − 0.047 EV) kgCO₂/km
    const co2 = km > 0 ? km * (0.193 - 0.047) : 0;
    return { domKwh, domEur, horsKwh, km, consoMoy, co2 };
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Accueil</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vue d'ensemble de l'activité de recharge</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-transparent text-xs outline-none" />
            <span className="text-xs">→</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-transparent text-xs outline-none" />
          </div>
          <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            <Download className="h-4 w-4" /> Export XLS
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Sessions totales" value={String(totalSessions)} icon={Zap} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
        <KpiCard title="Sessions domicile" value={String(sessionsDomicile)} icon={Home} colorClass="bg-kpi-home/10 text-kpi-home" />
        <KpiCard title="Énergie totale" value={`${energieTotal.toFixed(0)} kWh`} icon={Battery} colorClass="bg-kpi-energy/10 text-kpi-energy" />
        <KpiCard title="Énergie domicile" value={`${energieDomicile.toFixed(0)} kWh`} icon={Home} colorClass="bg-kpi-home/10 text-kpi-home" />
        <KpiCard title="Énergie hors domicile" value={`${energieHors.toFixed(0)} kWh`} icon={MapPin} colorClass="bg-kpi-away/10 text-kpi-away" />
      </div>

      {/* Actions & Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button onClick={() => setShowAddCollab(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
          <Plus className="h-4 w-4" /> Ajouter collaborateur
        </button>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
              className="rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 w-56" />
          </div>
          <select value={filterFiliale} onChange={e => { setFilterFiliale(e.target.value); setFilterSite(""); }}
            className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary">
            <option value="">Toutes filiales</option>
            {filiales.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
          <select value={filterSite} onChange={e => setFilterSite(e.target.value)}
            className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary">
            <option value="">Tous sites</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        </div>
      </div>

      {/* Collaborateurs Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-card-foreground">Collaborateurs</h3>
          <span className="text-sm text-muted-foreground">{filteredCollabs.length} résultats</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Prénom Nom</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Immat</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Dom. (kWh)</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Dom. (€)</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Hors dom. (kWh)</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Km</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Conso moy.</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">CO₂ évité</th>
              </tr>
            </thead>
            <tbody>
              {filteredCollabs.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Aucun collaborateur trouvé</td></tr>
              ) : filteredCollabs.map(c => {
                const stats = getCollabStats(c.id);
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <Link to="/dashboard/collaborateurs/$id" params={{ id: c.id }} className="font-medium text-card-foreground hover:text-primary">
                        {c.prenom} {c.nom}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-card-foreground">{vehiculeMap[c.id] || "—"}</td>
                    <td className="px-6 py-4 text-right text-card-foreground">{stats.domKwh.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-card-foreground">{stats.domEur.toFixed(2)} €</td>
                    <td className="px-6 py-4 text-right text-card-foreground">{stats.horsKwh.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-card-foreground">{stats.km.toFixed(1)}</td>
                    <td className="px-6 py-4 text-right text-card-foreground">{stats.km > 0 ? stats.consoMoy.toFixed(1) : "—"}</td>
                    <td className="px-6 py-4 text-right text-card-foreground">{stats.km > 0 ? `${stats.co2.toFixed(1)} kg` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      {entrepriseId && (
        <>
          <CreateFilialeDialog entrepriseId={entrepriseId} open={showAddFiliale} onClose={() => setShowAddFiliale(false)} onCreated={loadData} />
          <CreateSiteDialog entrepriseId={entrepriseId} open={showAddSite} onClose={() => setShowAddSite(false)} onCreated={loadData} />
          <CreateCollaborateurDialog entrepriseId={entrepriseId} open={showAddCollab} onClose={() => setShowAddCollab(false)} onCreated={loadData} />
        </>
      )}
    </div>
  );
}
