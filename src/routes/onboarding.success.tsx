import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, AlertCircle, Car } from "lucide-react";

export const Route = createFileRoute("/onboarding/success")({
  component: OnboardingSuccessPage,
  head: () => ({
    meta: [
      { title: "ChargiZ — Véhicule connecté" },
    ],
  }),
});

function OnboardingSuccessPage() {
  const search = new URLSearchParams(window.location.search);
  const error = search.get("error");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-2">
            <Car className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold tracking-tight text-foreground">ChargiZ</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
          {error ? (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-7 w-7 text-destructive" />
              </div>
              <h1 className="text-xl font-bold text-foreground mb-2">Connexion échouée</h1>
              <p className="text-sm text-muted-foreground mb-6">
                {error === "session_invalide"
                  ? "Le lien de connexion a expiré ou est invalide. Veuillez contacter votre gestionnaire pour obtenir un nouveau lien."
                  : error === "smartcar_vehicule"
                  ? "Impossible de récupérer les informations du véhicule depuis Smartcar. Vérifiez que votre véhicule est compatible et réessayez."
                  : "Une erreur est survenue lors de la connexion à Smartcar. Veuillez réessayer ou contacter votre gestionnaire."}
              </p>
              <p className="text-xs text-muted-foreground">Code d'erreur : <code className="font-mono">{error}</code></p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-chargiz-teal/10">
                <CheckCircle2 className="h-7 w-7 text-chargiz-teal" />
              </div>
              <h1 className="text-xl font-bold text-foreground mb-2">Votre véhicule est connecté !</h1>
              <p className="text-sm text-muted-foreground mb-6">
                La connexion Smartcar a bien été établie. Vos recharges à domicile seront désormais
                automatiquement détectées et transmises à votre gestionnaire.
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-95"
              >
                Accéder à mon espace
              </Link>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Vous pouvez fermer cette fenêtre si vous n'avez pas de compte ChargiZ.
        </p>
      </div>
    </div>
  );
}
