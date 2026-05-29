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
  },
  sites: {
    list: (params?: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch<any[]>(`/api/sites${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => apiFetch<any>(`/api/sites/${id}`),
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
    smartcarConnectUrl: () => apiFetch<{ smartcar_auth_url: string }>(`/api/me/smartcar/connect-url`),
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
  },
  webhooks: {
    list: (params?: { entreprise_id?: string }) => {
      const qs = params?.entreprise_id ? `?entreprise_id=${encodeURIComponent(params.entreprise_id)}` : "";
      return apiFetch<WebhookSubscription[]>(`/api/webhooks/subscriptions${qs}`);
    },
    create: (data: { url: string; events: string[]; entreprise_id?: string }) =>
      apiFetch<WebhookSubscriptionCreated>("/api/webhooks/subscriptions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    toggle: (subId: string, entreprise_id?: string) => {
      const qs = entreprise_id ? `?entreprise_id=${encodeURIComponent(entreprise_id)}` : "";
      return apiFetch<WebhookSubscription>(`/api/webhooks/subscriptions/${subId}/toggle${qs}`, { method: "PATCH" });
    },
    delete: (subId: string, entreprise_id?: string) => {
      const qs = entreprise_id ? `?entreprise_id=${encodeURIComponent(entreprise_id)}` : "";
      return apiFetch<void>(`/api/webhooks/subscriptions/${subId}${qs}`, { method: "DELETE" });
    },
    deliveries: (subId: string, entreprise_id?: string) => {
      const qs = entreprise_id ? `?entreprise_id=${encodeURIComponent(entreprise_id)}` : "";
      return apiFetch<WebhookDelivery[]>(`/api/webhooks/subscriptions/${subId}/deliveries${qs}`);
    },
  },
  apiKeys: {
    list: (params?: { entreprise_id?: string }) => {
      const qs = params?.entreprise_id
        ? `?entreprise_id=${encodeURIComponent(params.entreprise_id)}`
        : "";
      return apiFetch<ApiKeyItem[]>(`/api/api-keys/${qs}`);
    },
    create: (data: {
      name: string;
      scopes: string[];
      expires_at?: string | null;
      entreprise_id?: string;
    }) =>
      apiFetch<ApiKeyCreated>("/api/api-keys/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    revoke: (keyId: string, entreprise_id?: string) => {
      const qs = entreprise_id
        ? `?entreprise_id=${encodeURIComponent(entreprise_id)}`
        : "";
      return apiFetch<void>(`/api/api-keys/${keyId}${qs}`, { method: "DELETE" });
    },
    rotate: (keyId: string, entreprise_id?: string) => {
      const qs = entreprise_id
        ? `?entreprise_id=${encodeURIComponent(entreprise_id)}`
        : "";
      return apiFetch<ApiKeyCreated>(`/api/api-keys/${keyId}/rotate${qs}`, {
        method: "POST",
      });
    },
    usage: (params?: { entreprise_id?: string }) => {
      const qs = params?.entreprise_id
        ? `?entreprise_id=${encodeURIComponent(params.entreprise_id)}`
        : "";
      return apiFetch<ApiUsageStats>(`/api/api-keys/usage${qs}`);
    },
  },
};

// ─── Types clés API ────────────────────────────────────────────────────────────
export interface ApiKeyItem {
  id: string;
  entreprise_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  revoked_at: string | null;
  last_used_at: string | null;
  expires_at: string | null;
  rate_limit: number;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKeyItem {
  key: string; // clé brute — retournée une seule fois
}

export interface WebhookSubscription {
  id: string;
  entreprise_id: string;
  url: string;
  events: string[];
  is_active: boolean;
  failure_count: number;
  last_delivered_at: string | null;
  created_at: string;
}

export interface WebhookSubscriptionCreated extends WebhookSubscription {
  secret: string;
}

export interface WebhookDelivery {
  id: string;
  subscription_id: string;
  event_type: string;
  http_status: number | null;
  attempt: number;
  delivered_at: string | null;
  created_at: string;
}

export interface ApiUsageStats {
  total_calls: number;
  calls_today: number;
  calls_7days: number;
  calls_30days: number;
  calls_by_day: { date: string; count: number }[];
  calls_by_endpoint: {
    endpoint: string;
    count: number;
    pct: number;
    avg_response_ms: number | null;
  }[];
  calls_by_key: {
    key_id: string;
    name: string;
    key_prefix: string;
    count: number;
    pct: number;
    last_call: string | null;
  }[];
  active_keys_count: number;
  error_rate_pct: number;
}
