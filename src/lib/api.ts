export const API_URL = "http://localhost:8000";
export const TOKEN_STORAGE_KEY = "chargiz_access_token";

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    return payload.detail || payload.message || fallback;
  } catch {
    return fallback;
  }
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, token = getAccessToken() || undefined): Promise<T> {
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
