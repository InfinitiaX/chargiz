import { useState } from "react";
import { X, UserX, AlertTriangle, Loader2, ChevronLeft } from "lucide-react";

type VehiculeAction = "sortir_flotte" | "garder";
type AbonnementAction = "continuer" | "suspendre";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: { vehicule_action: VehiculeAction; abonnement_action: AbonnementAction | null }) => Promise<void> | void;
  collabName: string;
  hasVehicule: boolean;
  vehiculeLabel?: string;
  loading?: boolean;
}

/**
 * Workflow de révocation collaborateur (CDC §2.4.3.1) :
 * 1. (si véhicule) Que faire du véhicule ? sortir_flotte | garder
 * 2. (si garder) Continuer | Suspendre l'abonnement
 * 3. (si suspendre) Confirmation avec message frais
 */
export default function RevokeCollaborateurDialog({ open, onClose, onConfirm, collabName, hasVehicule, vehiculeLabel, loading = false }: Props) {
  type Step = "vehicule_action" | "abonnement_action" | "confirm" | "no_vehicule_confirm";
  const [step, setStep] = useState<Step>(hasVehicule ? "vehicule_action" : "no_vehicule_confirm");
  const [vehiculeAction, setVehiculeAction] = useState<VehiculeAction | null>(null);
  const [abonnementAction, setAbonnementAction] = useState<AbonnementAction | null>(null);

  if (!open) return null;

  const reset = () => {
    setStep(hasVehicule ? "vehicule_action" : "no_vehicule_confirm");
    setVehiculeAction(null);
    setAbonnementAction(null);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleNext = () => {
    if (step === "vehicule_action") {
      if (!vehiculeAction) return;
      if (vehiculeAction === "sortir_flotte") {
        // Pas de question abonnement — on sort tout
        setStep("confirm");
      } else {
        setStep("abonnement_action");
      }
    } else if (step === "abonnement_action") {
      if (!abonnementAction) return;
      setStep("confirm");
    }
  };

  const handleBack = () => {
    if (step === "abonnement_action") setStep("vehicule_action");
    else if (step === "confirm" && hasVehicule) setStep(vehiculeAction === "sortir_flotte" ? "vehicule_action" : "abonnement_action");
  };

  const handleFinalConfirm = async () => {
    await onConfirm({
      vehicule_action: vehiculeAction || "garder",
      abonnement_action: vehiculeAction === "garder" ? abonnementAction : null,
    });
    reset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
              <UserX className="h-5 w-5 text-destructive" />
            </div>
            <h2 className="text-base font-semibold text-card-foreground">Révoquer le collaborateur</h2>
          </div>
          <button onClick={handleClose} disabled={loading} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* ─── Step 1: action véhicule ─── */}
          {step === "vehicule_action" && (
            <>
              <p className="text-sm text-muted-foreground">
                Vous allez révoquer <strong className="text-foreground">{collabName}</strong>.
              </p>
              <p className="text-sm text-foreground font-medium">Que faire du véhicule {vehiculeLabel && <em>({vehiculeLabel})</em>} ?</p>
              <div className="space-y-2">
                <button type="button" onClick={() => setVehiculeAction("garder")}
                  className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                    vehiculeAction === "garder" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  }`}>
                  <p className="text-sm font-semibold text-card-foreground">Garder le véhicule dans la flotte</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Il devient disponible pour un autre collaborateur.</p>
                </button>
                <button type="button" onClick={() => setVehiculeAction("sortir_flotte")}
                  className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                    vehiculeAction === "sortir_flotte" ? "border-amber-500 bg-amber-500/5" : "border-border hover:bg-muted"
                  }`}>
                  <p className="text-sm font-semibold text-card-foreground">Sortir le véhicule de la flotte</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Le véhicule est archivé et n'apparaît plus dans la flotte active.</p>
                </button>
              </div>
            </>
          )}

          {/* ─── Step 2: action abonnement ─── */}
          {step === "abonnement_action" && (
            <>
              <p className="text-sm text-foreground font-medium">Que faire de l'abonnement Smartcar ?</p>
              <div className="space-y-2">
                <button type="button" onClick={() => setAbonnementAction("continuer")}
                  className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                    abonnementAction === "continuer" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  }`}>
                  <p className="text-sm font-semibold text-card-foreground">Continuer l'abonnement</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Le véhicule reste connecté Smartcar.</p>
                </button>
                <button type="button" onClick={() => setAbonnementAction("suspendre")}
                  className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                    abonnementAction === "suspendre" ? "border-amber-500 bg-amber-500/5" : "border-border hover:bg-muted"
                  }`}>
                  <p className="text-sm font-semibold text-card-foreground flex items-center gap-1.5">
                    Suspendre l'abonnement
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <strong>Frais de réactivation</strong> à prévoir si remise en service ultérieure.
                  </p>
                </button>
              </div>
            </>
          )}

          {/* ─── Step 3: confirmation ─── */}
          {step === "confirm" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3">
                <p className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Confirmation finale
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Le collaborateur <strong className="text-foreground">{collabName}</strong> sera désactivé.
                </p>
              </div>
              <div className="text-xs space-y-1.5 rounded-lg bg-muted/40 p-3">
                <p>• <strong>Véhicule</strong> : {vehiculeAction === "sortir_flotte" ? "sorti de la flotte (archivé)" : "gardé dans la flotte (non affecté)"}</p>
                {vehiculeAction === "garder" && (
                  <p>• <strong>Abonnement</strong> : {abonnementAction === "suspendre" ? "suspendu (frais de réactivation à prévoir)" : "maintenu actif"}</p>
                )}
                <p>• <strong>Compte</strong> : désactivé immédiatement</p>
              </div>
            </div>
          )}

          {step === "no_vehicule_confirm" && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3">
              <p className="text-sm">
                Vous allez révoquer <strong>{collabName}</strong>. Son compte sera désactivé.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-border px-6 py-4 flex justify-between gap-3">
          {(step === "abonnement_action" || step === "confirm") && hasVehicule ? (
            <button onClick={handleBack} disabled={loading} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" /> Retour
            </button>
          ) : <span />}
          <div className="flex gap-3">
            <button onClick={handleClose} disabled={loading} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
              Annuler
            </button>
            {step === "confirm" || step === "no_vehicule_confirm" ? (
              <button onClick={handleFinalConfirm} disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-destructive px-5 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Révoquer
              </button>
            ) : (
              <button onClick={handleNext}
                disabled={(step === "vehicule_action" && !vehiculeAction) || (step === "abonnement_action" && !abonnementAction)}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
                Suivant
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
