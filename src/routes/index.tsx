import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import logoDark from "@/assets/logo-dark.jpg";
import { useState } from "react";
import { Eye, EyeOff, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "ChargiZ — Connexion" },
      { name: "description", content: "Connectez-vous à votre espace ChargiZ pour gérer les recharges de véhicules électriques." },
    ],
  }),
});

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 h-64 w-64 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-20 right-10 h-80 w-80 rounded-full bg-accent blur-3xl" />
        </div>
        <div className="relative z-10 max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent">
              <Zap className="h-10 w-10 text-accent-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-primary-foreground">
            La recharge électrique,
            <br />
            <span className="text-accent">simplifiée.</span>
          </h1>
          <p className="mt-6 text-lg text-primary-foreground/70 leading-relaxed">
            Suivez, gérez et remboursez les recharges de véhicules électriques de vos collaborateurs en toute simplicité.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex w-full items-center justify-center bg-background px-6 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <img src={logoDark} alt="ChargiZ" className="mx-auto h-12 w-auto" />
            <h2 className="mt-8 text-2xl font-bold tracking-tight text-foreground">
              Connexion à votre espace
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Entrez vos identifiants pour accéder à la plateforme
            </p>
          </div>

          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = "/dashboard";
            }}
          >
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                placeholder="nom@entreprise.fr"
                defaultValue="admin@chargiz.fr"
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  defaultValue="password"
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" />
                Se souvenir de moi
              </label>
              <button type="button" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                Mot de passe oublié ?
              </button>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-chargiz-teal-light active:scale-[0.98]"
            >
              Se connecter
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} ChargiZ — Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
}
