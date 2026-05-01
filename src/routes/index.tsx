import { createFileRoute, redirect } from "@tanstack/react-router";

// Front-only demo: bypass login and land directly on the dashboard.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
  head: () => ({
    meta: [
      { title: "ChargiZ — Démo" },
      { name: "description", content: "Maquette ChargiZ : suivi et gestion des recharges de véhicules électriques." },
    ],
  }),
});

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("La réinitialisation du mot de passe n'est pas encore branchée sur le nouveau backend.");
    setForgotSent(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
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

      {/* Right Panel - Login Form */}
      <div className="flex w-full items-center justify-center bg-background px-6 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {forgotMode ? "Mot de passe oublié" : "Connexion à votre espace"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {forgotMode
                ? "Entrez votre email pour recevoir un lien de réinitialisation"
                : "Entrez vos identifiants pour accéder à la plateforme"}
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          {forgotSent ? (
            <div className="rounded-lg bg-chargiz-teal/10 p-4 text-center">
              <p className="text-sm text-chargiz-teal font-medium">Email envoyé ! Vérifiez votre boîte mail.</p>
              <button onClick={() => { setForgotMode(false); setForgotSent(false); }} className="mt-3 text-sm text-primary hover:underline">Retour à la connexion</button>
            </div>
          ) : forgotMode ? (
            <form className="space-y-5" onSubmit={handleForgotPassword}>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">Email ou nom d'utilisateur</label>
                <input id="email" type="text" required placeholder="superadmin ou nom@entreprise.fr" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-50">
                {loading ? "Envoi..." : "Envoyer le lien"}
              </button>
              <button type="button" onClick={() => setForgotMode(false)} className="w-full text-sm text-muted-foreground hover:text-foreground">Retour à la connexion</button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">Email ou nom d'utilisateur</label>
                <input id="email" type="text" required placeholder="superadmin ou nom@entreprise.fr" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">Mot de passe</label>
                <div className="relative">
                  <input id="password" type={showPassword ? "text" : "password"} required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" />
                  Se souvenir de moi
                </label>
                <button type="button" onClick={() => setForgotMode(true)} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  Mot de passe oublié ?
                </button>
              </div>
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-50">
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} ChargiZ — Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
}
