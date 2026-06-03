import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft, Car, User, History, Building2, Zap, Gauge, ShieldCheck, ShieldAlert,
  Archive, ArchiveRestore, Unlink, Power, AlertTriangle, CheckCircle2, Loader2, Battery, ChevronRight, Info, Check,
} from "lucide-react";
import { api, apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import VehicleDetachDialog from "@/components/VehicleDetachDialog";
import SuspendSubscriptionDialog from "@/components/SuspendSubscriptionDialog";
import PageSkeleton from "@/components/PageSkeleton";
import SectionHeader from "@/components/SectionHeader";
import EntityAuditHistory from "@/components/EntityAuditHistory";

export const Route = createFileRoute("/dashboard/listes/vehicules/$vehiculeId")({
  component: FicheVehicule,
  head: () => ({ meta: [{ title: "ChargiZ — Fiche véhicule" }] }),
});

interface Vehicule {
  id: string;
  marque: string | null;
  modele: string | null;
  vin: string | null;
  immatriculation: string | null;
  capacite_batterie: number | null;
  kilometrage: number | null;
  type_smartcar: string | null;
  statut_smartcar: string;
  statut_affectation: string;
  collaborateur_id: string | null;
  entreprise_id: string;
}

interface BatteryInfo {
  capacite_batterie_retenue: number | null;
  capacite_batterie_smartcar: number | null;
  ecart_kwh: number | null;
  source: string | null;
  type_smartcar: string | null;
  seuil_tolerance_kwh: number;
}

interface HistoEntry {
  id: string;
  collaborateur_id: string | null;
  collaborateur_nom: string;
  date_affectation: string | null;
  date_fin: string | null;
}

interface Session {
  id: string;
  date_session: string;
  collaborateur_nom: string | null;
  energie_kwh: number;
  cout_euro: number;
  kilometrage: number | null;
  is_domicile: boolean;
}

function FicheVehicule() {
  const { vehiculeId } = Route.useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const canManage = ["superadmin", "admin", "gestionnaire_entreprise", "gestionnaire_filiale"].includes(role || "");
  const canSuspend = ["superadmin", "admin", "gestionnaire_entreprise"].includes(role || "");
  const canArchive = canSuspend;

  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [collab, setCollab] = useState<any>(null);
  const [entreprise, setEntreprise] = useState<any>(null);
  const [battery, setBattery] = useState<BatteryInfo | null>(null);
  const [historique, setHistorique] = useState<HistoEntry[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [showDetach, setShowDetach] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);
  const [showReactivate, setShowReactivate] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadData(); }, [vehiculeId]);

  async function loadData() {
    setLoading(true);
    try {
      const v = await apiFetch<Vehicule>(`/api/vehicules/${vehiculeId}`);
      setVehicule(v);
      const [b, h, s] = await Promise.all([
        api.vehicules_actions.batteryInfo(vehiculeId).catch(() => null),
        api.vehicules_actions.historique(vehiculeId).catch(() => ({ historique: [] })),
        api.vehicules_actions.sessions(vehiculeId).catch(() => ({ sessions: [] })),
      ]);
      setBattery(b);
      setHistorique(h.historique || []);
      setSessions(s.sessions || []);

      if (v.collaborateur_id) {
        apiFetch<any>(`/api/collaborateurs/${v.collaborateur_id}`).then(setCollab).catch(() => {});
      } else {
        setCollab(null);
      }
      if (role === "superadmin") {
        apiFetch<any>(`/api/entreprises/${v.entreprise_id}`).then(setEntreprise).catch(() => {});
      }
    } catch (err: any) {
      toast.error("Impossible de charger la fiche", { description: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleDetach(continuer: boolean) {
    setActionLoading(true);
    try {
      await api.vehicules_actions.detacher(vehiculeId, continuer);
      toast.success("Véhicule détaché", {
        description: continuer ? "Abonnement maintenu." : "Abonnement suspendu — frais de réactivation à prévoir.",
      });
      setShowDetach(false);
      loadData();
    } catch (err: any) {
      toast.error("Échec du détachement", { description: err.message });
    } finally { setActionLoading(false); }
  }

  async function handleSuspend() {
    setActionLoading(true);
    try {
      await api.vehicules_actions.suspendre(vehiculeId);
      toast.success("Abonnement suspendu", { description: "Email de notification envoyé." });
      setShowSuspend(false);
      loadData();
    } catch (err: any) {
      toast.error("Suspension impossible", { description: err.message });
    } finally { setActionLoading(false); }
  }

  async function handleReactivate() {
    setActionLoading(true);
    try {
      await api.vehicules_actions.reactiver(vehiculeId);
      toast.success("Abonnement réactivé", { description: "Email de notification envoyé." });
      setShowReactivate(false);
      loadData();
    } catch (err: any) {
      toast.error("Réactivation impossible", { description: err.message });
    } finally { setActionLoading(false); }
  }

  async function handleArchiveToggle() {
    setActionLoading(true);
    try {
      if (vehicule?.statut_affectation === "archive") {
        await api.vehicules_actions.desarchiver(vehiculeId);
        toast.success("Véhicule désarchivé");
      } else {
        await api.vehicules_actions.archiver(vehiculeId);
        toast.success("Véhicule archivé");
      }
      loadData();
    } catch (err: any) {
      toast.error("Action impossible", { description: err.message });
    } finally { setActionLoading(false); }
  }

  if (loading || !vehicule) return <PageSkeleton kpiCount={4} rowCount={8} />;

  const veh_label = `${vehicule.marque || ""} ${vehicule.modele || ""}`.trim() || "Véhicule";
  const isArchived = vehicule.statut_affectation === "archive";
  const isSuspended = vehicule.statut_smartcar === "suspendu";
  const isConnected = vehicule.statut_smartcar === "connecte";

  // Badges
  const SmartcarBadge = () => {
    const config = isConnected
      ? { label: "Connecté", cls: "bg-chargiz-teal/10 text-chargiz-teal", dot: "bg-chargiz-teal" }
      : isSuspended
      ? { label: "Suspendu", cls: "bg-amber-500/10 text-amber-600", dot: "bg-amber-500" }
      : { label: "Déconnecté", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.cls}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
        Smartcar : {config.label}
      </span>
    );
  };

  const AffectationBadge = () => {
    const cfg = isArchived
      ? { label: "Archivé", cls: "bg-muted text-muted-foreground" }
      : vehicule.statut_affectation === "affecte"
      ? { label: "Affecté", cls: "bg-chargiz-teal/10 text-chargiz-teal" }
      : { label: "Non affecté", cls: "bg-kpi-sessions/10 text-kpi-sessions" };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <Link to="/dashboard/listes/vehicules" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
        <ArrowLeft className="h-3 w-3" /> Retour à la liste
      </Link>

      <div className="mb-6 md:mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Car className="h-6 w-6 text-primary" />
            {veh_label}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <AffectationBadge />
            <SmartcarBadge />
            {vehicule.immatriculation && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-mono">
                {vehicule.immatriculation}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {canManage && !isArchived && vehicule.collaborateur_id && (
            <button onClick={() => setShowDetach(true)} disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-500/10 disabled:opacity-40">
              <Unlink className="h-3.5 w-3.5" /> Détacher
            </button>
          )}
          {canSuspend && !isArchived && isConnected && (
            <button onClick={() => setShowSuspend(true)} disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-500/10 disabled:opacity-40">
              <ShieldAlert className="h-3.5 w-3.5" /> Suspendre
            </button>
          )}
          {canSuspend && !isArchived && isSuspended && (
            <button onClick={() => setShowReactivate(true)} disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-lg border border-chargiz-teal/30 bg-chargiz-teal/5 px-3 py-2 text-xs font-medium text-chargiz-teal hover:bg-chargiz-teal/10 disabled:opacity-40">
              <Power className="h-3.5 w-3.5" /> Réactiver
            </button>
          )}
          {canArchive && (
            <button onClick={handleArchiveToggle} disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-40">
              {isArchived ? <><ArchiveRestore className="h-3.5 w-3.5" /> Désarchiver</> : <><Archive className="h-3.5 w-3.5" /> Archiver</>}
            </button>
          )}
        </div>
      </div>

      {/* Bloc Informations véhicule */}
      <SectionHeader>Informations véhicule</SectionHeader>
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <dl className="space-y-2.5 text-sm">
            <div className="grid grid-cols-3 gap-3"><dt className="text-muted-foreground">Marque</dt><dd className="col-span-2 font-medium">{vehicule.marque || "—"}</dd></div>
            <div className="grid grid-cols-3 gap-3"><dt className="text-muted-foreground">Modèle</dt><dd className="col-span-2 font-medium">{vehicule.modele || "—"}</dd></div>
            <div className="grid grid-cols-3 gap-3"><dt className="text-muted-foreground">VIN</dt><dd className="col-span-2 font-mono text-xs">{vehicule.vin || "—"}</dd></div>
            <div className="grid grid-cols-3 gap-3"><dt className="text-muted-foreground">Immatriculation</dt><dd className="col-span-2 font-mono text-xs uppercase">{vehicule.immatriculation || "—"}</dd></div>
            <div className="grid grid-cols-3 gap-3"><dt className="text-muted-foreground">Kilométrage</dt><dd className="col-span-2 font-medium tabular-nums">{vehicule.kilometrage != null ? `${vehicule.kilometrage.toLocaleString("fr-FR")} km` : "—"}</dd></div>
            {entreprise && (
              <div className="grid grid-cols-3 gap-3">
                <dt className="text-muted-foreground">Entreprise</dt>
                <dd className="col-span-2 font-medium flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {entreprise.nom}</dd>
              </div>
            )}
            {collab && (
              <div className="grid grid-cols-3 gap-3">
                <dt className="text-muted-foreground">Affecté à</dt>
                <dd className="col-span-2">
                  <Link to="/dashboard/collaborateur/$id" params={{ id: collab.id }} className="font-medium flex items-center gap-1.5 hover:underline">
                    <User className="h-3.5 w-3.5" /> {collab.prenom} {collab.nom}
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Bloc batterie — CDC §5.1.1.5 */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Battery className="h-4 w-4 text-chargiz-teal" /> Capacité batterie
          </h3>
          {battery ? (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <dt className="text-muted-foreground">Retenue</dt>
                <dd className="col-span-2 font-mono text-lg font-bold text-chargiz-teal">
                  {battery.capacite_batterie_retenue != null ? `${battery.capacite_batterie_retenue} kWh` : "—"}
                </dd>
              </div>
              <div className="grid grid-cols-3 gap-3"><dt className="text-muted-foreground">Source</dt><dd className="col-span-2 capitalize text-xs">{battery.source || "—"}</dd></div>
              <div className="grid grid-cols-3 gap-3"><dt className="text-muted-foreground">Smartcar</dt><dd className="col-span-2 font-mono text-xs">{battery.capacite_batterie_smartcar != null ? `${battery.capacite_batterie_smartcar} kWh` : "—"}</dd></div>
              {battery.ecart_kwh != null && (
                <div className="grid grid-cols-3 gap-3">
                  <dt className="text-muted-foreground">Écart</dt>
                  <dd className={`col-span-2 font-mono text-xs ${battery.ecart_kwh > battery.seuil_tolerance_kwh ? "text-amber-600" : "text-chargiz-teal"}`}>
                    {battery.ecart_kwh} kWh
                    {battery.ecart_kwh > battery.seuil_tolerance_kwh && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> &gt; seuil {battery.seuil_tolerance_kwh}
                      </span>
                    )}
                  </dd>
                </div>
              )}
              {battery.type_smartcar && (
                <div className="grid grid-cols-3 gap-3"><dt className="text-muted-foreground">Type</dt><dd className="col-span-2 text-xs">{battery.type_smartcar}</dd></div>
              )}
              <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                {battery.source === "smartcar" ? (
                  <>
                    <Check className="h-3 w-3" /> Source Smartcar — écart avec la saisie collaborateur ≤ 2 kWh.
                  </>
                ) : battery.source === "collaborateur" ? (
                  <>
                    <Info className="h-3 w-3" /> Source collaborateur — écart Smartcar &gt; 2 kWh, la saisie collaborateur fait foi.
                  </>
                ) : (
                  "Aucune donnée Smartcar disponible — saisie collaborateur utilisée."
                )}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Aucune donnée batterie.</p>
          )}
        </div>
      </div>

      {/* Historique d'affectations */}
      <SectionHeader>Historique d'affectations</SectionHeader>
      <div className="mb-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="cz-table-head">
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Collaborateur</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Affecté le</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Détaché le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {historique.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-muted-foreground"><History className="h-5 w-5 mx-auto mb-1 opacity-30" />Aucun historique</td></tr>
            ) : historique.map(h => (
              <tr key={h.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{h.collaborateur_nom}</td>
                <td className="px-4 py-3 text-muted-foreground">{h.date_affectation ? new Date(h.date_affectation).toLocaleDateString("fr-FR") : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{h.date_fin ? new Date(h.date_fin).toLocaleDateString("fr-FR") : <span className="text-chargiz-teal">— en cours</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Historique des recharges */}
      <SectionHeader>Historique des recharges</SectionHeader>
      <div className="mb-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="cz-table-head">
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Collaborateur</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">kWh</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Coût</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Km</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-muted-foreground"><Zap className="h-5 w-5 mx-auto mb-1 opacity-30" />Aucune session</td></tr>
              ) : sessions.slice(0, 50).map(s => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{s.date_session ? new Date(s.date_session).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                  <td className="px-4 py-3">{s.collaborateur_nom || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.energie_kwh.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.cout_euro.toFixed(2)} €</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{s.kilometrage != null ? s.kilometrage.toLocaleString("fr-FR") : "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${s.is_domicile ? "bg-chargiz-teal/10 text-chargiz-teal" : "bg-kpi-away/10 text-kpi-away"}`}>
                      {s.is_domicile ? "Domicile" : "Hors dom."}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sessions.length > 50 && (
          <p className="border-t border-border px-4 py-2 text-xs text-center text-muted-foreground">
            50 premières sessions affichées sur {sessions.length} total — export disponible depuis la fiche collaborateur.
          </p>
        )}
      </div>

      {/* Historique des modifications (CDC §2.6.2 / Étape 0 Lot 2) */}
      <EntityAuditHistory
        entityType="vehicule"
        entityId={vehiculeId}
        title="Historique des modifications du véhicule"
      />

      {/* Dialogs */}
      <VehicleDetachDialog
        open={showDetach}
        onClose={() => setShowDetach(false)}
        onConfirm={handleDetach}
        vehiculeLabel={veh_label}
        collabName={collab ? `${collab.prenom} ${collab.nom}` : null}
        loading={actionLoading}
      />
      <SuspendSubscriptionDialog
        open={showSuspend}
        onClose={() => setShowSuspend(false)}
        onConfirm={handleSuspend}
        mode="suspend"
        vehiculeLabel={veh_label}
        loading={actionLoading}
      />
      <SuspendSubscriptionDialog
        open={showReactivate}
        onClose={() => setShowReactivate(false)}
        onConfirm={handleReactivate}
        mode="reactivate"
        vehiculeLabel={veh_label}
        loading={actionLoading}
      />
    </div>
  );
}
