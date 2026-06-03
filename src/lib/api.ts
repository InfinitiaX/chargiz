// Front layer used to talk to the ChargiZ FastAPI backend.
export const API_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
export const TOKEN_STORAGE_KEY = "chargiz_access_token";
export const USER_STORAGE_KEY = "chargiz_user_data";

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  role: string;
  entreprise_id: string | null;
  filiale_id: string | null;
  site_id: string | null;
}

// ─── Lightweight pub/sub for cross-page data invalidation ───
// Fire `notifyDataChanged()` whenever a mutation succeeds. Pages can subscribe
// via `onDataChanged(callback)` to trigger a refetch — even if they were
// mounted before the mutation happened.
const DATA_CHANGED_EVENT = "chargiz:data-changed";
export function notifyDataChanged(kind?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { kind } }));
}
export function onDataChanged(cb: (kind?: string) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => cb((e as CustomEvent).detail?.kind);
  window.addEventListener(DATA_CHANGED_EVENT, handler);
  return () => window.removeEventListener(DATA_CHANGED_EVENT, handler);
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    return payload.detail || payload.message || fallback;
  } catch {
    return fallback;
  }
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const data = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null) {
  if (typeof window === "undefined") return;
  if (user) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token: string | undefined = getAccessToken() ?? undefined,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    setAccessToken(null);
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login") && window.location.pathname !== "/") {
      window.location.href = "/";
    }
    throw new Error("Session expirée");
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Erreur API"));
  }

  // Successful mutation → broadcast so other pages refetch.
  const method = (options.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    notifyDataChanged(path);
  }

  // 204 No Content has no body → return undefined as T
  if (response.status === 204) return undefined as unknown as T;
  return response.json() as Promise<T>;
}

// Resource helpers
export const api = {
  entreprises: {
    list: (params?: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch<any[]>(`/api/entreprises${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => apiFetch<any>(`/api/entreprises/${id}`),
    update: (id: string, data: any) =>
      apiFetch<any>(`/api/entreprises/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    archive: (id: string) =>
      apiFetch<any>(`/api/entreprises/${id}/archive`, { method: "PATCH" }),
    unarchive: (id: string) =>
      apiFetch<any>(`/api/entreprises/${id}/unarchive`, { method: "PATCH" }),
    /** Hard delete avec cascade — superadmin uniquement. */
    delete: (id: string) =>
      apiFetch<any>(`/api/entreprises/${id}`, { method: "DELETE" }),
  },
  users: {
    list: (params?: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch<any[]>(`/api/users${qs ? `?${qs}` : ""}`);
    },
    update: (id: number | string, data: any) =>
      apiFetch<any>(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  collaborateurs: {
    list: (params?: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch<any[]>(`/api/collaborateurs${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => apiFetch<any>(`/api/collaborateurs/${id}`),
    update: (id: string, data: any) => apiFetch<any>(`/api/collaborateurs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    setHome: (id: string, latitude: number, longitude: number, address?: string) =>
      apiFetch<any>(`/api/collaborateurs/${id}/home`, {
        method: "POST",
        body: JSON.stringify({ latitude, longitude, address: address || null }),
      }),
  },
  filiales: {
    list: (params?: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch<any[]>(`/api/filiales${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => apiFetch<any>(`/api/filiales/${id}`),
    create: (data: any) =>
      apiFetch<any>(`/api/filiales`, { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiFetch<any>(`/api/filiales/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    archive: (id: string) =>
      apiFetch<any>(`/api/filiales/${id}`, { method: "DELETE" }),
    unarchive: (id: string) =>
      apiFetch<any>(`/api/filiales/${id}/unarchive`, { method: "PATCH" }),
    hardDelete: (id: string) =>
      apiFetch<any>(`/api/filiales/${id}/hard`, { method: "DELETE" }),
    stats: (id: string) => apiFetch<any>(`/api/filiales/${id}/stats`),
  },
  sites: {
    list: (params?: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch<any[]>(`/api/sites${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => apiFetch<any>(`/api/sites/${id}`),
    stats: (id: string) => apiFetch<any>(`/api/sites/${id}/stats`),
    create: (data: any) =>
      apiFetch<any>(`/api/sites`, { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiFetch<any>(`/api/sites/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    archive: (id: string) =>
      apiFetch<any>(`/api/sites/${id}`, { method: "DELETE" }),
    unarchive: (id: string) =>
      apiFetch<any>(`/api/sites/${id}/unarchive`, { method: "PATCH" }),
    hardDelete: (id: string) =>
      apiFetch<any>(`/api/sites/${id}/hard`, { method: "DELETE" }),
  },
  vehicules_actions: {
    historique: (id: string) =>
      apiFetch<any>(`/api/vehicules/${id}/historique-affectations`),
    sessions: (id: string) =>
      apiFetch<any>(`/api/vehicules/${id}/sessions`),
    batteryInfo: (id: string) =>
      apiFetch<any>(`/api/vehicules/${id}/battery-info`),
    affecter: (id: string, collaborateur_id: string) =>
      apiFetch<any>(`/api/vehicules/${id}/affecter`, {
        method: "POST", body: JSON.stringify({ collaborateur_id }),
      }),
    detacher: (id: string, continuer_abonnement: boolean) =>
      apiFetch<any>(`/api/vehicules/${id}/detacher`, {
        method: "POST", body: JSON.stringify({ continuer_abonnement }),
      }),
    suspendre: (id: string) =>
      apiFetch<any>(`/api/vehicules/${id}/suspendre`, { method: "POST" }),
    reactiver: (id: string) =>
      apiFetch<any>(`/api/vehicules/${id}/reactiver`, { method: "POST" }),
    archiver: (id: string) =>
      apiFetch<any>(`/api/vehicules/${id}/archiver`, { method: "POST" }),
    desarchiver: (id: string) =>
      apiFetch<any>(`/api/vehicules/${id}/desarchiver`, { method: "POST" }),
    revoquerCollab: (collab_id: string, payload: { vehicule_action: "sortir_flotte" | "garder"; abonnement_action: "continuer" | "suspendre" | null }) =>
      apiFetch<any>(`/api/collaborateurs/${collab_id}/revoquer`, {
        method: "POST", body: JSON.stringify(payload),
      }),
  },
  vehicules: {
    list: (params?: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch<any[]>(`/api/vehicules${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => apiFetch<any>(`/api/vehicules/${id}`),
    update: (id: string, data: any) => apiFetch<any>(`/api/vehicules/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  me: {
    profile: () => apiFetch<any>(`/api/me`),
    update: (data: any) => apiFetch<any>(`/api/me`, { method: "PATCH", body: JSON.stringify(data) }),
    requestEmailChange: (new_email: string) =>
      apiFetch<{ ok: boolean; message: string }>(`/api/me/email`, {
        method: "PATCH",
        body: JSON.stringify({ new_email }),
      }),
    confirmEmailChange: (token: string) =>
      apiFetch<{ ok: boolean; email: string }>(`/api/me/email/confirm`, {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
    updateAdresses: (data: any) =>
      apiFetch<any>(`/api/me/adresses`, { method: "PATCH", body: JSON.stringify(data) }),
    updatePolicy: (data: { prix_kwh?: number | null; jours_fermeture?: number | null }) =>
      apiFetch<{ ok: boolean; prix_kwh: number | null; jours_fermeture: number | null }>(
        `/api/me/policy`,
        { method: "PATCH", body: JSON.stringify(data) }
      ),
    performance: (params?: Record<string, string>) => {
      const qs = params ? new URLSearchParams(params).toString() : "";
      return apiFetch<any>(`/api/me/performance${qs ? `?${qs}` : ""}`);
    },
    sessions: (params?: Record<string, string>) => {
      const qs = params ? new URLSearchParams(params).toString() : "";
      return apiFetch<any[]>(`/api/me/sessions${qs ? `?${qs}` : ""}`);
    },
    smartcarConnectUrl: () => apiFetch<{ smartcar_auth_url: string }>(`/api/me/smartcar/connect-url`),
    setVehicule: (data: { marque: string; modele: string; immatriculation: string; capacite_batterie: number | null }) =>
      apiFetch<{ ok: boolean; vehicule: any }>(`/api/me/vehicule`, { method: "POST", body: JSON.stringify(data) }),
    // Liaison manuelle Smartcar (mode test uniquement — désactivé en live)
    smartcarAvailableConnections: () =>
      apiFetch<{ enabled: boolean; mode: string; connections: Array<{ vehicleId: string; userId: string; mode: string; connectedAt: string; linked: boolean; linkedToMe: boolean }> }>(`/api/me/smartcar/available-connections`),
    smartcarLink: (data: { vehicleId: string; userId: string }) =>
      apiFetch<{ ok: boolean; vehicule: any }>(`/api/me/smartcar/link`, { method: "POST", body: JSON.stringify(data) }),
  },
  sessions: {
    list: (params?: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch<any[]>(`/api/sessions${qs ? `?${qs}` : ""}`);
    },
  },
  stats: {
    get: (entrepriseId: string) => apiFetch<any>(`/api/entreprises/${entrepriseId}/stats`),
  },
  admins: {
    list: () => apiFetch<any[]>("/api/admins"),
    create: (data: { email: string; full_name: string; username?: string }) =>
      apiFetch<any>("/api/admins", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: { full_name?: string; is_active?: boolean }) =>
      apiFetch<any>(`/api/admins/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) =>
      apiFetch<any>(`/api/admins/${id}`, { method: "DELETE" }),
    listEntreprises: (id: number) =>
      apiFetch<any[]>(`/api/admins/${id}/entreprises`),
    setEntreprises: (id: number, entreprise_ids: string[]) =>
      apiFetch<any>(`/api/admins/${id}/entreprises`, {
        method: "PUT",
        body: JSON.stringify({ entreprise_ids }),
      }),
    mutation: (from_admin_id: number, to_admin_id: number) =>
      apiFetch<any>("/api/admins/mutation", {
        method: "POST",
        body: JSON.stringify({ from_admin_id, to_admin_id }),
      }),
  },
  politiques: {
    list: (params?: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch<any[]>(`/api/politiques${qs ? `?${qs}` : ""}`);
    },
    save: (data: any) => apiFetch<any>(`/api/politiques`, { method: "POST", body: JSON.stringify(data) }),
  }
};
