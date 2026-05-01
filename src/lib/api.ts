// Front layer used to talk to the future ChargiZ FastAPI backend.
// During the Lovable phase we don't have a real API: every call resolves
// with a soft error so the UI stays responsive. Set VITE_API_BASE_URL
// later to point at your FastAPI deployment.

export const API_URL = import.meta.env.VITE_API_BASE_URL ?? "";
export const TOKEN_STORAGE_KEY = "chargiz_access_token";

const MIGRATION_MESSAGE =
  "Le backend ChargiZ n'est pas encore branché. Connecte VITE_API_BASE_URL pour activer cette fonctionnalité.";

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

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token: string | undefined = getAccessToken() ?? undefined,
): Promise<T> {
  if (!API_URL) {
    throw new Error(MIGRATION_MESSAGE);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Erreur API"));
  }

  return response.json() as Promise<T>;
}
