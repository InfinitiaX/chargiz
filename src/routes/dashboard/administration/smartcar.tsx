/**
 * Observabilité Smartcar — admin / superadmin uniquement (CDC §6.2.2).
 *
 * Cette page affiche :
 *  - une rangée de KPIs de santé (totaux 1h / 24h / 7j, véhicules à risque, dernière erreur)
 *  - la répartition des erreurs des dernières 24h par endpoint et par status HTTP
 *  - une table paginée des erreurs avec filtres endpoint / status / véhicule / période
 *
 * Backend : `GET /api/admin/smartcar-health` + `GET /api/admin/smartcar-errors`
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, Activity, AlertTriangle, Server, ShieldAlert, Clock, RefreshCw,
} from "lucide-react";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import TablePagination from "@/components/TablePagination";
import SectionHeader from "@/components/SectionHeader";

export const Route = createFileRoute("/dashboard/administration/smartcar")({
  component: SmartcarHealthPage,
  head: () => ({ meta: [{ title: "ChargiZ — Erreurs Smartcar" }] }),
});

interface SmartcarError {
  id: string;
  vehicule_id: string | null;
  vehicule_label: string | null;
  endpoint: string;
  status_code: number | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
}

interface SmartcarHealth {
  generated_at: string;
  totals: { last_1h: number; last_24h: number; last_7d: number };
  by_endpoint_24h: { endpoint: string; count: number }[];
  by_status_24h: { status_code: number | null; count: number }[];
  vehicles_at_risk_24h: { vehicule_id: string; vehicule_label: string; error_count_24h: number }[];
  vehicles_at_risk_count: number;
  total_vehicles_connected: number;
  last_error_at: string | null;
}

const PAGE_SIZE = 25;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Couleur du badge selon le status HTTP (5xx rouge, 4xx ambre, 2xx/null gris). */
function statusBadge(code: number | null): { cls: string; label: string } {
  if (code == null) return { cls: "bg-muted text-muted-foreground", label: "—" };
  if (code >= 500) return { cls: "bg-red-100 text-red-700", label: String(code) };
  if (code >= 400) return { cls: "bg-amber-100 text-amber-700", label: String(code) };
  if (code >= 200 && code < 300) return { cls: "bg-emerald-100 text-emerald-700", label: String(code) };
  return { cls: "bg-muted text-muted-foreground", label: String(code) };
}

function SmartcarHealthPage() {
  const { role } = useAuth();
  const isAuthorized = role === "superadmin" || role === "admin";

  const [health, setHealth] = useState<SmartcarHealth | null>(null);
  const [errors, setErrors] = useState<SmartcarError[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filtres
  const [filterEndpoint, setFilterEndpoint] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterVehicule, setFilterVehicule] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  useEffect(() => {
    if (!isAuthorized) { setLoading(false); return; }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterEndpoint, filterStatus, filterVehicule, dateFrom, dateTo]);

  async function loadAll() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", String(PAGE_SIZE));
      qs.set("offset", String((page - 1) * PAGE_SIZE));
      if (filterEndpoint) qs.set("endpoint", filterEndpoint);
      if (filterStatus) qs.set("status_code", filterStatus);
      if (filterVehicule) qs.set("vehicule_id", filterVehicule);
      if (dateFrom && dateTo && dateFrom <= dateTo) {
        qs.set("date_from", `${dateFrom}T00:00:00`);
        qs.set("date_to", `${dateTo}T23:59:59`);
      }

      const [healthData, errorsData] = await Promise.all([
        apiFetch<SmartcarHealth>("/api/admin/smartcar-health"),
        apiFetch<{ items: SmartcarError[]; total: number }>(`/api/admin/smartcar-errors?${qs}`),
      ]);
      setHealth(healthData);
      setErrors(errorsData.items);
      setTotal(errorsData.total);
    } catch (err) {
      console.error("Erreur chargement Smartcar health:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthorized) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 max-w-xl">
          <ShieldAlert className="h-6 w-6 text-destructive mb-2" />
          <p className="text-sm font-semibold text-destructive">Accès réservé</p>
          <p className="mt-1 text-sm text-muted-foreground">
            L'observabilité Smartcar est accessible aux administrateurs et super-administrateurs.
          </p>
        </div>
      </div>
    );
  }

  if (loading && !health) return <PageSkeleton kpiCount={4} rowCount={10} showFilters />;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Suggère les endpoints rencontrés sur 24h pour pré-remplir le filtre
  const endpointOptions = health?.by_endpoint_24h.map(e => e.endpoint) || [];

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/dashboard/administration" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-3 w-3" /> Retour
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Erreurs Smartcar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Observabilité du connecteur — {total} erreur{total > 1 ? "s" : ""} enregistrée{total > 1 ? "s" : ""}
            {health?.generated_at && <> · synthèse générée le {formatDate(health.generated_at)}</>}
          </p>
        </div>
        <button
          onClick={loadAll}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" /> Rafraîchir
        </button>
      </div>

      {/* KPIs santé */}
      {health && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dernière heure</span>
            </div>
            <p className="text-2xl font-bold text-card-foreground tabular-nums">{health.totals.last_1h}</p>
            <p className="mt-1 text-xs text-muted-foreground">erreur{health.totals.last_1h > 1 ? "s" : ""} Smartcar</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">24 heures</span>
            </div>
            <p className="text-2xl font-bold text-card-foreground tabular-nums">{health.totals.last_24h}</p>
            <p className="mt-1 text-xs text-muted-foreground">sur {health.total_vehicles_connected} véhicule{health.total_vehicles_connected > 1 ? "s" : ""} connecté{health.total_vehicles_connected > 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">7 jours</span>
            </div>
            <p className="text-2xl font-bold text-card-foreground tabular-nums">{health.totals.last_7d}</p>
            <p className="mt-1 text-xs text-muted-foreground">total semaine glissante</p>
          </div>
          <div className={`rounded-xl border p-5 shadow-sm ${health.vehicles_at_risk_count > 0 ? "border-amber-300 bg-amber-50" : "border-border bg-card"}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`h-4 w-4 ${health.vehicles_at_risk_count > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
              <span className={`text-xs font-medium uppercase tracking-wide ${health.vehicles_at_risk_count > 0 ? "text-amber-700" : "text-muted-foreground"}`}>Véhicules à risque</span>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${health.vehicles_at_risk_count > 0 ? "text-amber-700" : "text-card-foreground"}`}>
              {health.vehicles_at_risk_count}
            </p>
            <p className={`mt-1 text-xs ${health.vehicles_at_risk_count > 0 ? "text-amber-700" : "text-muted-foreground"}`}>
              ≥ 5 erreurs sur 24h
            </p>
          </div>
        </div>
      )}

      {/* Répartition 24h */}
      {health && (health.by_endpoint_24h.length > 0 || health.by_status_24h.length > 0) && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {/* Par endpoint */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-card-foreground">Erreurs par endpoint (24h)</h3>
            </div>
            {health.by_endpoint_24h.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Aucune erreur sur les dernières 24h.</p>
            ) : (
              <ul className="space-y-2">
                {health.by_endpoint_24h.map((e) => (
                  <li key={e.endpoint} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs text-card-foreground">{e.endpoint}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">{e.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Par status HTTP */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-card-foreground">Erreurs par statut HTTP (24h)</h3>
            </div>
            {health.by_status_24h.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Aucune erreur sur les dernières 24h.</p>
            ) : (
              <ul className="space-y-2">
                {health.by_status_24h.map((s, i) => {
                  const b = statusBadge(s.status_code);
                  return (
                    <li key={`${s.status_code}-${i}`} className="flex items-center justify-between text-sm">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium font-mono ${b.cls}`}>{b.label}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">{s.count}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Véhicules à risque */}
      {health && health.vehicles_at_risk_count > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-900">
              Véhicules avec ≥ 5 erreurs sur 24h
            </h3>
          </div>
          <ul className="space-y-2">
            {health.vehicles_at_risk_24h.map((v) => (
              <li key={v.vehicule_id} className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setFilterVehicule(v.vehicule_id); setPage(1); }}
                  className="text-left text-amber-900 hover:underline"
                >
                  {v.vehicule_label}
                </button>
                <span className="rounded-full bg-amber-200 text-amber-900 px-2 py-0.5 text-xs font-medium tabular-nums">
                  {v.error_count_24h} erreurs
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-amber-700">
            Cliquez sur un véhicule pour filtrer le journal ci-dessous.
          </p>
        </div>
      )}

      {/* Filtres */}
      <SectionHeader>Filtres</SectionHeader>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <select
          value={filterEndpoint}
          onChange={(e) => { setFilterEndpoint(e.target.value); setPage(1); }}
          className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Tous les endpoints</option>
          {endpointOptions.map((ep) => (
            <option key={ep} value={ep}>{ep}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Tous les statuts</option>
          <option value="400">400 — Bad Request</option>
          <option value="401">401 — Unauthorized</option>
          <option value="403">403 — Forbidden</option>
          <option value="404">404 — Not Found</option>
          <option value="429">429 — Rate Limited</option>
          <option value="500">500 — Internal</option>
          <option value="502">502 — Bad Gateway</option>
          <option value="503">503 — Unavailable</option>
          <option value="504">504 — Timeout</option>
        </select>
        <input
          type="text"
          placeholder="Filtrer par véhicule_id..."
          value={filterVehicule}
          onChange={(e) => { setFilterVehicule(e.target.value); setPage(1); }}
          className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <input
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={(e) => {
            const v = e.target.value;
            setDateFrom(v);
            if (v && dateTo && v > dateTo) setDateTo(v);
            setPage(1);
          }}
          className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <input
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(e) => {
            const v = e.target.value;
            setDateTo(v);
            if (v && dateFrom && v < dateFrom) setDateFrom(v);
            setPage(1);
          }}
          className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Journal d'erreurs */}
      <SectionHeader>Journal d'erreurs</SectionHeader>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="cz-table-head">
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Véhicule</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Endpoint</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Retry</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {errors.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Activity}
                      title="Aucune erreur"
                      description="Excellente nouvelle : aucune erreur Smartcar n'est enregistrée selon vos filtres."
                    />
                  </td>
                </tr>
              ) : errors.map((e) => {
                const b = statusBadge(e.status_code);
                return (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {formatDate(e.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {e.vehicule_id ? (
                        <Link
                          to="/dashboard/listes/vehicules/$vehiculeId"
                          params={{ vehiculeId: e.vehicule_id }}
                          className="text-xs text-card-foreground hover:underline"
                        >
                          {e.vehicule_label || e.vehicule_id.slice(0, 8) + "…"}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{e.endpoint}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium font-mono ${b.cls}`}>
                        {b.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-xs text-muted-foreground">
                      {e.retry_count}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground line-clamp-2 max-w-md block">
                        {e.error_message || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
