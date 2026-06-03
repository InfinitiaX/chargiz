import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { History, Plus, Pencil, Trash2, Archive, ArchiveRestore, ChevronDown, ChevronUp, User as UserIcon } from "lucide-react";

/**
 * Composant réutilisable d'affichage de l'historique des modifications d'une
 * entité spécifique (collaborateur, véhicule, filiale, site, entreprise).
 *
 * S'appuie sur l'endpoint `/api/audit-log?entity_type=X&entity_id=Y`.
 * Accessible aux gestionnaires (le backend autorise quand entity_id est précisé).
 *
 * CDC §2.6.2 — Étape 0 Lot 2
 */

export type EntityType = "entreprise" | "filiale" | "site" | "collaborateur" | "vehicule" | "politique_recharge";

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

interface Props {
  entityType: EntityType;
  entityId: string;
  /** Nombre d'entrées à afficher initialement (défaut 10). */
  pageSize?: number;
  /** Titre de la section (défaut "Historique des modifications"). */
  title?: string;
}

const ACTION_BADGES: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
  create:    { label: "Création",     cls: "bg-emerald-100 text-emerald-700",   Icon: Plus },
  update:    { label: "Modification", cls: "bg-amber-100 text-amber-700",       Icon: Pencil },
  delete:    { label: "Suppression",  cls: "bg-red-100 text-red-700",           Icon: Trash2 },
  archive:   { label: "Archivage",    cls: "bg-slate-100 text-slate-700",       Icon: Archive },
  unarchive: { label: "Réactivation", cls: "bg-chargiz-lime/30 text-chargiz-teal", Icon: ArchiveRestore },
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function tryParseJson(raw: string | null): string {
  if (raw == null || raw === "null") return "—";
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed || "—";
    if (typeof parsed === "boolean") return parsed ? "Oui" : "Non";
    if (typeof parsed === "number") return String(parsed);
    if (parsed === null) return "—";
    return JSON.stringify(parsed);
  } catch {
    return raw;
  }
}

export default function EntityAuditHistory({ entityType, entityId, pageSize = 10, title = "Historique des modifications" }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId, expanded]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const limit = expanded ? 100 : pageSize;
      const params = new URLSearchParams({
        entity_type: entityType,
        entity_id: entityId,
        limit: String(limit),
        offset: "0",
      });
      const data = await apiFetch<{ items: AuditEntry[]; total: number }>(`/api/audit-log?${params}`);
      setEntries(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err?.message || "Erreur de chargement de l'historique");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-medium text-card-foreground">{title}</h3>
          {!loading && total > 0 && (
            <span className="text-xs text-muted-foreground">
              ({total} modification{total > 1 ? "s" : ""})
            </span>
          )}
        </div>
        {total > pageSize && (
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {expanded ? (
              <>Réduire <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>Tout afficher <ChevronDown className="h-3 w-3" /></>
            )}
          </button>
        )}
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Aucune modification enregistrée pour le moment.</p>
        ) : (
          <ul className="space-y-3">
            {entries.map(e => {
              const badge = ACTION_BADGES[e.action] || ACTION_BADGES.update;
              const BadgeIcon = badge.Icon;
              const isUpdate = e.action === "update" && e.field_name;
              return (
                <li key={e.id} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${badge.cls}`}>
                    <BadgeIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-sm font-medium text-card-foreground">{badge.label}</span>
                      {isUpdate && (
                        <span className="text-sm text-muted-foreground">
                          du champ <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{e.field_name}</span>
                        </span>
                      )}
                    </div>
                    {isUpdate && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-muted-foreground">de</span>
                        <span className="rounded bg-red-50 px-2 py-0.5 text-red-700 line-through">{tryParseJson(e.old_value)}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700 font-medium">{tryParseJson(e.new_value)}</span>
                      </div>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <UserIcon className="h-3 w-3" />
                        {e.user_email || "Système"}
                        {e.user_role && <span className="text-muted-foreground/70">· {e.user_role.replace(/_/g, " ")}</span>}
                      </span>
                      <span>·</span>
                      <span>{fmtDate(e.created_at)}</span>
                      {e.ip_address && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-[10px]">{e.ip_address}</span>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
