import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import CreateUserDialog from "@/components/CreateUserDialog";
import {
  ShieldCheck, Eye, Users, Car, Database, BarChart3, KeyRound, Trash2, Plus
} from "lucide-react";

export const Route = createFileRoute("/dashboard/administration")({
  component: AdministrationPage,
  head: () => ({ meta: [{ title: "ChargiZ — Administration" }] }),
});

interface ActionItem {
  label: string;
  icon: React.ElementType;
  to?: string;
  variant?: "default" | "danger";
  hint?: string;
}
interface ActionGroup { title: string; items: ActionItem[]; }

function getGroupsForRole(role: AppRole): ActionGroup[] {
  if (role === "superadmin") {
    return [
      { title: "Périmètre de visibilité", items: [
        { label: "Accès toutes entreprises", icon: Eye, to: "/dashboard/listes/entreprises" },
        { label: "Accès tous collaborateurs", icon: Eye, to: "/dashboard/listes/collaborateurs" },
        { label: "Accès tous véhicules", icon: Eye, to: "/dashboard/listes/vehicules" },
      ]},
      { title: "Gestion des comptes", items: [
        { label: "Créer compte Gest. Entreprise", icon: Plus, to: "/dashboard/listes/entreprises" },
        { label: "Créer collaborateur", icon: Plus, to: "/dashboard/listes/collaborateurs" },
        { label: "Supprimer Entreprise", icon: Trash2, to: "/dashboard/listes/entreprises", variant: "danger" },
      ]},
      { title: "Données & Réglages", items: [
        { label: "Voir statistiques globales", icon: BarChart3, to: "/dashboard/statistiques" },
        { label: "Modifier mot de passe", icon: KeyRound, to: "/dashboard/reglages" },
      ]},
    ];
  }

  if (role === "gestionnaire_entreprise") {
    return [
      { title: "Périmètre de visibilité", items: [
        { label: "Mon entreprise", icon: Eye, to: "/dashboard/listes/entreprises" },
        { label: "Collaborateurs", icon: Eye, to: "/dashboard/listes/collaborateurs" },
        { label: "Véhicules", icon: Eye, to: "/dashboard/listes/vehicules" },
      ]},
      { title: "Gestion des comptes", items: [
        { label: "Créer collaborateur", icon: Plus, to: "/dashboard/listes/collaborateurs" },
      ]},
      { title: "Données & Réglages", items: [
        { label: "Statistiques (entreprise)", icon: BarChart3, to: "/dashboard/statistiques" },
        { label: "Modifier mot de passe", icon: KeyRound, to: "/dashboard/reglages" },
      ]},
    ];
  }

  return [
    { title: "Mes données", items: [
      { label: "Voir mes sessions", icon: Database, to: "/dashboard/mes-consommations" },
      { label: "Ma performance", icon: BarChart3, to: "/dashboard" },
    ]},
    { title: "Mon compte", items: [
      { label: "Modifier mot de passe", icon: KeyRound, to: "/dashboard/reglages" },
    ]},
  ];
}

const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: "Superadmin",
  gestionnaire_entreprise: "Gestionnaire d'entreprise",
  gestionnaire_filiale: "Gestionnaire de filiale",
  gestionnaire_site: "Gestionnaire de site",
  collaborateur: "Collaborateur",
};

function AdministrationPage() {
  const { role, profile, loading } = useAuth();
  const [showCreateUser, setShowCreateUser] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!role) {
    return <div className="p-4 sm:p-6 md:p-8"><p className="text-muted-foreground">Accès non autorisé.</p></div>;
  }

  const groups = getGroupsForRole(role);
  const canCreateAccounts = role !== "collaborateur";

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Administration — {ROLE_LABELS[role]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Actions disponibles selon votre rôle et votre périmètre organisationnel
        </p>
        </div>
        {canCreateAccounts && (
          <button onClick={() => setShowCreateUser(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-chargiz-teal-light">
            <Plus className="h-4 w-4" /> Creer un compte
          </button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (group && (
          <div key={group.title} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-5 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </h2>
            </div>
            <div className="divide-y divide-border">
              {group.items.map((item, idx) => {
                const baseClass = `flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                  item.variant === "danger"
                    ? "text-destructive hover:bg-destructive/5"
                    : "text-card-foreground hover:bg-muted/40"
                }`;
                const content = (
                  <>
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.hint && (
                      <span className="text-xs text-muted-foreground italic">{item.hint}</span>
                    )}
                  </>
                );
                return item.to ? (
                  <Link key={idx} to={item.to} className={baseClass}>{content}</Link>
                ) : (
                  <div key={idx} className={baseClass}>{content}</div>
                );
              })}
            </div>
          </div>
        )))}
      </div>
      {canCreateAccounts && (
        <CreateUserDialog
          actorRole={role}
          profile={profile}
          open={showCreateUser}
          onClose={() => setShowCreateUser(false)}
          onCreated={() => setShowCreateUser(false)}
        />
      )}
    </div>
  );
}
