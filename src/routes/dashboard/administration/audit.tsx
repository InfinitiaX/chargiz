import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, Calendar, History, User as UserIcon, Filter,
  Plus, Pencil, Trash2, Archive, ArchiveRestore, ShieldAlert, Search,
} from "lucide-react";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import TablePagination from "@/components/TablePagination";
import SectionHeader from "@/components/SectionHeader";

export const Route = createFileRoute("/dashboard/administration/audit")({
  component: AuditLogPage,
  head: () => ({ meta: [{ title: "ChargiZ — Historique" }] }),
});

interface AuditEntry {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  entity_type: string;
  entity_id: string;
  entity_label: string | null;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  created_at: string;
}

const ENTITY_LABELS: Record<string, string> = {
  entreprise: "Entreprise",
  filiale: "Filiale",
  site: "Site",
  collaborateur: "Collaborateur",
  vehicule: "Véhicule",
  politique_recharge: "Politique recharge",
};

const ACTION_BADGES: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  create: { label: "Création", cls: "bg-chargiz-teal/10 text-chargiz-teal", icon: Plus },
  update: { label: "Modification", cls: "bg-amber-500/10 text-amber-600", icon: Pencil },
  delete: { label: "Suppression", cls: "bg-destructive/10 text-destructive", icon: Trash2 },
  archive: { label: "Archivage", cls: "bg-muted text-muted-foreground", icon: Archive },
  unarchive: { label: "Réactivation", cls: "bg-chargiz-lime/30 text-chargiz-teal", icon: ArchiveRestore },
};

const PAGE_SIZE = 50;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function tryParseJson(raw: string | null): string {
  if (raw == null) return "—";
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (typeof parsed === "boolean") return parsed ? "Oui" : "Non";
    if (parsed === null) return "—";
    return JSON.stringify(parsed);
  } catch {
    return raw;
  }
}

function AuditLogPage() {
  const { role } = useAuth();
  const isAuthorized = role === "superadmin" || role === "admin";

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [filterEntity, setFilterEntity] = useState<string>("");
  const [filterAction, setFilterAction] = useState<string>("");
  const [searchUser, setSearchUser] = useState("");

  useEffect(() => {
    if (!isAuthorized) { setLoading(false); return; }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterEntity, filterAction]);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String((page - 1) * PAGE_SIZE));
      if (filterEntity) params.set("entity_type", filterEntity);
      if (filterAction) params.set("action", filterAction);
      const data = await apiFetch<{ items: AuditEntry[]; total: number }>(`/api/audit-log?${params}`);
      setEntries(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error("Erreur chargement audit:", err);
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
          <p className="mt-1 text-sm text-muted-foreground">L'historique global est accessible aux administrateurs et super-administrateurs.</p>
        </div>
      </div>
    );
  }

  if (loading) return <PageSkeleton kpiCount={0} rowCount={10} showFilters />;

  const filtered = searchUser
    ? entries.filter(e => (e.user_email || "").toLowerCase().includes(searchUser.toLowerCase()))
    : entries;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/dashboard/administration" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-3 w-3" /> Retour
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Historique des modifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Trace complète des actions sur les entités sensibles — {total} entrée{total > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <SectionHeader>Filtres</SectionHeader>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select
          value={filterEntity}
          onChange={e => { setFilterEntity(e.target.value); setPage(1); }}
          className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Toutes les entités</option>
          {Object.entries(ENTITY_LABELS).map(([key, lbl]) => (
            <option key={key} value={key}>{lbl}</option>
          ))}
        </select>
        <select
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setPage(1); }}
          className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_BADGES).map(([key, def]) => (
            <option key={key} value={key}>{def.label}</option>
          ))}
        </select>
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par email utilisateur..."
            value={searchUser}
            onChange={e => setSearchUser(e.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <SectionHeader>Journal d'audit</SectionHeader>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="cz-table-head">
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Utilisateur</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entité</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Champ</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Avant → Après</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={History} title="Aucune entrée d'audit" description="Aucune modification ne correspond aux filtres sélectionnés." />
                  </td>
                </tr>
              ) : filtered.map(e => {
                const badge = ACTION_BADGES[e.action] || { label: e.action, cls: "bg-muted text-muted-foreground", icon: Pencil };
                const Icon = badge.icon;
                return (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {formatDate(e.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-card-foreground text-xs">{e.user_email || "Système"}</span>
                        {e.user_role && (
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {e.user_role.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                        <Icon className="h-3 w-3" />
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                          {ENTITY_LABELS[e.entity_type] || e.entity_type}
                        </span>
                        {e.entity_label && (
                          <span className="font-medium text-card-foreground text-xs truncate max-w-[200px]">
                            {e.entity_label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {e.field_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {e.field_name && (e.old_value !== null || e.new_value !== null) ? (
                        <div className="flex flex-col gap-0.5 max-w-[280px]">
                          <span className="text-destructive truncate" title={tryParseJson(e.old_value)}>
                            − {tryParseJson(e.old_value)}
                          </span>
                          <span className="text-chargiz-teal truncate" title={tryParseJson(e.new_value)}>
                            + {tryParseJson(e.new_value)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {e.ip_address || "—"}
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
