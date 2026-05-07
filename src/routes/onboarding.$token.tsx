import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Car, CheckCircle2, ChevronRight, Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/onboarding/$token")({
  component: OnboardingPage,
  head: () => ({
    meta: [
      { title: "ChargiZ — Finalisation inscription" },
      { name: "description", content: "Connectez votre véhicule pour activer votre compte ChargiZ." },
    ],
  }),
});

function OnboardingPage() {
  const { token } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<any>(`/api/onboarding/${token}`)
      .then(data => { setUser(data); setLoading(false); })
      .catch(() => { setError("Ce lien de finalisation est invalide ou a expiré."); setLoading(false); });
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Lien invalide</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <a href="/" className="mt-6 inline-block text-primary hover:underline">Retour à l'accueil</a>
        </div>
      </div>
    );
  }

  const prenom = (user.full_name || "").split(" ")[0] || "Bienvenue";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg space-y-8">

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6 shadow-sm border border-primary/10">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Bienvenue, <span className="text-primary">{prenom}</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Connectez votre véhicule électrique pour activer votre compte ChargiZ.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8 space-y-6">

          {/* Étapes */}
          <div className="space-y-3">
            {[
              "Vous serez redirigé vers Smartcar",
              "Choisissez votre constructeur (Tesla, Renault…)",
              "Connectez-vous avec votre compte constructeur",
              "ChargiZ récupère vos données automatiquement",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <p className="text-sm text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>

          {/* Bouton principal */}
          <a
            href={user.smartcar_auth_url}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-sm font-bold text-primary-foreground shadow-lg transition-all hover:bg-chargiz-teal-light hover:shadow-primary/20 active:scale-[0.98]"
          >
            Connecter mon véhicule via Smartcar
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>

          <p className="text-center text-xs text-muted-foreground">
            ChargiZ ne voit jamais vos identifiants constructeur. La connexion est sécurisée par Smartcar OAuth.
          </p>
        </div>

        <div className="text-center opacity-40">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Sécurisé par Smartcar & ChargiZ
          </span>
        </div>
      </div>
    </div>
  );
}
