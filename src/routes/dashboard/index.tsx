import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
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
    case "collaborateur": return <ConducteurDashboard />;
    default: return <div className="p-8 text-muted-foreground">Rôle non reconnu.</div>;
  }
}

/* ═══════════════════════════════════════════
   1. SUPERADMIN — Vue plateforme globale
   ═══════════════════════════════════════════ */
function SuperAdminDashboard() {
  const [stats, setStats] = useState({ entreprises: 0, conducteurs: 0, vehicules: 0, sessions: 0, energie: 0 });
  const [entreprises, setEntreprises] = useState<{ id: string; nom: string; ville: string | null }[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [entData, collData, vehData, sessData] = await Promise.all([
        api.entreprises.list(),
        api.collaborateurs.list(),
        api.vehicules.list(),
        api.sessions.list(),
      ]);
      
      setEntreprises(entData);
      setRecentSessions(sessData.slice(0, 5));
      setStats({
        entreprises: entData.length,
        conducteurs: collData.length,
        vehicules: vehData.length,
        sessions: sessData.length,
        energie: sessData.reduce((acc, s) => acc + (s.energie_kwh || 0), 0),
      });
    } catch (err) {
      console.error("Error loading superadmin stats:", err);
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Plateforme ChargiZ</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vue globale multi-entreprises — SuperAdmin</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Entreprises" value={String(stats.entreprises)} icon={Building2} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
        <KpiCard title="Conducteurs" value={String(stats.conducteurs)} icon={Users} colorClass="bg-kpi-home/10 text-kpi-home" />
        <KpiCard title="Véhicules" value={String(stats.vehicules)} icon={Car} colorClass="bg-kpi-energy/10 text-kpi-energy" />
        <KpiCard title="Sessions" value={String(stats.sessions)} icon={Zap} colorClass="bg-kpi-sessions/10 text-kpi-sessions" />
        <KpiCard title="Énergie (kWh)" value={stats.energie.toFixed(0)} icon={Battery} colorClass="bg-chargiz-lime/20 text-chargiz-lime-dark" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-card-foreground">Entreprises</h3>
            <Link to="/dashboard/listes/entreprises" className="text-xs text-primary hover:underline font-medium">Tout voir</Link>
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

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-card-foreground">Sessions récentes</h3>
            <Link to="/dashboard/mes-consommations" className="text-xs text-primary hover:underline font-medium">Tout voir</Link>
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
                    <td className="px-6 py-3 text-card-foreground">{s.date_session ? new Date(s.date_session).toLocaleDateString("fr-FR") : "—"}</td>
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
    
    // km from odometer delta is complex without smartcar history, so we use dummy for now
    const kilom = cSessions.length * 50; 
    const consoMoyenne = kilom > 0 ? ((rechDomKwh + rechHorsDom) / kilom) * 100 : 0;
    const co2 = kilom * 0.146;

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
                  <td className="px-6 py-3 text-right text-card-foreground">{c.kilom.toFixed(0)}</td>
                  <td className="px-6 py-3 text-right text-card-foreground">{c.consoMoyenne.toFixed(1)}</td>
                  <td className="px-6 py-3 text-right text-card-foreground">{c.co2.toFixed(1)}</td>
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
      const [vehData, sessData] = await Promise.all([
        api.vehicules.list({ collaborateur_id: profile.id }),
        api.sessions.list({ collaborateur_id: profile.id }),
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
