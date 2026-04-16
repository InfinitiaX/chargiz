import { createFileRoute } from "@tanstack/react-router";
import { Building2, User, Shield, CreditCard } from "lucide-react";

export const Route = createFileRoute("/dashboard/reglages")({
  component: ReglagesPage,
  head: () => ({
    meta: [
      { title: "ChargiZ — Réglages" },
      { name: "description", content: "Paramètres de votre espace ChargiZ." },
    ],
  }),
});

function ReglagesPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Réglages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Paramètres de l'entreprise et du compte</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Informations entreprise */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">Informations entreprise</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Raison sociale</label>
                <p className="mt-1 text-sm text-card-foreground">ACME Corp</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">SIREN</label>
                <p className="mt-1 text-sm font-mono text-card-foreground">123 456 789</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Adresse</label>
                <p className="mt-1 text-sm text-card-foreground">15 rue des Archives, 75004 Paris</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Secteur d'activité</label>
                <p className="mt-1 text-sm text-card-foreground">Technologies</p>
              </div>
            </div>
          </div>
        </div>

        {/* Compte gestionnaire */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <User className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">Compte gestionnaire</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nom</label>
                <p className="mt-1 text-sm text-card-foreground">Yassine Moumen</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="mt-1 text-sm text-card-foreground">yassine.moumen@chargiz.com</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Rôle</label>
                <p className="mt-1 text-sm text-card-foreground">Superadmin</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                <p className="mt-1 text-sm text-card-foreground">06 00 00 00 00</p>
              </div>
            </div>
          </div>
        </div>

        {/* Politique de recharge */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <CreditCard className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">Politique de recharge</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Mode de remboursement</label>
                <p className="mt-1 text-sm text-card-foreground">Global (même tarif pour tous)</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Prix du kWh</label>
                <p className="mt-1 text-sm text-card-foreground">0,15 €</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Plafond mensuel</label>
                <p className="mt-1 text-sm text-card-foreground">Non défini</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Remboursement hors domicile</label>
                <p className="mt-1 text-sm text-card-foreground">Inclus</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
