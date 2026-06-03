import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import logoChargiz from "@/assets/logo-chargiz.png";
import loginHero from "@/assets/login-hero.jpg";
import { CheckCircle, Eye, EyeOff, Lock, TriangleAlert } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || "",
    };
  },
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "ChargiZ — Réinitialiser le mot de passe" },
      { name: "description", content: "Réinitialisez votre mot de passe ChargiZ." },
    ],
  }),
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Lien de réinitialisation invalide ou expiré.");
      return;
    }
    if (password !== confirmPwd) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("https://api.chargiz.io/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Erreur lors de la réinitialisation du mot de passe");
      }
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Branding (identique à la page de connexion) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center p-12">
        <img
          src={loginHero}
          alt="Borne de recharge ChargiZ"
          width={1280}
          height={1600}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary via-primary/80 to-primary/30" />
        <div className="relative z-10 max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <img
              src={logoChargiz}
              alt="ChargiZ"
              width={224}
              height={56}
              decoding="async"
              className="h-14 w-auto drop-shadow-lg"
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-primary-foreground">
            La recharge électrique,
            <br />
            <span className="text-accent">simplifiée.</span>
          </h1>
          <p className="mt-6 text-lg text-primary-foreground/90 leading-relaxed">
            Suivez, gérez et remboursez les recharges de véhicules électriques de vos collaborateurs en toute simplicité.
          </p>
        </div>
      </div>

      {/* Right Panel — Formulaire */}
      <div className="flex w-full items-center justify-center bg-background px-6 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">

          {done ? (
            /* ——— État succès ——— */
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-chargiz-teal/10 p-4">
                  <CheckCircle className="h-12 w-12 text-chargiz-teal" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Mot de passe modifié !</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Votre mot de passe a été mis à jour avec succès.<br />Vous pouvez maintenant vous connecter.
                </p>
              </div>
              <a
                href="/"
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#0f4b49] py-3 text-sm font-semibold text-white transition-all hover:bg-[#0d3f3d] active:scale-[0.98]"
              >
                Retour à la connexion
              </a>
            </div>
          ) : (
            /* ——— Formulaire ——— */
            <>
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Lock className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Nouveau mot de passe</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Choisissez un mot de passe sécurisé d'au moins 8 caractères
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/8 p-4 flex gap-3">
                  <TriangleAlert className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm font-medium text-destructive">{error}</p>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirm" className="text-sm font-medium text-foreground">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="confirm"
                      type={showConfirm ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={confirmPwd}
                      onChange={e => setConfirmPwd(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#0f4b49] py-3 text-sm font-semibold text-white transition-all hover:bg-[#0d3f3d] active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? "Modification en cours..." : "Modifier le mot de passe"}
                </button>

                <div className="text-center">
                  <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Retour à la connexion
                  </a>
                </div>
              </form>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} ChargiZ — Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
}
