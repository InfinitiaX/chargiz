import { useEffect, useState } from "react";
import { API_URL, TOKEN_STORAGE_KEY, apiFetch } from "@/lib/api";

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

interface AuthUser {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  role: AppRole;
  entreprise_id: string | null;
  filiale_id: string | null;
  site_id: string | null;
  is_active: boolean;
  password_change_required?: boolean;  // BugID_001
}

interface AuthSession {
  access_token: string;
  token_type: string;
}

const cache: {
  user?: AuthUser | null;
  session?: AuthSession | null;
  role?: AppRole | null;
  profile?: Profile | null;
} = {};

function splitFullName(fullName: string | null) {
  const value = (fullName || "").trim();
  if (!value) {
    return { prenom: "Utilisateur", nom: "" };
  }
  const parts = value.split(/\s+/);
  return {
    prenom: parts[0] || "Utilisateur",
    nom: parts.slice(1).join(" "),
  };
}

function buildProfile(user: AuthUser): Profile {
  const { prenom, nom } = splitFullName(user.full_name);
  return {
    id: user.id,
    user_id: user.id,
    nom,
    prenom,
    email: user.email,
    telephone: null,
    adresse: null,
    code_postal: null,
    ville: null,
    pays: "France",
    entreprise_id: user.entreprise_id,
    filiale_id: user.filiale_id,
    site_id: user.site_id,
    cout_kwh_domicile: null,
    jours_suivi: [],
    horaires_suivi: {},
    jours_conge: [],
    is_active: user.is_active,
  };
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    return payload.detail || payload.message || fallback;
  } catch {
    return fallback;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(cache.user ?? null);
  const [session, setSession] = useState<AuthSession | null>(cache.session ?? null);
  const [role, setRole] = useState<AppRole | null>(cache.role ?? null);
  const [profile, setProfile] = useState<Profile | null>(cache.profile ?? null);
  const [loading, setLoading] = useState(!cache.user);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token || !API_URL) {
      setLoading(false);
      return;
    }

    apiFetch<AuthUser>("/api/auth/me", {}, token)
      .then((currentUser) => {
        const nextSession: AuthSession = {
          access_token: token,
          token_type: "bearer",
        };
        const nextProfile = buildProfile(currentUser);
        cache.user = currentUser;
        cache.session = nextSession;
        cache.role = currentUser.role;
        cache.profile = nextProfile;
        setUser(currentUser);
        setSession(nextSession);
        setRole(currentUser.role);
        setProfile(nextProfile);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        cache.user = null;
        cache.session = null;
        cache.role = null;
        cache.profile = null;
        setUser(null);
        setSession(null);
        setRole(null);
        setProfile(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (identifier: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        username: identifier,
        password,
      }),
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Erreur de connexion"));
    }

    const authSession = (await response.json()) as AuthSession;
    localStorage.setItem(TOKEN_STORAGE_KEY, authSession.access_token);

    const currentUser = await apiFetch<AuthUser>("/api/auth/me", {}, authSession.access_token);
    const nextProfile = buildProfile(currentUser);

    cache.user = currentUser;
    cache.session = authSession;
    cache.role = currentUser.role;
    cache.profile = nextProfile;

    setUser(currentUser);
    setSession(authSession);
    setRole(currentUser.role);
    setProfile(nextProfile);

    return { user: currentUser, session: authSession };
  };

  /** Recharge le user courant depuis le backend (utile après changement de mot de passe). */
  const refresh = async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return;
    try {
      const currentUser = await apiFetch<AuthUser>("/api/auth/me");
      const nextProfile = buildProfile(currentUser);
      cache.user = currentUser;
      cache.role = currentUser.role;
      cache.profile = nextProfile;
      setUser(currentUser);
      setRole(currentUser.role);
      setProfile(nextProfile);
    } catch {/* ignore */}
  };

  const signOut = async () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    cache.user = null;
    cache.session = null;
    cache.role = null;
    cache.profile = null;
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
    window.location.href = "/";
  };

  const resetPassword = async (_email: string) => {
    throw new Error("La réinitialisation du mot de passe n'est pas encore branchée sur le nouveau backend.");
  };

  const updatePassword = async (oldPassword: string, newPassword: string) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) throw new Error("Non authentifié");

    const response = await fetch(`${API_URL}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Erreur lors du changement de mot de passe"));
    }
  };

  const canManage = (targetRole: AppRole): boolean => {
    if (!role) return false;
    const manageableRoles: Record<AppRole, AppRole[]> = {
      superadmin: [
        "gestionnaire_entreprise",
        "gestionnaire_filiale",
        "gestionnaire_site",
        "collaborateur",
      ],
      gestionnaire_entreprise: [
        "gestionnaire_entreprise",
        "gestionnaire_filiale",
        "gestionnaire_site",
        "collaborateur",
      ],
      gestionnaire_filiale: ["gestionnaire_site", "collaborateur"],
      gestionnaire_site: ["collaborateur"],
      collaborateur: [],
    };
    return manageableRoles[role]?.includes(targetRole) ?? false;
  };

  const isAtLeast = (minRole: AppRole): boolean => {
    if (!role) return false;
    const hierarchy: AppRole[] = [
      "superadmin",
      "gestionnaire_entreprise",
      "gestionnaire_filiale",
      "gestionnaire_site",
      "collaborateur",
    ];
    const roleIndex = hierarchy.indexOf(role);
    const minRoleIndex = hierarchy.indexOf(minRole);
    if (roleIndex === -1 || minRoleIndex === -1) return false;
    return roleIndex <= minRoleIndex;
  };

  return {
    user,
    session,
    role,
    profile,
    loading,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    refresh,
    canManage,
    isAtLeast,
  };
}
