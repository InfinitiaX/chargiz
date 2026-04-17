import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import {
  ShieldCheck, Building2, MapPin, Users, Car, Database, Download,
  Euro, BarChart3, Settings, Plug, KeyRound, Link2, FileText,
  Calendar, Clock, Trash2, Plus, Power, User as UserIcon, Eye,
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

// Matrice des permissions selon le tableau RBAC ChargiZ
function getGroupsForRole(role: AppRole): ActionGroup[] {
  // ===== SUPERADMIN : tout =====
  if (role === "superadmin") {
    return [
      { title: "Périmètre de visibilité", items: [
        { label: "Accès toutes entreprises", icon: Eye, to: "/dashboard/listes/entreprises" },
        { label: "Accès toutes filiales", icon: Eye, to: "/dashboard/listes/filiales" },
        { label: "Accès tous sites", icon: Eye, to: "/dashboard/listes/sites" },
        { label: "Accès tous collaborateurs", icon: Eye, to: "/dashboard/listes/collaborateurs" },
        { label: "Accès tous véhicules", icon: Eye, to: "/dashboard/listes/vehicules" },
      ]},
      { title: "Gestion des comptes", items: [
        { label: "Créer compte Admin", icon: Plus, to: "/dashboard/listes/admins" },
        { label: "Créer compte Gest. Entreprise", icon: Plus, to: "/dashboard/listes/entreprises" },
        { label: "Créer compte Gest. Filiale", icon: Plus, to: "/dashboard/listes/filiales" },
        { label: "Créer compte Gest. Site", icon: Plus, to: "/dashboard/listes/sites" },
        { label: "Créer collaborateur", icon: Plus, to: "/dashboard/listes/collaborateurs" },
        { label: "Archiver Admin", icon: Trash2, to: "/dashboard/listes/admins", variant: "danger" },
        { label: "Archiver Gest. Entreprise", icon: Trash2, to: "/dashboard/listes/entreprises", variant: "danger" },
        { label: "Archiver Gest. Filiale", icon: Trash2, to: "/dashboard/listes/filiales", variant: "danger" },
        { label: "Archiver Gest. Site", icon: Trash2, to: "/dashboard/listes/sites", variant: "danger" },
        { label: "Archiver collaborateur", icon: Trash2, to: "/dashboard/listes/collaborateurs", variant: "danger" },
      ]},
      { title: "Données", items: [
        { label: "Voir données de recharge (tout)", icon: Database, to: "/dashboard/statistiques" },
        { label: "Exporter les données", icon: Download, to: "/dashboard/statistiques" },
        { label: "Modifier prix kWh", icon: Euro, to: "/dashboard/reglages" },
        { label: "Voir statistiques globales", icon: BarChart3, to: "/dashboard/statistiques" },
      ]},
      { title: "Véhicules", items: [
        { label: "Ajouter véhicule", icon: Plus, to: "/dashboard/listes/vehicules" },
        { label: "Modifier véhicule", icon: Car, to: "/dashboard/listes/vehicules" },
        { label: "Archiver véhicule", icon: Trash2, to: "/dashboard/listes/vehicules", variant: "danger" },
        { label: "Détacher véhicule", icon: Power, to: "/dashboard/listes/vehicules" },
        { label: "Suspendre abonnement véhicule", icon: Power, to: "/dashboard/listes/vehicules" },
      ]},
      { title: "Politique de recharge", items: [
        { label: "Définir politique (entreprise)", icon: FileText, to: "/dashboard/reglages" },
        { label: "Définir politique (filiale)", icon: FileText, to: "/dashboard/reglages" },
        { label: "Définir politique (site)", icon: FileText, to: "/dashboard/reglages" },
        { label: "Saisir prix kWh (si délégué)", icon: Euro, to: "/dashboard/reglages" },
        { label: "Saisir jours éligibles (si délégué)", icon: Calendar, to: "/dashboard/reglages" },
        { label: "Déclarer congés", icon: Calendar, to: "/dashboard/reglages" },
        { label: "Définir dates fermeture entreprise", icon: Clock, to: "/dashboard/reglages" },
      ]},
      { title: "Réglages", items: [
        { label: "Modifier infos entreprise", icon: Building2, to: "/dashboard/reglages" },
        { label: "Modifier infos filiale", icon: Building2, to: "/dashboard/reglages" },
        { label: "Modifier infos site", icon: MapPin, to: "/dashboard/reglages" },
        { label: "Modifier infos perso", icon: UserIcon, to: "/dashboard/mes-infos" },
        { label: "Modifier mot de passe", icon: KeyRound, to: "/dashboard/mes-infos" },
        { label: "Modifier FE thermique (CO₂)", icon: Settings, to: "/dashboard/reglages", hint: "Superadmin uniquement" },
      ]},
      { title: "Intégrations", items: [
        { label: "Gérer intégrations (API)", icon: Plug, to: "/dashboard/reglages" },
        { label: "Générer clés API", icon: KeyRound, to: "/dashboard/reglages" },
        { label: "Connexion Smartcar (OAuth)", icon: Link2, to: "/dashboard/reglages", hint: "N/A pour ce rôle" },
      ]},
    ];
  }

  // ===== ADMIN : tout sauf création/archivage Admin, modif FE thermique, gestion API =====
  if (role === "admin") {
    return [
      { title: "Périmètre de visibilité", items: [
        { label: "Accès toutes entreprises (assignées)", icon: Eye, to: "/dashboard/listes/entreprises" },
        { label: "Accès toutes filiales", icon: Eye, to: "/dashboard/listes/filiales" },
        { label: "Accès tous sites", icon: Eye, to: "/dashboard/listes/sites" },
        { label: "Accès tous collaborateurs", icon: Eye, to: "/dashboard/listes/collaborateurs" },
        { label: "Accès tous véhicules", icon: Eye, to: "/dashboard/listes/vehicules" },
      ]},
      { title: "Gestion des comptes", items: [
        { label: "Créer compte Gest. Entreprise", icon: Plus, to: "/dashboard/listes/entreprises" },
        { label: "Créer compte Gest. Filiale", icon: Plus, to: "/dashboard/listes/filiales" },
        { label: "Créer compte Gest. Site", icon: Plus, to: "/dashboard/listes/sites" },
        { label: "Créer collaborateur", icon: Plus, to: "/dashboard/listes/collaborateurs" },
        { label: "Archiver Gest. Entreprise", icon: Trash2, to: "/dashboard/listes/entreprises", variant: "danger" },
        { label: "Archiver Gest. Filiale", icon: Trash2, to: "/dashboard/listes/filiales", variant: "danger" },
        { label: "Archiver Gest. Site", icon: Trash2, to: "/dashboard/listes/sites", variant: "danger" },
        { label: "Archiver collaborateur", icon: Trash2, to: "/dashboard/listes/collaborateurs", variant: "danger" },
      ]},
      { title: "Données", items: [
        { label: "Voir données de recharge (tout)", icon: Database, to: "/dashboard/statistiques" },
        { label: "Exporter les données", icon: Download, to: "/dashboard/statistiques" },
        { label: "Modifier prix kWh", icon: Euro, to: "/dashboard/reglages" },
        { label: "Voir statistiques globales", icon: BarChart3, to: "/dashboard/statistiques" },
      ]},
      { title: "Véhicules", items: [
        { label: "Ajouter véhicule", icon: Plus, to: "/dashboard/listes/vehicules" },
        { label: "Modifier véhicule", icon: Car, to: "/dashboard/listes/vehicules" },
        { label: "Archiver véhicule (réactive aussi)", icon: Trash2, to: "/dashboard/listes/vehicules", variant: "danger" },
        { label: "Détacher véhicule", icon: Power, to: "/dashboard/listes/vehicules" },
      ]},
      { title: "Politique de recharge", items: [
        { label: "Définir politique (entreprise)", icon: FileText, to: "/dashboard/reglages" },
        { label: "Définir politique (filiale)", icon: FileText, to: "/dashboard/reglages" },
        { label: "Définir politique (site)", icon: FileText, to: "/dashboard/reglages" },
        { label: "Saisir prix kWh (si délégué)", icon: Euro, to: "/dashboard/reglages" },
        { label: "Saisir jours éligibles (si délégué)", icon: Calendar, to: "/dashboard/reglages" },
        { label: "Déclarer congés", icon: Calendar, to: "/dashboard/reglages" },
        { label: "Définir dates fermeture entreprise", icon: Clock, to: "/dashboard/reglages" },
      ]},
      { title: "Réglages", items: [
        { label: "Modifier infos entreprise", icon: Building2, to: "/dashboard/reglages" },
        { label: "Modifier infos filiale", icon: Building2, to: "/dashboard/reglages" },
        { label: "Modifier infos site", icon: MapPin, to: "/dashboard/reglages" },
        { label: "Modifier infos perso", icon: UserIcon, to: "/dashboard/mes-infos" },
        { label: "Modifier mot de passe", icon: KeyRound, to: "/dashboard/mes-infos" },
        { label: "FE thermique (CO₂) — lecture seule", icon: Settings, to: "/dashboard/reglages" },
      ]},
    ];
  }

  // ===== GEST. ENTREPRISE : son entreprise =====
  if (role === "gestionnaire_entreprise") {
    return [
      { title: "Périmètre de visibilité", items: [
        { label: "Mon entreprise", icon: Eye, to: "/dashboard/listes/entreprises", hint: "(la sienne)" },
        { label: "Filiales (mon entreprise)", icon: Eye, to: "/dashboard/listes/filiales" },
        { label: "Sites (mon entreprise)", icon: Eye, to: "/dashboard/listes/sites" },
        { label: "Collaborateurs (mon entreprise)", icon: Eye, to: "/dashboard/listes/collaborateurs" },
        { label: "Véhicules (mon entreprise)", icon: Eye, to: "/dashboard/listes/vehicules" },
      ]},
      { title: "Gestion des comptes", items: [
        { label: "Créer compte Gest. Entreprise (même ent.)", icon: Plus, to: "/dashboard/listes/entreprises" },
        { label: "Créer compte Gest. Filiale", icon: Plus, to: "/dashboard/listes/filiales" },
        { label: "Créer compte Gest. Site", icon: Plus, to: "/dashboard/listes/sites" },
        { label: "Créer collaborateur", icon: Plus, to: "/dashboard/listes/collaborateurs" },
        { label: "Archiver Gest. Filiale", icon: Trash2, to: "/dashboard/listes/filiales", variant: "danger" },
        { label: "Archiver Gest. Site", icon: Trash2, to: "/dashboard/listes/sites", variant: "danger" },
        { label: "Archiver collaborateur", icon: Trash2, to: "/dashboard/listes/collaborateurs", variant: "danger" },
      ]},
      { title: "Données", items: [
        { label: "Voir données de recharge (entreprise)", icon: Database, to: "/dashboard/statistiques" },
        { label: "Exporter les données (justificatif PDF)", icon: Download, to: "/dashboard/statistiques" },
        { label: "Modifier prix kWh (si défini niveau entreprise)", icon: Euro, to: "/dashboard/reglages" },
        { label: "Statistiques (entreprise)", icon: BarChart3, to: "/dashboard/statistiques" },
      ]},
      { title: "Véhicules", items: [
        { label: "Ajouter véhicule", icon: Plus, to: "/dashboard/listes/vehicules" },
        { label: "Modifier véhicule", icon: Car, to: "/dashboard/listes/vehicules" },
        { label: "Détacher véhicule", icon: Power, to: "/dashboard/listes/vehicules" },
      ]},
      { title: "Politique de recharge", items: [
        { label: "Définir politique (entreprise)", icon: FileText, to: "/dashboard/reglages" },
        { label: "Définir politique (filiale)", icon: FileText, to: "/dashboard/reglages" },
        { label: "Définir politique (site)", icon: FileText, to: "/dashboard/reglages" },
        { label: "Saisir prix kWh (si délégué)", icon: Euro, to: "/dashboard/reglages" },
        { label: "Saisir jours éligibles (si délégué)", icon: Calendar, to: "/dashboard/reglages" },
        { label: "Déclarer congés", icon: Calendar, to: "/dashboard/reglages" },
        { label: "Définir dates fermeture entreprise", icon: Clock, to: "/dashboard/reglages" },
      ]},
      { title: "Réglages", items: [
        { label: "Modifier infos entreprise", icon: Building2, to: "/dashboard/reglages" },
        { label: "Modifier infos filiale", icon: Building2, to: "/dashboard/reglages" },
        { label: "Modifier infos site", icon: MapPin, to: "/dashboard/reglages" },
        { label: "Modifier infos perso", icon: UserIcon, to: "/dashboard/mes-infos" },
        { label: "Modifier mot de passe", icon: KeyRound, to: "/dashboard/mes-infos" },
      ]},
      { title: "Intégrations", items: [
        { label: "Générer clés API (lot 2)", icon: KeyRound, to: "/dashboard/reglages", hint: "Lot 2" },
      ]},
    ];
  }

  // ===== GEST. FILIALE : sa filiale =====
  if (role === "gestionnaire_filiale") {
    return [
      { title: "Périmètre de visibilité", items: [
        { label: "Ma filiale", icon: Eye, to: "/dashboard/listes/filiales" },
        { label: "Sites (ma filiale)", icon: Eye, to: "/dashboard/listes/sites" },
        { label: "Collaborateurs (ma filiale)", icon: Eye, to: "/dashboard/listes/collaborateurs" },
        { label: "Véhicules (ma filiale)", icon: Eye, to: "/dashboard/listes/vehicules" },
      ]},
      { title: "Gestion des comptes", items: [
        { label: "Créer compte Gest. Site", icon: Plus, to: "/dashboard/listes/sites" },
        { label: "Créer collaborateur", icon: Plus, to: "/dashboard/listes/collaborateurs" },
        { label: "Archiver Gest. Site", icon: Trash2, to: "/dashboard/listes/sites", variant: "danger" },
        { label: "Archiver collaborateur", icon: Trash2, to: "/dashboard/listes/collaborateurs", variant: "danger" },
      ]},
      { title: "Données", items: [
        { label: "Voir données de recharge (filiale)", icon: Database, to: "/dashboard/statistiques" },
        { label: "Exporter les données (filiale)", icon: Download, to: "/dashboard/statistiques" },
        { label: "Modifier prix kWh (si délégué)", icon: Euro, to: "/dashboard/reglages" },
        { label: "Statistiques (filiale)", icon: BarChart3, to: "/dashboard/statistiques" },
      ]},
      { title: "Véhicules", items: [
        { label: "Ajouter véhicule", icon: Plus, to: "/dashboard/listes/vehicules" },
        { label: "Modifier véhicule", icon: Car, to: "/dashboard/listes/vehicules" },
        { label: "Détacher véhicule", icon: Power, to: "/dashboard/listes/vehicules" },
      ]},
      { title: "Politique de recharge", items: [
        { label: "Définir politique (filiale)", icon: FileText, to: "/dashboard/reglages" },
        { label: "Définir politique (site)", icon: FileText, to: "/dashboard/reglages" },
        { label: "Saisir prix kWh (si délégué)", icon: Euro, to: "/dashboard/reglages" },
        { label: "Saisir jours éligibles (si délégué)", icon: Calendar, to: "/dashboard/reglages" },
        { label: "Déclarer congés", icon: Calendar, to: "/dashboard/reglages" },
      ]},
      { title: "Réglages", items: [
        { label: "Modifier infos filiale", icon: Building2, to: "/dashboard/reglages" },
        { label: "Modifier infos site", icon: MapPin, to: "/dashboard/reglages" },
        { label: "Modifier infos perso", icon: UserIcon, to: "/dashboard/mes-infos" },
        { label: "Modifier mot de passe", icon: KeyRound, to: "/dashboard/mes-infos" },
      ]},
    ];
  }

  // ===== GEST. SITE : son site =====
  if (role === "gestionnaire_site") {
    return [
      { title: "Périmètre de visibilité", items: [
        { label: "Mon site", icon: Eye, to: "/dashboard/listes/sites" },
        { label: "Collaborateurs (mon site)", icon: Eye, to: "/dashboard/listes/collaborateurs" },
        { label: "Véhicules (mon site)", icon: Eye, to: "/dashboard/listes/vehicules" },
      ]},
      { title: "Gestion des comptes", items: [
        { label: "Créer collaborateur", icon: Plus, to: "/dashboard/listes/collaborateurs" },
        { label: "Archiver collaborateur", icon: Trash2, to: "/dashboard/listes/collaborateurs", variant: "danger" },
      ]},
      { title: "Données", items: [
        { label: "Voir données de recharge (site)", icon: Database, to: "/dashboard/statistiques" },
        { label: "Exporter les données (site)", icon: Download, to: "/dashboard/statistiques" },
        { label: "Modifier prix kWh (si délégué)", icon: Euro, to: "/dashboard/reglages" },
        { label: "Statistiques (site)", icon: BarChart3, to: "/dashboard/statistiques" },
      ]},
      { title: "Véhicules", items: [
        { label: "Ajouter véhicule", icon: Plus, to: "/dashboard/listes/vehicules" },
        { label: "Modifier véhicule", icon: Car, to: "/dashboard/listes/vehicules" },
        { label: "Détacher véhicule", icon: Power, to: "/dashboard/listes/vehicules" },
      ]},
      { title: "Politique de recharge", items: [
        { label: "Définir politique (site)", icon: FileText, to: "/dashboard/reglages" },
        { label: "Saisir prix kWh (si délégué)", icon: Euro, to: "/dashboard/reglages" },
        { label: "Saisir jours éligibles (si délégué)", icon: Calendar, to: "/dashboard/reglages" },
        { label: "Déclarer congés", icon: Calendar, to: "/dashboard/reglages" },
      ]},
      { title: "Réglages", items: [
        { label: "Modifier infos site", icon: MapPin, to: "/dashboard/reglages" },
        { label: "Modifier infos perso", icon: UserIcon, to: "/dashboard/mes-infos" },
        { label: "Modifier mot de passe", icon: KeyRound, to: "/dashboard/mes-infos" },
      ]},
    ];
  }

  // ===== COLLABORATEUR : minimal =====
  return [
    { title: "Mes données", items: [
      { label: "Voir mes sessions de recharge", icon: Database, to: "/dashboard/mes-consommations" },
      { label: "Mes statistiques perso", icon: BarChart3, to: "/dashboard" },
      { label: "Mon véhicule", icon: Car, to: "/dashboard/mes-infos" },
    ]},
    { title: "Politique", items: [
      { label: "Saisir prix kWh (si autorisé)", icon: Euro, to: "/dashboard/reglages", hint: "si autorisé" },
      { label: "Saisir jours éligibles (si autorisé)", icon: Calendar, to: "/dashboard/reglages", hint: "si autorisé" },
      { label: "Déclarer congés (si autorisé)", icon: Calendar, to: "/dashboard/reglages", hint: "si autorisé" },
    ]},
    { title: "Mes infos", items: [
      { label: "Modifier mes infos (nom, prénom, email, tél, adresse)", icon: UserIcon, to: "/dashboard/mes-infos" },
      { label: "Modifier mot de passe", icon: KeyRound, to: "/dashboard/mes-infos" },
    ]},
    { title: "Intégrations", items: [
      { label: "Connexion Smartcar (mon véhicule)", icon: Link2, to: "/dashboard/mes-infos", hint: "via email / espace connecté" },
    ]},
  ];
}

const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  gestionnaire_entreprise: "Gestionnaire d'entreprise",
  gestionnaire_filiale: "Gestionnaire de filiale",
  gestionnaire_site: "Gestionnaire de site",
  collaborateur: "Collaborateur",
};

function AdministrationPage() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!role) {
    return <div className="p-8"><p className="text-muted-foreground">Accès non autorisé.</p></div>;
  }

  const groups = getGroupsForRole(role);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Administration — {ROLE_LABELS[role]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Actions disponibles selon votre rôle et votre périmètre organisationnel
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
        ))}
      </div>
    </div>
  );
}
