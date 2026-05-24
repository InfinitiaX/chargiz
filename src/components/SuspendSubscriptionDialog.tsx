import { X, AlertTriangle, Loader2, Check } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  /** "suspend" ou "reactivate" — change le message */
  mode: "suspend" | "reactivate";
  vehiculeLabel: string;
  loading?: boolean;
}

/**
 * Confirmation de suspension/réactivation Smartcar (CDC §3.3.7.4).
 * Affiche le message obligatoire sur les frais de réactivation.
 */
export default function SuspendSubscriptionDialog({ open, onClose, onConfirm, mode, vehiculeLabel, loading = false }: Props) {
  if (!open) return null;

  const isSuspend = mode === "suspend";
  const colorClass = isSuspend ? "amber" : "teal";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isSuspend ? "bg-amber-500/10" : "bg-chargiz-teal/10"}`}>
              <AlertTriangle className={`h-5 w-5 ${isSuspend ? "text-amber-600" : "text-chargiz-teal"}`} />
            </div>
            <h2 className="text-base font-semibold text-card-foreground">
              {isSuspend ? "Suspendre l'abonnement" : "Réactiver l'abonnement"}
            </h2>
          </div>
          <button onClick={onClose} disabled={loading} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            {isSuspend ? "Vous allez suspendre l'abonnement Smartcar de" : "Vous allez réactiver l'abonnement Smartcar de"}{" "}
            <strong className="text-foreground">{vehiculeLabel}</strong>.
          </p>

          {isSuspend ? (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" /> Frais à prévoir
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                La réactivation entraînera des <strong>frais de réactivation et de setup</strong> qui seront ajoutés sur votre prochaine facture.
                La collecte des données de recharge sera interrompue jusqu'à la réactivation.
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-chargiz-teal/10 border border-chargiz-teal/30 p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-chargiz-teal">
                <Check className="h-4 w-4" /> Reprise immédiate
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                La collecte des données de recharge reprendra immédiatement. Les frais de réactivation et de setup seront facturés sur votre prochaine facture.
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Un email de confirmation sera envoyé au collaborateur, au gestionnaire et au super-administrateur.
          </p>
        </div>

        <div className="border-t border-border px-6 py-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={loading} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onConfirm()}
            disabled={loading}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-40 ${
              isSuspend ? "bg-amber-600 hover:bg-amber-700" : "bg-chargiz-teal hover:bg-chargiz-teal-light"
            }`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSuspend ? "Confirmer la suspension" : "Confirmer la réactivation"}
          </button>
        </div>
      </div>
    </div>
  );
}
