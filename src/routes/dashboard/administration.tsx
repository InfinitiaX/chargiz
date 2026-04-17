import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  ShieldCheck, Building2, MapPin, Users, Car, Database, Download,
  Euro, BarChart3, Settings, Plug, KeyRound, Link2, FileText,
  Calendar, Clock, Trash2, Plus, Power,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/administration")({
  component: AdministrationPage,
  head: () => ({ meta: [{ title: "ChargiZ — Administration" }] }),
});

interface ActionItem {
  label: string;
  icon: React.ElementType;
  to?: string;
  onClick?: () => void;
  variant?: "default" | "danger";
}

interface ActionGroup {
  title: string;
  items: ActionItem[];
}

function AdministrationPage() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (role !== "superadmin" && role !== "admin") {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  const isSuperadmin = role === "superadmin";

  const groups: ActionGroup[] = [
    {
      title: "Comptes",
      items: [
        ...(isSuperadmin ? [{ label: "Créer compte Admin", icon: Plus, to: "/dashboard/listes/admins" }] : []),
        { label: "Créer compte Gest. Entreprise", icon: Plus, to: "/dashboard/listes/entreprises" },
        { label: "Créer compte Gest. Filiale", icon: Plus, to: "/dashboard/listes/filiales" },
        { label: "Créer compte Gest. Site", icon: Plus, to: "/dashboard/listes/sites" },
        { label: "Créer collaborateur", icon: Plus, to: "/dashboard/listes/collaborateurs" },
        ...(isSuperadmin ? [{ label: "Archiver Admin", icon: Trash2, to: "/dashboard/listes/admins", variant: "danger" as const }] : []),
        { label: "Archiver Gest. Entreprise", icon: Trash2, to: "/dashboard/listes/entreprises", variant: "danger" },
        { label: "Archiver Gest. Filiale", icon: Trash2, to: "/dashboard/listes/filiales", variant: "danger" },
        { label: "Archiver Gest. Site", icon: Trash2, to: "/dashboard/listes/sites", variant: "danger" },
        { label: "Archiver collaborateur", icon: Trash2, to: "/dashboard/listes/collaborateurs", variant: "danger" },
      ],
    },
    {
      title: "Données",
      items: [
        { label: "Voir données de recharge", icon: Database, to: "/dashboard/statistiques" },
        { label: "Exporter les données", icon: Download, to: "/dashboard/statistiques" },
        { label: "Modifier prix kWh", icon: Euro, to: "/dashboard/reglages" },
        { label: "Voir statistiques globales", icon: BarChart3, to: "/dashboard/statistiques" },
      ],
    },
    {
      title: "Véhicules",
      items: [
        { label: "Ajouter véhicule", icon: Plus, to: "/dashboard/listes/vehicules" },
        { label: "Modifier véhicule", icon: Car, to: "/dashboard/listes/vehicules" },
        { label: "Archiver véhicule", icon: Trash2, to: "/dashboard/listes/vehicules", variant: "danger" },
        { label: "Détacher véhicule", icon: Power, to: "/dashboard/listes/vehicules" },
        { label: "Suspendre abonnement véhicule", icon: Power, to: "/dashboard/listes/vehicules" },
      ],
    },
    {
      title: "Politique de recharge",
      items: [
        { label: "Définir politique (entreprise)", icon: FileText, to: "/dashboard/reglages" },
        { label: "Définir politique (filiale)", icon: FileText, to: "/dashboard/reglages" },
        { label: "Définir politique (site)", icon: FileText, to: "/dashboard/reglages" },
        { label: "Saisir prix kWh", icon: Euro, to: "/dashboard/reglages" },
        { label: "Saisir jours éligibles", icon: Calendar, to: "/dashboard/reglages" },
        { label: "Déclarer congés", icon: Calendar, to: "/dashboard/reglages" },
        { label: "Définir dates fermeture entreprise", icon: Clock, to: "/dashboard/reglages" },
      ],
    },
    {
      title: "Réglages",
      items: [
        { label: "Modifier infos entreprise", icon: Building2, to: "/dashboard/reglages" },
        { label: "Modifier infos filiale", icon: Building2, to: "/dashboard/reglages" },
        { label: "Modifier infos site", icon: MapPin, to: "/dashboard/reglages" },
        { label: "Modifier infos perso", icon: Users, to: "/dashboard/mes-infos" },
        { label: "Modifier mot de passe", icon: KeyRound, to: "/dashboard/mes-infos" },
        { label: "Modifier FE thermique (CO₂)", icon: Settings, to: "/dashboard/reglages" },
      ],
    },
    {
      title: "Intégrations",
      items: [
        { label: "Gérer intégrations (API)", icon: Plug, to: "/dashboard/reglages" },
        { label: "Générer clés API", icon: KeyRound, to: "/dashboard/reglages" },
        { label: "Connexion Smartcar (OAuth)", icon: Link2, to: "/dashboard/reglages" },
      ],
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Administration {isSuperadmin ? "— Superadmin" : "— Admin"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Centre de contrôle complet de la plateforme ChargiZ
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
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
                if (item.to) {
                  return (
                    <Link key={idx} to={item.to} className={baseClass}>
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                }
                return (
                  <button key={idx} onClick={item.onClick} className={baseClass + " w-full text-left"}>
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
