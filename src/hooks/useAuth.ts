import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

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

// Cache simple en mémoire pour éviter les refetch role/profile à chaque montage
const cache: { userId?: string; role?: AppRole | null; profile?: Profile | null } = {};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(cache.role ?? null);
  const [profile, setProfile] = useState<Profile | null>(cache.profile ?? null);
  const [loading, setLoading] = useState(!cache.userId);

  const fetchRole = useCallback(async (userId: string) => {
    if (cache.userId === userId && cache.role !== undefined) {
      setRole(cache.role);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const r = (data?.role as AppRole) ?? null;
    cache.userId = userId;
    cache.role = r;
    setRole(r);
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    if (cache.userId === userId && cache.profile !== undefined) {
      setProfile(cache.profile);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const p = (data as Profile) ?? null;
    cache.userId = userId;
    cache.profile = p;
    setProfile(p);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await Promise.all([
            fetchRole(session.user.id),
            fetchProfile(session.user.id),
          ]);
        } else {
          setRole(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        Promise.all([
          fetchRole(session.user.id),
          fetchProfile(session.user.id),
        ]).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchRole, fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  const canManage = (targetRole: AppRole): boolean => {
    if (!role) return false;
    const hierarchy: AppRole[] = [
      "superadmin",
      "admin",
      "gestionnaire_entreprise",
      "gestionnaire_filiale",
      "gestionnaire_site",
      "collaborateur",
    ];
    return hierarchy.indexOf(role) < hierarchy.indexOf(targetRole);
  };

  const isAtLeast = (minRole: AppRole): boolean => {
    if (!role) return false;
    const hierarchy: AppRole[] = [
      "superadmin",
      "admin",
      "gestionnaire_entreprise",
      "gestionnaire_filiale",
      "gestionnaire_site",
      "collaborateur",
    ];
    return hierarchy.indexOf(role) <= hierarchy.indexOf(minRole);
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
    canManage,
    isAtLeast,
  };
}
