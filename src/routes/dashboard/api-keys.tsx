import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  api,
  type ApiKeyItem,
  type ApiKeyCreated,
  type ApiUsageStats,
  type WebhookSubscription,
  type WebhookSubscriptionCreated,
  type WebhookDelivery,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Loader2,
  BarChart3,
  Activity,
  Zap,
  TrendingUp,
  Webhook,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  History,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/api-keys")({
  component: ApiKeysPage,
  head: () => ({ meta: [{ title: "ChargiZ — Clés API" }] }),
});

// ─── Constantes ───────────────────────────────────────────────────────────────

const ALL_SCOPES = [
  { value: "sessions:read", label: "Sessions" },
  { value: "vehicles:read", label: "Véhicules" },
  { value: "collaborators:read", label: "Collaborateurs" },
  { value: "statistics:read", label: "Statistiques" },
  { value: "reports:read", label: "Rapports" },
] as const;

const SCOPE_COLORS: Record<string, string> = {
  "sessions:read": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "vehicles:read": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "collaborators:read": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "statistics:read": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "reports:read": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function relativeDate(iso: string | null): string {
  if (!iso) return "Jamais";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs}h`;
  return `Il y a ${Math.floor(hrs / 24)}j`;
}

function keyStatus(k: ApiKeyItem): { label: string; cls: string } {
  if (k.revoked_at) return { label: "Révoquée", cls: "bg-red-100 text-red-700" };
  if (k.expires_at && new Date(k.expires_at) < new Date())
    return { label: "Expirée", cls: "bg-amber-100 text-amber-700" };
  return { label: "Active", cls: "bg-emerald-100 text-emerald-700" };
}

function fmtNum(n: number): string {
  return n.toLocaleString("fr-FR");
}

// Nettoie un chemin d'endpoint pour l'affichage
function shortEndpoint(ep: string): string {
  const last = ep.split("/").filter(Boolean).pop() ?? ep;
  const labels: Record<string, string> = {
    sessions: "Sessions",
    collaborateurs: "Collaborateurs",
    vehicules: "Véhicules",
    statistics: "Statistiques",
    health: "Health check",
  };
  return labels[last] ?? last;
}

// ─── Composant : champ copiable ───────────────────────────────────────────────

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const display = visible
    ? value
    : value.slice(0, 12) + "•".repeat(36);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
      <code className="flex-1 truncate font-mono text-xs text-foreground select-all">{display}</code>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
        title={visible ? "Masquer" : "Afficher"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
        title="Copier"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ─── Dialog : clé révélée une seule fois ─────────────────────────────────────

function KeyRevealDialog({ created, onClose }: { created: ApiKeyCreated | null; onClose: () => void }) {
  if (!created) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Clé API créée
          </DialogTitle>
          <DialogDescription>
            Copiez cette clé maintenant. Elle ne sera plus jamais affichée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Cette clé ne sera <strong>jamais affichée à nouveau</strong>. Conservez-la dans un
                gestionnaire de secrets sécurisé.
              </span>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Nom — <span className="font-mono">{created.name}</span>
            </p>
            <CopyField value={created.key} />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Scopes accordés</p>
            <div className="flex flex-wrap gap-1.5">
              {created.scopes.map((s) => (
                <span
                  key={s}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SCOPE_COLORS[s] ?? "bg-muted text-muted-foreground"}`}
                >
                  {ALL_SCOPES.find((x) => x.value === s)?.label ?? s}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <p>
              <span className="font-medium">En-tête HTTP :</span>{" "}
              <code className="font-mono">X-API-Key: {created.key.slice(0, 16)}…</code>
            </p>
            <p className="mt-1">
              <span className="font-medium">Base URL :</span>{" "}
              <code className="font-mono">
                {typeof window !== "undefined"
                  ? window.location.origin.replace(/:\d+$/, ":8000")
                  : ""}
                /api/v1/external
              </code>
            </p>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-95"
          >
            J'ai copié ma clé
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog : créer une clé ───────────────────────────────────────────────────

interface CreateKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (k: ApiKeyCreated) => void;
  entrepriseId: string;
  isSuperOrAdmin: boolean;
}
function CreateKeyDialog({ open, onClose, onCreated, entrepriseId, isSuperOrAdmin }: CreateKeyDialogProps) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["sessions:read"]);
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => { setName(""); setScopes(["sessions:read"]); setExpiresAt(""); setError(""); };
  const handleClose = () => { reset(); onClose(); };
  const toggleScope = (s: string) =>
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Le nom est requis."); return; }
    if (scopes.length === 0) { setError("Sélectionnez au moins un scope."); return; }
    setSaving(true);
    try {
      const payload: { name: string; scopes: string[]; expires_at?: string | null; entreprise_id?: string } = {
        name: name.trim(), scopes, expires_at: expiresAt || null,
      };
      if (isSuperOrAdmin && entrepriseId) payload.entreprise_id = entrepriseId;
      const created = await api.apiKeys.create(payload);
      toast.success("Clé API créée", { description: `"${created.name}" est maintenant active.` });
      reset();
      onCreated(created);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Nouvelle clé API
          </DialogTitle>
          <DialogDescription>Définissez le nom et les permissions de la clé.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{error}</div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Nom descriptif *</label>
            <input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='"Intégration Geotab"'
              className={`mt-1.5 ${inputCls}`}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Scopes *</label>
            <p className="mb-2 text-xs text-muted-foreground">Permissions accordées à cette clé.</p>
            <div className="flex flex-wrap gap-2">
              {ALL_SCOPES.map(({ value, label }) => {
                const active = scopes.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleScope(value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Date d'expiration <span className="text-muted-foreground/70">(optionnel)</span>
            </label>
            <input
              type="date"
              value={expiresAt}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={`mt-1.5 ${inputCls}`}
            />
          </div>

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-95 disabled:opacity-50"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Création…</> : <><Plus className="h-4 w-4" /> Créer la clé</>}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog : confirmation ────────────────────────────────────────────────────

function ConfirmDialog({
  open, title, description, confirmLabel, confirmCls, loading, onConfirm, onClose,
}: {
  open: boolean; title: string; description: string; confirmLabel: string;
  confirmCls?: string; loading: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50 ${confirmCls ?? "bg-primary text-primary-foreground hover:brightness-95"}`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

type Tab = "keys" | "stats" | "webhooks";

function ApiKeysPage() {
  const { role, profile } = useAuth();
  const isSuperOrAdmin = role === "superadmin" || role === "admin";
  const isGest = role === "gestionnaire_entreprise";

  const [tab, setTab] = useState<Tab>("keys");

  // Entreprise
  const [selectedEid, setSelectedEid] = useState<string>(profile?.entreprise_id ?? "");
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [entLoading, setEntLoading] = useState(false);

  // Clés
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState<ApiUsageStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Webhooks
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [createWebhookOpen, setCreateWebhookOpen] = useState(false);
  const [revealWebhook, setRevealWebhook] = useState<WebhookSubscriptionCreated | null>(null);
  const [deliveriesTarget, setDeliveriesTarget] = useState<WebhookSubscription | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [revealKey, setRevealKey] = useState<ApiKeyCreated | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyItem | null>(null);
  const [rotateTarget, setRotateTarget] = useState<ApiKeyItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load entreprises for superadmin/admin
  useEffect(() => {
    if (!isSuperOrAdmin) return;
    setEntLoading(true);
    api.entreprises
      .list()
      .then((list) => { setEntreprises(list); if (list.length === 1) setSelectedEid(list[0].id); })
      .catch(console.error)
      .finally(() => setEntLoading(false));
  }, [isSuperOrAdmin]);

  const effectiveEid = isGest ? (profile?.entreprise_id ?? "") : selectedEid;
  const usageParams = isSuperOrAdmin && effectiveEid ? { entreprise_id: effectiveEid } : undefined;

  const loadKeys = useCallback(async () => {
    if (!effectiveEid && !isGest) return;
    setKeysLoading(true);
    try {
      const params = isSuperOrAdmin && effectiveEid ? { entreprise_id: effectiveEid } : undefined;
      setKeys(await api.apiKeys.list(params));
    } catch (err: any) {
      toast.error("Erreur", { description: err.message });
    } finally {
      setKeysLoading(false);
    }
  }, [effectiveEid, isSuperOrAdmin, isGest]);

  const loadStats = useCallback(async () => {
    if (!effectiveEid && !isGest) return;
    setStatsLoading(true);
    try {
      setStats(await api.apiKeys.usage(usageParams));
    } catch (err: any) {
      toast.error("Erreur stats", { description: err.message });
    } finally {
      setStatsLoading(false);
    }
  }, [effectiveEid, isSuperOrAdmin, isGest]);

  const loadWebhooks = useCallback(async () => {
    if (!effectiveEid && !isGest) return;
    setWebhooksLoading(true);
    try {
      const params = isSuperOrAdmin && effectiveEid ? { entreprise_id: effectiveEid } : undefined;
      setWebhooks(await api.webhooks.list(params));
    } catch (err: any) {
      toast.error("Erreur", { description: err.message });
    } finally {
      setWebhooksLoading(false);
    }
  }, [effectiveEid, isSuperOrAdmin, isGest]);

  const openDeliveries = async (sub: WebhookSubscription) => {
    setDeliveriesTarget(sub);
    setDeliveriesLoading(true);
    try {
      const params = isSuperOrAdmin ? effectiveEid : undefined;
      setDeliveries(await api.webhooks.deliveries(sub.id, params));
    } catch (err: any) {
      toast.error("Erreur", { description: err.message });
    } finally {
      setDeliveriesLoading(false);
    }
  };

  // Charger selon l'onglet actif
  useEffect(() => { if (tab === "keys") loadKeys(); }, [loadKeys, tab]);
  useEffect(() => { if (tab === "stats") loadStats(); }, [loadStats, tab]);
  useEffect(() => { if (tab === "webhooks") loadWebhooks(); }, [loadWebhooks, tab]);

  const handleCreated = (k: ApiKeyCreated) => { setCreateOpen(false); setRevealKey(k); loadKeys(); };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setActionLoading(true);
    try {
      await api.apiKeys.revoke(revokeTarget.id, isSuperOrAdmin ? effectiveEid : undefined);
      toast.success("Clé révoquée", { description: `"${revokeTarget.name}" n'est plus active.` });
      setRevokeTarget(null);
      loadKeys();
    } catch (err: any) {
      toast.error("Erreur", { description: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRotate = async () => {
    if (!rotateTarget) return;
    setActionLoading(true);
    try {
      const newKey = await api.apiKeys.rotate(rotateTarget.id, isSuperOrAdmin ? effectiveEid : undefined);
      toast.success("Clé pivotée", { description: "Ancienne clé révoquée. Nouvelle clé créée." });
      setRotateTarget(null);
      setRevealKey(newKey);
      loadKeys();
    } catch (err: any) {
      toast.error("Erreur", { description: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const inputCls =
    "rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* En-tête */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Clés API</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez les accès API pour vos systèmes Fleet Management externes
          </p>
        </div>
        {effectiveEid && tab === "keys" && (
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-95 shrink-0"
          >
            <Plus className="h-4 w-4" /> Nouvelle clé
          </button>
        )}
        {effectiveEid && tab === "webhooks" && (
          <button
            onClick={() => setCreateWebhookOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-95 shrink-0"
          >
            <Plus className="h-4 w-4" /> Nouveau webhook
          </button>
        )}
      </div>

      {/* Sélecteur d'entreprise (superadmin/admin) */}
      {isSuperOrAdmin && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
          <label className="text-xs font-medium text-muted-foreground">Entreprise</label>
          {entLoading ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
            </div>
          ) : (
            <select
              value={selectedEid}
              onChange={(e) => setSelectedEid(e.target.value)}
              className={`mt-1.5 w-full max-w-sm ${inputCls}`}
            >
              <option value="">— Sélectionner une entreprise —</option>
              {entreprises.map((e) => (
                <option key={e.id} value={e.id}>{e.nom}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Onglets */}
      {effectiveEid && (
        <div className="mb-6 inline-flex rounded-xl bg-muted p-1">
          <TabBtn active={tab === "keys"} onClick={() => setTab("keys")} icon={<KeyRound className="h-4 w-4" />}>
            Clés API
          </TabBtn>
          <TabBtn active={tab === "stats"} onClick={() => setTab("stats")} icon={<BarChart3 className="h-4 w-4" />}>
            Statistiques
          </TabBtn>
          <TabBtn active={tab === "webhooks"} onClick={() => setTab("webhooks")} icon={<Webhook className="h-4 w-4" />}>
            Webhooks
          </TabBtn>
        </div>
      )}

      {/* ── Onglet Clés ─────────────────────────────────────────────────────── */}
      {tab === "keys" && (
        <>
          {!effectiveEid ? (
            <EmptyEnterprise />
          ) : keysLoading ? (
            <Spinner />
          ) : keys.length === 0 ? (
            <EmptyKeys onNew={() => setCreateOpen(true)} />
          ) : (
            <KeysTable keys={keys} onRevoke={setRevokeTarget} onRotate={setRotateTarget} />
          )}

          {effectiveEid && (
            <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-card-foreground">API externe</p>
                  <p className="text-muted-foreground text-xs">
                    Base URL :{" "}
                    <code className="font-mono text-foreground">{"<host>"}/api/v1/external</code>{" "}
                    — en-tête{" "}
                    <code className="font-mono text-foreground">X-API-Key: &lt;votre-clé&gt;</code>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Endpoints :{" "}
                    <code className="font-mono">/health · /sessions · /collaborateurs · /vehicules · /statistics</code>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Limite : <strong>1 000 requêtes/heure</strong> par clé.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Onglet Statistiques ──────────────────────────────────────────────── */}
      {tab === "stats" && (
        <>
          {!effectiveEid ? (
            <EmptyEnterprise />
          ) : statsLoading ? (
            <Spinner />
          ) : stats ? (
            <StatsTab stats={stats} onRefresh={loadStats} />
          ) : null}
        </>
      )}

      {/* ── Onglet Webhooks ──────────────────────────────────────────────────── */}
      {tab === "webhooks" && (
        <>
          {!effectiveEid ? (
            <EmptyEnterprise />
          ) : webhooksLoading ? (
            <Spinner />
          ) : (
            <WebhooksTab
              webhooks={webhooks}
              onRefresh={loadWebhooks}
              onToggle={async (sub) => {
                try {
                  await api.webhooks.toggle(sub.id, isSuperOrAdmin ? effectiveEid : undefined);
                  toast.success(sub.is_active ? "Webhook désactivé" : "Webhook activé");
                  loadWebhooks();
                } catch (err: any) { toast.error("Erreur", { description: err.message }); }
              }}
              onDelete={async (sub) => {
                try {
                  await api.webhooks.delete(sub.id, isSuperOrAdmin ? effectiveEid : undefined);
                  toast.success("Webhook supprimé");
                  loadWebhooks();
                } catch (err: any) { toast.error("Erreur", { description: err.message }); }
              }}
              onDeliveries={openDeliveries}
            />
          )}
        </>
      )}

      {/* Dialogues */}
      <CreateKeyDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        entrepriseId={effectiveEid}
        isSuperOrAdmin={isSuperOrAdmin}
      />
      <KeyRevealDialog created={revealKey} onClose={() => setRevealKey(null)} />
      <ConfirmDialog
        open={!!revokeTarget}
        title="Révoquer cette clé ?"
        description={`La clé "${revokeTarget?.name}" sera immédiatement désactivée.`}
        confirmLabel="Révoquer"
        confirmCls="bg-destructive text-destructive-foreground hover:brightness-95"
        loading={actionLoading}
        onConfirm={handleRevoke}
        onClose={() => setRevokeTarget(null)}
      />
      <CreateWebhookDialog
        open={createWebhookOpen}
        onClose={() => setCreateWebhookOpen(false)}
        onCreated={(w) => { setCreateWebhookOpen(false); setRevealWebhook(w); loadWebhooks(); }}
        entrepriseId={effectiveEid}
        isSuperOrAdmin={isSuperOrAdmin}
      />
      <WebhookRevealDialog created={revealWebhook} onClose={() => setRevealWebhook(null)} />
      <DeliveriesDialog
        sub={deliveriesTarget}
        deliveries={deliveries}
        loading={deliveriesLoading}
        onClose={() => { setDeliveriesTarget(null); setDeliveries([]); }}
      />
      <ConfirmDialog
        open={!!rotateTarget}
        title="Pivoter cette clé ?"
        description={`L'ancienne clé "${rotateTarget?.name}" sera révoquée et une nouvelle créée avec les mêmes scopes.`}
        confirmLabel="Pivoter"
        loading={actionLoading}
        onConfirm={handleRotate}
        onClose={() => setRotateTarget(null)}
      />
    </div>
  );
}

// ─── Micro-composants partagés ────────────────────────────────────────────────

function TabBtn({
  active, onClick, icon, children,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function EmptyEnterprise() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
      <KeyRound className="mx-auto h-10 w-10 text-muted-foreground/40" />
      <p className="mt-4 text-sm font-medium text-muted-foreground">
        Sélectionnez une entreprise pour gérer ses clés API.
      </p>
    </div>
  );
}

function EmptyKeys({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
      <KeyRound className="mx-auto h-10 w-10 text-muted-foreground/40" />
      <h3 className="mt-4 text-sm font-semibold text-foreground">Aucune clé API</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Créez votre première clé pour permettre l'accès depuis un système externe.
      </p>
      <button
        onClick={onNew}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-95"
      >
        <Plus className="h-4 w-4" /> Créer une clé API
      </button>
    </div>
  );
}

// ─── Onglet Clés : table ──────────────────────────────────────────────────────

function KeysTable({
  keys, onRevoke, onRotate,
}: {
  keys: ApiKeyItem[];
  onRevoke: (k: ApiKeyItem) => void;
  onRotate: (k: ApiKeyItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Nom / Identifiant", "Scopes", "Créée le", "Dernière util.", "Expire le", "Statut", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap last:text-right"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {keys.map((k) => {
              const st = keyStatus(k);
              const disabled = !!k.revoked_at || (!!k.expires_at && new Date(k.expires_at) < new Date());
              return (
                <tr
                  key={k.id}
                  className={`transition-colors hover:bg-muted/30 ${disabled ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{k.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 font-mono text-xs text-muted-foreground">
                      <KeyRound className="h-3 w-3" /> {k.key_prefix}…
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <span
                          key={s}
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${SCOPE_COLORS[s] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {ALL_SCOPES.find((x) => x.value === s)?.label ?? s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(k.created_at)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {relativeDate(k.last_used_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(k.expires_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.cls}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!disabled && (
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onRotate(k)}
                          title="Pivoter"
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onRevoke(k)}
                          title="Révoquer"
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Onglet Statistiques ──────────────────────────────────────────────────────

function StatsTab({ stats, onRefresh }: { stats: ApiUsageStats; onRefresh: () => void }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniKpi
          label="Total appels"
          value={fmtNum(stats.total_calls)}
          icon={<Activity className="h-5 w-5" />}
          sub="Depuis le début"
        />
        <MiniKpi
          label="Aujourd'hui"
          value={fmtNum(stats.calls_today)}
          icon={<Zap className="h-5 w-5 text-chargiz-lime-dark" />}
          sub="J"
          accent
        />
        <MiniKpi
          label="7 derniers jours"
          value={fmtNum(stats.calls_7days)}
          icon={<TrendingUp className="h-5 w-5" />}
          sub="Semaine"
        />
        <MiniKpi
          label="30 derniers jours"
          value={fmtNum(stats.calls_30days)}
          icon={<BarChart3 className="h-5 w-5" />}
          sub="Mois"
        />
      </div>

      {/* Graphique activité quotidienne */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-card-foreground">
              Activité quotidienne
            </h3>
            <p className="text-xs text-muted-foreground">Appels API — 30 derniers jours</p>
          </div>
          <button
            onClick={onRefresh}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            Actualiser
          </button>
        </div>
        <DailyChart data={stats.calls_by_day} today={today} />
      </div>

      {/* Répartitions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Par endpoint */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-card-foreground">
            Répartition par endpoint
          </h3>
          {stats.calls_by_endpoint.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée sur les 30 derniers jours.</p>
          ) : (
            <div className="space-y-3">
              {stats.calls_by_endpoint.map((ep) => (
                <ProgressRow
                  key={ep.endpoint}
                  label={shortEndpoint(ep.endpoint)}
                  sublabel={ep.avg_response_ms != null ? `~${ep.avg_response_ms} ms` : undefined}
                  count={ep.count}
                  pct={ep.pct}
                  barColor="bg-chargiz-teal"
                />
              ))}
            </div>
          )}
        </div>

        {/* Par clé */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-card-foreground">
            Répartition par clé
          </h3>
          {stats.calls_by_key.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée sur les 30 derniers jours.</p>
          ) : (
            <div className="space-y-3">
              {stats.calls_by_key.map((k) => (
                <ProgressRow
                  key={k.key_id}
                  label={k.name}
                  sublabel={k.last_call ? `Dernier appel ${relativeDate(k.last_call)}` : undefined}
                  count={k.count}
                  pct={k.pct}
                  barColor="bg-chargiz-lime-dark"
                  mono={`${k.key_prefix}…`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Santé */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <HealthCard
          label="Clés actives"
          value={String(stats.active_keys_count)}
          sub="Clés non révoquées et non expirées"
          ok={stats.active_keys_count > 0}
        />
        <HealthCard
          label="Taux d'erreur (30j)"
          value={`${stats.error_rate_pct} %`}
          sub="Appels ayant retourné un statut ≥ 400"
          ok={stats.error_rate_pct < 5}
        />
      </div>
    </div>
  );
}

// ─── Sous-composants des statistiques ────────────────────────────────────────

function MiniKpi({
  label, value, icon, sub, accent = false,
}: {
  label: string; value: string; icon?: React.ReactNode; sub?: string; accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        accent ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground/60">{icon}</span>}
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function DailyChart({ data, today }: { data: { date: string; count: number }[]; today: string }) {
  const maxVal = Math.max(...data.map((d) => d.count), 1);

  const labelAt = (i: number) => {
    const d = new Date(data[i]?.date ?? "");
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <div>
      <div className="flex items-end gap-0.5 h-28">
        {data.map((d) => {
          const pct = (d.count / maxVal) * 100;
          const isToday = d.date === today;
          return (
            <div
              key={d.date}
              className="group relative flex-1 cursor-default"
              title={`${d.date} : ${fmtNum(d.count)} appel${d.count !== 1 ? "s" : ""}`}
            >
              <div
                className={`w-full rounded-t-sm transition-all ${
                  isToday
                    ? "bg-chargiz-lime-dark"
                    : "bg-primary/50 group-hover:bg-primary/80"
                }`}
                style={{ height: `${Math.max(pct, 1.5)}%` }}
              />
              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[10px] text-background group-hover:block">
                {fmtNum(d.count)}
              </div>
            </div>
          );
        })}
      </div>
      {/* Axe X : 3 repères */}
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground select-none">
        <span>{labelAt(0)}</span>
        <span>{labelAt(14)}</span>
        <span>{labelAt(29)}</span>
      </div>
      {/* Légende aujourd'hui */}
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-block h-2 w-3 rounded-sm bg-chargiz-lime-dark" />
        Aujourd'hui
        <span className="ml-3 inline-block h-2 w-3 rounded-sm bg-primary/50" />
        Jours précédents
      </div>
    </div>
  );
}

function ProgressRow({
  label, sublabel, count, pct, barColor, mono,
}: {
  label: string; sublabel?: string; count: number; pct: number; barColor: string; mono?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{label}</p>
          {mono && (
            <p className="font-mono text-[10px] text-muted-foreground">{mono}</p>
          )}
          {sublabel && (
            <p className="text-[11px] text-muted-foreground">{sublabel}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-foreground tabular-nums">{fmtNum(count)}</p>
          <p className="text-[11px] text-muted-foreground">{pct}%</p>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.max(pct, 0.5)}%` }}
        />
      </div>
    </div>
  );
}

function HealthCard({
  label, value, sub, ok,
}: {
  label: string; value: string; sub: string; ok: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${
        ok ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
           : "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
      }`}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${ok ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

// ─── Onglet Webhooks ──────────────────────────────────────────────────────────

const WEBHOOK_EVENTS = [{ value: "session.completed", label: "Session terminée" }];

function CreateWebhookDialog({
  open, onClose, onCreated, entrepriseId, isSuperOrAdmin,
}: {
  open: boolean; onClose: () => void;
  onCreated: (w: WebhookSubscriptionCreated) => void;
  entrepriseId: string; isSuperOrAdmin: boolean;
}) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState(["session.completed"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => { setUrl(""); setEvents(["session.completed"]); setError(""); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!url.trim()) { setError("L'URL est requise."); return; }
    if (!url.startsWith("http")) { setError("L'URL doit commencer par http:// ou https://"); return; }
    setSaving(true);
    try {
      const payload: any = { url: url.trim(), events };
      if (isSuperOrAdmin && entrepriseId) payload.entreprise_id = entrepriseId;
      const created = await api.webhooks.create(payload);
      onCreated(created);
      reset();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" /> Nouveau webhook
          </DialogTitle>
          <DialogDescription>ChargiZ enverra un POST signé à cette URL à chaque événement.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {error && <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}
          <div>
            <label className="text-xs font-medium text-muted-foreground">URL de destination *</label>
            <input
              required autoFocus value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://votre-fms.com/webhooks/chargiz"
              className={`mt-1.5 ${inputCls}`}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Événements *</label>
            <div className="mt-2 flex flex-col gap-2">
              {WEBHOOK_EVENTS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={events.includes(value)}
                    onChange={(e) => setEvents(e.target.checked ? [...events, value] : events.filter(ev => ev !== value))}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="font-medium">{label}</span>
                  <code className="ml-auto font-mono text-[11px] text-muted-foreground">{value}</code>
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>Chaque requête sera signée avec l'en-tête <code className="font-mono">X-ChargiZ-Signature: sha256=…</code></p>
            <p className="mt-1">Vérifiez la signature avec <code className="font-mono">HMAC-SHA256(secret, payload)</code></p>
          </div>
          <DialogFooter className="pt-2">
            <button type="button" onClick={handleClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Annuler</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-95 disabled:opacity-50">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Création…</> : <><Plus className="h-4 w-4" /> Créer</>}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WebhookRevealDialog({ created, onClose }: { created: WebhookSubscriptionCreated | null; onClose: () => void }) {
  if (!created) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" /> Secret webhook créé
          </DialogTitle>
          <DialogDescription>Copiez ce secret maintenant — il ne sera plus jamais affiché.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Ce secret est nécessaire pour vérifier la signature <code className="font-mono">X-ChargiZ-Signature</code> côté FMS.</span>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">URL — <code className="font-mono">{created.url}</code></p>
            <CopyField value={created.secret} />
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p><span className="font-medium">Vérification (Node.js) :</span></p>
            <code className="block font-mono text-[10px] whitespace-pre-wrap">{"const sig = crypto.createHmac('sha256', secret)\n  .update(rawBody).digest('hex');\nif (`sha256=${sig}` !== req.headers['x-chargiz-signature'])\n  return res.status(401).end();"}</code>
          </div>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-95">
            J'ai copié mon secret
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeliveriesDialog({
  sub, deliveries, loading, onClose,
}: {
  sub: WebhookSubscription | null; deliveries: WebhookDelivery[];
  loading: boolean; onClose: () => void;
}) {
  if (!sub) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> Historique de livraisons
          </DialogTitle>
          <DialogDescription className="truncate">
            <code className="font-mono text-xs">{sub.url}</code>
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : deliveries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucune livraison enregistrée.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Événement", "Statut HTTP", "Tentative", "Date"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deliveries.map(d => {
                    const ok = d.http_status !== null && d.http_status >= 200 && d.http_status < 300;
                    return (
                      <tr key={d.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-mono">{d.event_type}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 font-semibold ${
                            d.http_status === null ? "bg-muted text-muted-foreground" :
                            ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          }`}>
                            {d.http_status ?? "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{d.attempt}</td>
                        <td className="px-3 py-2 text-muted-foreground">{relativeDate(d.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <DialogFooter>
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Fermer</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WebhooksTab({
  webhooks, onRefresh, onToggle, onDelete, onDeliveries,
}: {
  webhooks: WebhookSubscription[];
  onRefresh: () => void;
  onToggle: (sub: WebhookSubscription) => void;
  onDelete: (sub: WebhookSubscription) => void;
  onDeliveries: (sub: WebhookSubscription) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Bloc explicatif */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Webhook className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-card-foreground">Webhooks sortants</p>
            <p className="text-xs text-muted-foreground">
              ChargiZ envoie un <code className="font-mono">POST</code> signé vers votre URL à chaque événement.
              Vérifiez la signature <code className="font-mono">X-ChargiZ-Signature</code> avec votre secret.
            </p>
            <p className="text-xs text-muted-foreground">
              Événements supportés : <code className="font-mono">session.completed</code> — 3 tentatives (30s, 5min, 30min).
            </p>
          </div>
        </div>
      </div>

      {webhooks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Webhook className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-4 text-sm font-semibold text-foreground">Aucun webhook configuré</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Créez un webhook pour que votre FMS reçoive les événements ChargiZ en temps réel.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["URL", "Événements", "Statut", "Échecs", "Dernière livraison", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap last:text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {webhooks.map(sub => (
                  <tr key={sub.id} className={`transition-colors hover:bg-muted/30 ${!sub.is_active ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate font-mono text-xs text-foreground">{sub.url}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {sub.events.map(ev => (
                          <span key={ev} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            {WEBHOOK_EVENTS.find(e => e.value === ev)?.label ?? ev}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        sub.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                      }`}>
                        {sub.is_active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {sub.failure_count > 0 ? (
                        <span className="text-amber-600 font-medium">{sub.failure_count}</span>
                      ) : "0"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {relativeDate(sub.last_delivered_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onDeliveries(sub)}
                          title="Historique"
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onToggle(sub)}
                          title={sub.is_active ? "Désactiver" : "Activer"}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          {sub.is_active
                            ? <ToggleRight className="h-4 w-4 text-emerald-600" />
                            : <ToggleLeft className="h-4 w-4" />
                          }
                        </button>
                        <button
                          onClick={() => onDelete(sub)}
                          title="Supprimer"
                          className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
