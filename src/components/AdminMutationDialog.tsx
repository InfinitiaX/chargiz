import { useState, useEffect } from "react";
import { X, ArrowLeftRight, ChevronRight, AlertCircle, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Admin {
  id: number;
  email: string;
  full_name: string | null;
  nb_entreprises: number;
}

interface Props {
  open: boolean;
  admins: Admin[];
  onClose: () => void;
  onCompleted: () => void;
}

/**
 * Dialog de mutation : transfère toutes les entreprises de l'admin A vers l'admin B.
 * Utile quand un admin quitte, est réaffecté, ou lors d'un rééquilibrage.
 */
export default function AdminMutationDialog({ open, admins, onClose, onCompleted }: Props) {
  const [fromId, setFromId] = useState<number | null>(null);
  const [toId, setToId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFromId(null);
    setToId(null);
    setError(null);
  }, [open]);

  if (!open) return null;

  const fromAdmin = admins.find(a => a.id === fromId);
  const toAdmin = admins.find(a => a.id === toId);
  const canSubmit = fromId !== null && toId !== null && fromId !== toId;

  const handleSubmit = async () => {
    if (!canSubmit || !fromAdmin || !toAdmin) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.admins.mutation(fromId!, toId!);
      toast.success("Mutation effectuée", {
        description: `${res.transferred} entreprise(s) transférée(s)${res.skipped_already_assigned > 0 ? `, ${res.skipped_already_assigned} déjà attribuée(s) au cible (ignorée(s))` : ""}.`,
        duration: 6000,
      });
      onCompleted();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mutation.");
    } finally {
      setSaving(false);
    }
  };

  const label = (a: Admin) => `${a.full_name || a.email}${a.nb_entreprises ? ` (${a.nb_entreprises} entr.)` : " (0 entr.)"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-card-foreground">Mutation d'entreprises</h2>
              <p className="text-xs text-muted-foreground">Transférer toutes les entreprises d'un admin vers un autre.</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Admin source</label>
            <select
              value={fromId ?? ""}
              onChange={e => setFromId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Sélectionner...</option>
              {admins.map(a => (
                <option key={a.id} value={a.id} disabled={a.id === toId}>{label(a)}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">Les entreprises gérées par cet admin seront transférées.</p>
          </div>

          <div className="flex justify-center">
            <ArrowLeftRight className="h-5 w-5 text-primary rotate-90" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Admin cible</label>
            <select
              value={toId ?? ""}
              onChange={e => setToId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Sélectionner...</option>
              {admins.map(a => (
                <option key={a.id} value={a.id} disabled={a.id === fromId}>{label(a)}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">Les entreprises déjà attribuées à cet admin seront ignorées (pas dédoublées).</p>
          </div>

          {canSubmit && fromAdmin && toAdmin && (
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-snug">
                <strong>{fromAdmin.nb_entreprises}</strong> entreprise(s) seront transférées de{" "}
                <strong>{fromAdmin.full_name || fromAdmin.email}</strong> vers{" "}
                <strong>{toAdmin.full_name || toAdmin.email}</strong>.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? (
                <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Transfert...</>
              ) : (
                <>Transférer <ChevronRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
