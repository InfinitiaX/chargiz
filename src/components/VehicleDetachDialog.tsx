import { useState } from "react";
import { X, Car, AlertTriangle, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (continuerAbonnement: boolean) => Promise<void> | void;
  vehiculeLabel: string;
  collabName?: string | null;
  loading?: boolean;
}

/**
 * Dialog de détachement véhicule (CDC §3.3.7.2 + §2.4.3.1).
 * Workflow en 2 niveaux : détacher → continuer abonnement OU suspendre.
 */
export default function VehicleDetachDialog({ open, onClose, onConfirm, vehiculeLabel, collabName, loading = false }: Props) {
  const [continuer, setContinuer] = useState<boolean | null>(null);

  if (!open) return null;

  const handleConfirm = async () => {
    if (continuer === null) return;
    await onConfirm(continuer);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Car className="h-5 w-5 text-amber-600" />
            </div>
            <h2 className="text-base font-semibold text-card-foreground">Détacher le véhicule</h2>
          </div>
          <button onClick={onClose} disabled={loading} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Vous allez détacher <strong className="text-foreground">{vehiculeLabel}</strong>
            {collabName && <> de <strong className="text-foreground">{collabName}</strong></>}.
          </p>
          <p className="text-sm text-foreground font-medium">Que faire de l'abonnement Smartcar ?</p>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setContinuer(true)}
              disabled={loading}
              className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                continuer === true ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
              }`}
            >
              <p className="text-sm font-semibold text-card-foreground">Continuer l'abonnement</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Le véhicule reste connecté à Smartcar et peut être réaffecté à un autre collaborateur.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setContinuer(false)}
              disabled={loading}
              className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                continuer === false ? "border-amber-500 bg-amber-500/5" : "border-border hover:bg-muted"
              }`}
            >
              <p className="text-sm font-semibold text-card-foreground flex items-center gap-1.5">
                Suspendre l'abonnement
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                L'abonnement est arrêté. <strong>Des frais de réactivation seront facturés</strong> en cas de remise en service.
              </p>
            </button>
          </div>
        </div>

        <div className="border-t border-border px-6 py-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={loading} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || continuer === null}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Détacher
          </button>
        </div>
      </div>
    </div>
  );
}
