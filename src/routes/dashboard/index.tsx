import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import KpiCard from "@/components/KpiCard";
import CreateCollaborateurDialog from "@/components/CreateCollaborateurDialog";
import { Link } from "@tanstack/react-router";
import { Zap, Battery, Home, MapPin, Calendar, Plus, Download, Search, Users, Car, Building2, Euro, AlertTriangle, TrendingUp, Leaf } from "lucide-react";

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
    case "admin": return <AdminDashboard />;
    case "gestionnaire_entreprise": return <GestEntrepriseDashboard />;
    case "gestionnaire_filiale": return <GestFilialeDashboard />;
    case "gestionnaire_site": return <GestSiteDashboard />;
    case "collaborateur": return <ConducteurDashboard />;
    default: return <div className="p-8 text-muted-foreground">Rôle non reconnu.</div>;
  }
}

/* ═══════════════════════════════════════════
   1. SUPERADMIN — Vue plateforme globale
   ═══════════════════════════════════════════ */
function SuperAdminDashboard() {
  const [stats, setStats] = useState({ entreprises: 0, filiales: 0, sites: 0, conducteurs: 0, vehicules: 0, sessions: 0, energie: 0 });
  const [entreprises, setEntreprises] = useState<{ id: string; nom: string; ville: string | null }[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [ent, fil, sit, cond, veh, sess] = await Promise.all([
      supabase.from("entreprises").select("id, nom, ville"),
      supabase.from("filiales").select("id", { count: "exact" }),
      supabase.from("sites").select("id", { count: "exact" }),
      supabase.from("profiles").select("id", { count: "exact" }).eq("is_active", true),
      supabase.from("vehicules").select("id", { count: "exact" }),
      supabase.from("sessions_recharge").select("id, date_debut, energie_kwh, cout_euro, collaborateur_id, entreprise_id").order("date_debut", { ascending: false }).limit(10),
    ]);
    if (ent.data) setEntreprises(ent.data);
    const sessData = sess.data || [];
    setStats({
      entreprises: ent.data?.length || 0,
      filiales: fil.count || 0,
      sites: sit.count || 0,
      conducteurs: cond.count || 0,
      vehicules: veh.count || 0,
      sessions: sessData.length,
      energie: sessData.reduce((a, s) => a + (s.energie_kwh || 0), 0),
    });
    setRecentSessions(sessData);
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Plateforme ChargiZ</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vue globale multi-entreprises — SuperAdmin</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard title="Entreprises" value={String(stats.entreprises)} icon={Building2} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
        <KpiCard title="Filiales" value={String(stats.filiales)} icon={Building2} colorClass="bg-kpi-energy/10 text-kpi-energy" />
        <KpiCard title="Sites" value={String(stats.sites)} icon={MapPin} colorClass="bg-kpi-away/10 text-kpi-away" />
        <KpiCard title="Conducteurs" value={String(stats.conducteurs)} icon={Users} colorClass="bg-kpi-home/10 text-kpi-home" />
        <KpiCard title="Véhicules" value={String(stats.vehicules)} icon={Car} colorClass="bg-kpi-energy/10 text-kpi-energy" />
        <KpiCard title="Sessions récentes" value={String(stats.sessions)} icon={Zap} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
        <KpiCard title="Énergie (kWh)" value={stats.energie.toFixed(0)} icon={Battery} colorClass="bg-chargiz-lime/20 text-chargiz-lime-dark" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Activité par entreprise */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-lg font-semibold text-card-foreground">Entreprises</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Nom</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Ville</th>
              </tr></thead>
              <tbody>
                {entreprises.map(e => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 font-medium text-card-foreground">{e.nom}</td>
                    <td className="px-6 py-3 text-card-foreground">{e.ville || "—"}</td>
                  </tr>
                ))}
                {entreprises.length === 0 && <tr><td colSpan={2} className="px-6 py-8 text-center text-muted-foreground">Aucune entreprise</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sessions récentes toutes entreprises */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-lg font-semibold text-card-foreground">Sessions récentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">kWh</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Coût</th>
              </tr></thead>
              <tbody>
                {recentSessions.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 text-card-foreground">{s.date_debut ? new Date(s.date_debut).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{(s.energie_kwh || 0).toFixed(1)}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{(s.cout_euro || 0).toFixed(2)} €</td>
                  </tr>
                ))}
                {recentSessions.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">Aucune session</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   2. ADMIN — Supervision entreprises
   ═══════════════════════════════════════════ */
function AdminDashboard() {
  const [stats, setStats] = useState({ filiales: 0, sites: 0, conducteurs: 0, vehicules: 0, energieTotal: 0 });
  const [entreprises, setEntreprises] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [ent, fil, sit, cond, veh, sess] = await Promise.all([
      supabase.from("entreprises").select("id, nom, ville"),
      supabase.from("filiales").select("id", { count: "exact" }),
      supabase.from("sites").select("id", { count: "exact" }),
      supabase.from("profiles").select("id", { count: "exact" }).eq("is_active", true),
      supabase.from("vehicules").select("id", { count: "exact" }),
      supabase.from("sessions_recharge").select("energie_kwh"),
    ]);
    if (ent.data) setEntreprises(ent.data);
    setStats({
      filiales: fil.count || 0,
      sites: sit.count || 0,
      conducteurs: cond.count || 0,
      vehicules: veh.count || 0,
      energieTotal: (sess.data || []).reduce((a, s) => a + (s.energie_kwh || 0), 0),
    });
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Supervision</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tableau comparatif — filiales, sites, conducteurs, énergie par entreprise</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Filiales" value={String(stats.filiales)} icon={Building2} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
        <KpiCard title="Sites" value={String(stats.sites)} icon={MapPin} colorClass="bg-kpi-away/10 text-kpi-away" />
        <KpiCard title="Conducteurs" value={String(stats.conducteurs)} icon={Users} colorClass="bg-kpi-home/10 text-kpi-home" />
        <KpiCard title="Véhicules" value={String(stats.vehicules)} icon={Car} colorClass="bg-kpi-energy/10 text-kpi-energy" />
        <KpiCard title="Énergie totale" value={`${stats.energieTotal.toFixed(0)} kWh`} icon={Zap} colorClass="bg-chargiz-lime/20 text-chargiz-lime-dark" />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-card-foreground">Entreprises supervisées</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Entreprise</th>
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Ville</th>
            </tr></thead>
            <tbody>
              {entreprises.map(e => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-6 py-3 font-medium text-card-foreground">{e.nom}</td>
                  <td className="px-6 py-3 text-card-foreground">{e.ville || "—"}</td>
                </tr>
              ))}
              {entreprises.length === 0 && <tr><td colSpan={2} className="px-6 py-8 text-center text-muted-foreground">Aucune entreprise</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   3. GESTIONNAIRE ENTREPRISE — Vue entreprise complète
   ═══════════════════════════════════════════ */
function GestEntrepriseDashboard() {
  const { profile } = useAuth();
  const entrepriseId = profile?.entreprise_id || "";
  const [stats, setStats] = useState({ filiales: 0, sites: 0, collaborateurs: 0, energieTotal: 0, co2Evite: 0, coutRemboursable: 0 });
  const [collabs, setCollabs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showAddCollab, setShowAddCollab] = useState(false);

  useEffect(() => { if (entrepriseId) loadData(); }, [entrepriseId]);

  async function loadData() {
    const [fil, sit, coll, sess] = await Promise.all([
      supabase.from("filiales").select("id", { count: "exact" }).eq("entreprise_id", entrepriseId),
      supabase.from("sites").select("id, filiale_id").then(r => {
        // filter sites belonging to our filiales
        return r;
      }),
      supabase.from("profiles").select("id, nom, prenom, filiale_id, site_id").eq("entreprise_id", entrepriseId).eq("is_active", true),
      supabase.from("sessions_recharge").select("energie_kwh, cout_euro, co2_evite, is_domicile, kilometrage").eq("entreprise_id", entrepriseId),
    ]);
    const sessData = sess.data || [];
    const km = sessData.reduce((a, s) => a + (s.kilometrage || 0), 0);
    setStats({
      filiales: fil.count || 0,
      sites: sit.data?.length || 0,
      collaborateurs: coll.data?.length || 0,
      energieTotal: sessData.reduce((a, s) => a + (s.energie_kwh || 0), 0),
      co2Evite: km * 0.146,
      coutRemboursable: sessData.filter(s => s.is_domicile).reduce((a, s) => a + (s.cout_euro || 0), 0),
    });
    if (coll.data) setCollabs(coll.data);
  }

  const filtered = collabs.filter(c => !search || `${c.nom} ${c.prenom}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Mon entreprise</h1>
        <p className="mt-1 text-sm text-muted-foreground">Filiales, sites, collaborateurs, CO₂ évité, remboursements</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="Filiales" value={String(stats.filiales)} icon={Building2} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
        <KpiCard title="Sites" value={String(stats.sites)} icon={MapPin} colorClass="bg-kpi-away/10 text-kpi-away" />
        <KpiCard title="Collaborateurs" value={String(stats.collaborateurs)} icon={Users} colorClass="bg-kpi-home/10 text-kpi-home" />
        <KpiCard title="Énergie totale" value={`${stats.energieTotal.toFixed(0)} kWh`} icon={Zap} colorClass="bg-kpi-energy/10 text-kpi-energy" />
        <KpiCard title="CO₂ évité" value={`${stats.co2Evite.toFixed(0)} kg`} icon={Leaf} colorClass="bg-chargiz-lime/20 text-chargiz-lime-dark" />
        <KpiCard title="Remboursements" value={`${stats.coutRemboursable.toFixed(0)} €`} icon={Euro} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => setShowAddCollab(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-95">
          <Plus className="h-4 w-4" /> Ajouter collaborateur
        </button>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            className="rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 w-56" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4"><h3 className="text-lg font-semibold text-card-foreground">Collaborateurs ({filtered.length})</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Nom</th>
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Prénom</th>
            </tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-6 py-3 font-medium text-card-foreground">{c.nom}</td>
                  <td className="px-6 py-3 text-card-foreground">{c.prenom}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={2} className="px-6 py-8 text-center text-muted-foreground">Aucun collaborateur</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {entrepriseId && <CreateCollaborateurDialog entrepriseId={entrepriseId} open={showAddCollab} onClose={() => setShowAddCollab(false)} onCreated={loadData} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   4. GESTIONNAIRE FILIALE — Vue filiale restreinte
   ═══════════════════════════════════════════ */
function GestFilialeDashboard() {
  const { profile } = useAuth();
  const filialeId = profile?.filiale_id || "";
  const [sites, setSites] = useState<any[]>([]);
  const [collabs, setCollabs] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => { if (filialeId) loadData(); }, [filialeId]);

  async function loadData() {
    const [sit, coll] = await Promise.all([
      supabase.from("sites").select("id, nom, ville").eq("filiale_id", filialeId),
      supabase.from("profiles").select("id, nom, prenom, site_id").eq("filiale_id", filialeId).eq("is_active", true),
    ]);
    if (sit.data) setSites(sit.data);
    if (coll.data) setCollabs(coll.data);

    if (profile?.entreprise_id) {
      const { data: sess } = await supabase.from("sessions_recharge").select("id, date_debut, energie_kwh, cout_euro, collaborateur_id")
        .eq("entreprise_id", profile.entreprise_id).order("date_debut", { ascending: false }).limit(10);
      // Filter to only collabs in this filiale
      const collabIds = new Set((coll.data || []).map(c => c.id));
      setRecentSessions((sess || []).filter(s => collabIds.has(s.collaborateur_id)));
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Ma filiale</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sites, collaborateurs par site, sessions récentes</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard title="Sites" value={String(sites.length)} icon={MapPin} colorClass="bg-kpi-away/10 text-kpi-away" />
        <KpiCard title="Collaborateurs" value={String(collabs.length)} icon={Users} colorClass="bg-kpi-home/10 text-kpi-home" />
        <KpiCard title="Sessions récentes" value={String(recentSessions.length)} icon={Zap} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4"><h3 className="text-lg font-semibold text-card-foreground">Sites de la filiale</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Nom</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Ville</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Collaborateurs</th>
              </tr></thead>
              <tbody>
                {sites.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 font-medium text-card-foreground">{s.nom}</td>
                    <td className="px-6 py-3 text-card-foreground">{s.ville || "—"}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{collabs.filter(c => c.site_id === s.id).length}</td>
                  </tr>
                ))}
                {sites.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">Aucun site</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4"><h3 className="text-lg font-semibold text-card-foreground">Sessions récentes</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">kWh</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Coût</th>
              </tr></thead>
              <tbody>
                {recentSessions.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 text-card-foreground">{s.date_debut ? new Date(s.date_debut).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{(s.energie_kwh || 0).toFixed(1)}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{(s.cout_euro || 0).toFixed(2)} €</td>
                  </tr>
                ))}
                {recentSessions.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">Aucune session</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   5. GESTIONNAIRE SITE — Vue site restreinte
   ═══════════════════════════════════════════ */
function GestSiteDashboard() {
  const { profile } = useAuth();
  const siteId = profile?.site_id || "";
  const [conducteurs, setConducteurs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [coutTotal, setCoutTotal] = useState(0);

  useEffect(() => { if (siteId) loadData(); }, [siteId]);

  async function loadData() {
    const { data: coll } = await supabase.from("profiles").select("id, nom, prenom").eq("site_id", siteId).eq("is_active", true);
    if (coll) setConducteurs(coll);

    const collabIds = (coll || []).map(c => c.id);
    if (collabIds.length > 0 && profile?.entreprise_id) {
      const { data: sess } = await supabase.from("sessions_recharge")
        .select("id, date_debut, energie_kwh, cout_euro, soc_debut, soc_fin, collaborateur_id")
        .eq("entreprise_id", profile.entreprise_id)
        .in("collaborateur_id", collabIds)
        .order("date_debut", { ascending: false }).limit(20);
      if (sess) {
        setSessions(sess);
        setCoutTotal(sess.reduce((a, s) => a + (s.cout_euro || 0), 0));
      }
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Mon site</h1>
        <p className="mt-1 text-sm text-muted-foreground">Conducteurs, sessions SOC début/fin, résumé financier</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard title="Conducteurs" value={String(conducteurs.length)} icon={Users} colorClass="bg-kpi-home/10 text-kpi-home" />
        <KpiCard title="Sessions" value={String(sessions.length)} icon={Zap} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
        <KpiCard title="Coût total" value={`${coutTotal.toFixed(2)} €`} icon={Euro} colorClass="bg-chargiz-lime/20 text-chargiz-lime-dark" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4"><h3 className="text-lg font-semibold text-card-foreground">Conducteurs du site</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Nom</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Prénom</th>
              </tr></thead>
              <tbody>
                {conducteurs.map(c => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 font-medium text-card-foreground">{c.nom}</td>
                    <td className="px-6 py-3 text-card-foreground">{c.prenom}</td>
                  </tr>
                ))}
                {conducteurs.length === 0 && <tr><td colSpan={2} className="px-6 py-8 text-center text-muted-foreground">Aucun conducteur</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4"><h3 className="text-lg font-semibold text-card-foreground">Sessions récentes</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">SOC début</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">SOC fin</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">kWh</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Coût</th>
              </tr></thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 text-card-foreground">{s.date_debut ? new Date(s.date_debut).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{s.soc_debut != null ? `${s.soc_debut}%` : "—"}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{s.soc_fin != null ? `${s.soc_fin}%` : "—"}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{(s.energie_kwh || 0).toFixed(1)}</td>
                    <td className="px-6 py-3 text-right text-card-foreground">{(s.cout_euro || 0).toFixed(2)} €</td>
                  </tr>
                ))}
                {sessions.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Aucune session</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   6. CONDUCTEUR — Dashboard personnel
   ═══════════════════════════════════════════ */
function ConducteurDashboard() {
  const { profile } = useAuth();
  const [vehicule, setVehicule] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState({ energieTotal: 0, coutTotal: 0, energieDomicile: 0, coutRemboursable: 0, co2Evite: 0, km: 0, nbSessions: 0 });

  useEffect(() => { if (profile) loadData(); }, [profile]);

  async function loadData() {
    if (!profile) return;
    const [veh, sess] = await Promise.all([
      supabase.from("vehicules").select("*").eq("collaborateur_id", profile.id).limit(1).maybeSingle(),
      supabase.from("sessions_recharge").select("id, date_debut, energie_kwh, cout_euro, kilometrage, soc_debut, soc_fin, is_domicile")
        .eq("collaborateur_id", profile.id).order("date_debut", { ascending: false }).limit(20),
    ]);
    if (veh.data) setVehicule(veh.data);
    const sessData = sess.data || [];
    setSessions(sessData);
    const km = sessData.reduce((a, s) => a + (s.kilometrage || 0), 0);
    setStats({
      energieTotal: sessData.reduce((a, s) => a + (s.energie_kwh || 0), 0),
      coutTotal: sessData.reduce((a, s) => a + (s.cout_euro || 0), 0),
      energieDomicile: sessData.filter(s => s.is_domicile).reduce((a, s) => a + (s.energie_kwh || 0), 0),
      coutRemboursable: sessData.filter(s => s.is_domicile).reduce((a, s) => a + (s.cout_euro || 0), 0),
      co2Evite: km * 0.146,
      km,
      nbSessions: sessData.length,
    });
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
          <div className="border-b border-border px-6 py-4"><h3 className="text-lg font-semibold text-card-foreground">Mon véhicule</h3></div>
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
              <p className="text-sm text-muted-foreground">Aucun véhicule affecté.</p>
            )}
          </div>
        </div>

        {/* Dernières recharges */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4"><h3 className="text-lg font-semibold text-card-foreground">Dernières recharges</h3></div>
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
                    <td className="px-6 py-3 text-card-foreground">{s.date_debut ? new Date(s.date_debut).toLocaleDateString("fr-FR") : "—"}</td>
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
