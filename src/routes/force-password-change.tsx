import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Lock, ShieldCheck, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import logoChargiz from "@/assets/logo-chargiz.png";
import { toast } from "sonner";

export const Route = createFileRoute("/force-password-change")({
  component: ForcePasswordChange,
  head: () => ({
    meta: [
      { title: "ChargiZ — Changement de mot de passe" },
      { name: "description", content: "Changez votre mot de passe temporaire avant d'accéder à la plateforme." },
    ],
  }),
});

function ForcePasswordChange() {
  const navigate = useNavigate();
  const { user, updatePassword, refresh } = useAuth();

  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si l'utilisateur n'est pas connecté ou n'a pas besoin de changer, on redirige
  if (!user) {
    navigate({ to: "/" });
    return null;
  }
  if (!user.password_change_required) {
    navigate({ to: "/dashboard" });
    return null;
  }

  // Validations live
  const ruleLength = newPwd.length >= 8;
  const ruleDigit = /\d/.test(newPwd);
  const ruleUpper = /[A-Z]/.test(newPwd);
  const ruleLower = /[a-z]/.test(newPwd);
  const ruleMatch = newPwd.length > 0 && newPwd === confirm;
  const ruleDifferent = newPwd.length > 0 && newPwd !== oldPwd;
  const allValid = ruleLength && ruleDigit && ruleUpper && ruleLower && ruleMatch && ruleDifferent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!allValid) {
      setError("Le mot de passe ne respecte pas toutes les exigences ci-dessous.");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(oldPwd, newPwd);
      // Re-charge le profile pour mettre à jour password_change_required = false
      await refresh();
      toast.success("Mot de passe modifié", {
        description: "Bienvenue sur ChargiZ. Vous êtes désormais connecté(e).",
        icon: <CheckCircle2 className="h-4 w-4" />,
        duration: 5000,
      });
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err.message || "Erreur lors du changement de mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  const Rule = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
    <li className={`flex items-center gap-2 text-xs ${ok ? "text-chargiz-teal" : "text-muted-foreground"}`}>
      <span className={`flex h-4 w-4 items-center justify-center rounded-full ${ok ? "bg-chargiz-teal/15" : "bg-muted"}`}>
        {ok ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />}
      </span>
      {children}
    </li>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <img src={logoChargiz} alt="ChargiZ" className="mx-auto h-12 w-auto mb-6" />
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bienvenue, {user.full_name?.split(" ")[0] || "—"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pour des raisons de sécurité, vous devez choisir un nouveau mot de passe avant d'accéder à votre espace.
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive leading-snug">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Mot de passe temporaire</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showOld ? "text" : "password"}
                required
                value={oldPwd}
                onChange={e => setOldPwd(e.target.value)}
                placeholder="Reçu par email"
                className="w-full rounded-lg border border-input bg-background pl-10 pr-10 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button type="button" onClick={() => setShowOld(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nouveau mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showNew ? "text" : "password"}
                required
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="Choisissez un mot de passe fort"
                className="w-full rounded-lg border border-input bg-background pl-10 pr-10 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button type="button" onClick={() => setShowNew(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Confirmer le nouveau mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showNew ? "text" : "password"}
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Retapez le mot de passe"
                className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Règles de robustesse */}
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Le mot de passe doit contenir</p>
            <ul className="space-y-1">
              <Rule ok={ruleLength}>Au moins 8 caractères</Rule>
              <Rule ok={ruleUpper}>Une lettre majuscule</Rule>
              <Rule ok={ruleLower}>Une lettre minuscule</Rule>
              <Rule ok={ruleDigit}>Un chiffre</Rule>
              <Rule ok={ruleDifferent}>Différent du mot de passe temporaire</Rule>
              <Rule ok={ruleMatch}>Confirmation identique</Rule>
            </ul>
          </div>

          <button
            type="submit"
            disabled={!allValid || loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg hover:bg-chargiz-teal-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Mise à jour…
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" /> Définir mon mot de passe
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-muted-foreground">
          Sécurisé par ChargiZ — vos identifiants sont chiffrés en base.
        </p>
      </div>
    </div>
  );
}
