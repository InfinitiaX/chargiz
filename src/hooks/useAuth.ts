// Front-only mock auth: a superadmin is always "logged in" so the maquette
// is fully navigable without backend. Switch DEMO_ROLE below to test other
// role-based dashboards.
import { useState } from "react";

export type AppRole =
  | "superadmin"
  | "admin"
  | "gestionnaire_entreprise"
  | "gestionnaire_filiale"
  | "gestionnaire_site"
  | "collaborateur";

export interface Profile {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  pays: string;
  entreprise_id: string | null;
  filiale_id: string | null;
  site_id: string | null;
  cout_kwh_domicile: number | null;
  jours_suivi: string[];
  horaires_suivi: Record<string, unknown>;
  jours_conge: string[];
  is_active: boolean;
}

const DEMO_ROLE: AppRole = "superadmin";

const DEMO_USER = {
  id: "user-superadmin",
  email: "demo@chargiz.fr",
  username: "superadmin",
  full_name: "Marie Démo",
  role: DEMO_ROLE,
  entreprise_id: "ent-1",
  filiale_id: "fil-1",
  site_id: "site-1",
  is_active: true,
};

const DEMO_SESSION = { access_token: "demo-token", token_type: "bearer" };

const DEMO_PROFILE: Profile = {
  id: DEMO_USER.id,
  user_id: DEMO_USER.id,
  nom: "Démo",
  prenom: "Marie",
  email: DEMO_USER.email,
  telephone: "0600000000",
  adresse: "12 rue de la Paix",
  code_postal: "75008",
  ville: "Paris",
  pays: "France",
  entreprise_id: DEMO_USER.entreprise_id,
  filiale_id: DEMO_USER.filiale_id,
  site_id: DEMO_USER.site_id,
  cout_kwh_domicile: 0.2516,
  jours_suivi: ["lundi", "mardi", "mercredi", "jeudi", "vendredi"],
  horaires_suivi: { debut: "08:30", fin: "18:00" },
  jours_conge: [],
  is_active: true,
};

export function useAuth() {
  const [user] = useState(DEMO_USER);
  const [session] = useState(DEMO_SESSION);
  const [role] = useState<AppRole>(DEMO_ROLE);
  const [profile] = useState<Profile>(DEMO_PROFILE);

  const signIn = async (_id: string, _pwd: string) => { /* no-op in demo */ };
  const signOut = async () => { /* no-op in demo */ };
  const resetPassword = async (_email: string) => { /* no-op */ };
  const updatePassword = async (_old: string, _next: string) => { /* no-op */ };

  const canManage = (target: AppRole): boolean => {
    const map: Record<AppRole, AppRole[]> = {
      superadmin: ["admin", "gestionnaire_entreprise", "gestionnaire_filiale", "gestionnaire_site", "collaborateur"],
      admin: ["gestionnaire_entreprise", "gestionnaire_filiale", "gestionnaire_site", "collaborateur"],
      gestionnaire_entreprise: ["gestionnaire_filiale", "gestionnaire_site", "collaborateur"],
      gestionnaire_filiale: ["gestionnaire_site", "collaborateur"],
      gestionnaire_site: ["collaborateur"],
      collaborateur: [],
    };
    return map[role]?.includes(target) ?? false;
  };

  const isAtLeast = (min: AppRole): boolean => {
    const order: AppRole[] = ["superadmin", "admin", "gestionnaire_entreprise", "gestionnaire_filiale", "gestionnaire_site", "collaborateur"];
    return order.indexOf(role) <= order.indexOf(min);
  };

  return {
    user,
    session,
    role,
    profile,
    loading: false,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    canManage,
    isAtLeast,
  };
}
