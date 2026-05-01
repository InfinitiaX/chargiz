// Front-only mock API: routes path strings to mock data so existing
// apiFetch() callers keep working without a backend.
import { tableMap, mockCollaborateurs } from "./mockData";

export const API_URL = "";
export const TOKEN_STORAGE_KEY = "chargiz_access_token";

export function getAccessToken() {
  return "demo-token";
}

function pickByPath(path: string): unknown {
  const clean = path.split("?")[0].replace(/^\//, "").replace(/^api\//, "");
  const parts = clean.split("/").filter(Boolean);
  const head = parts[0];

  switch (head) {
    case "collaborateurs":
    case "profiles":
      if (parts[1]) return mockCollaborateurs.find(c => c.id === parts[1]) ?? null;
      return tableMap.collaborateurs;
    case "entreprises":
      if (parts[1]) return tableMap.entreprises.find(e => e.id === parts[1]) ?? null;
      return tableMap.entreprises;
    case "filiales":
      if (parts[1]) return tableMap.filiales.find(f => f.id === parts[1]) ?? null;
      return tableMap.filiales;
    case "sites":
      if (parts[1]) return tableMap.sites.find(s => s.id === parts[1]) ?? null;
      return tableMap.sites;
    case "vehicules":
      if (parts[1]) return tableMap.vehicules.find(v => v.id === parts[1]) ?? null;
      return tableMap.vehicules;
    case "sessions_recharge":
    case "sessions":
      return tableMap.sessions_recharge;
    case "admins":
      return tableMap.admins;
    case "auth":
      if (parts[1] === "me") {
        return {
          id: "user-superadmin",
          email: "demo@chargiz.fr",
          username: "superadmin",
          full_name: "Marie Démo",
          role: "superadmin",
          entreprise_id: "ent-1",
          filiale_id: "fil-1",
          site_id: "site-1",
          is_active: true,
        };
      }
      return null;
    default:
      return [];
  }
}

export async function apiFetch<T>(
  path: string,
  _options: RequestInit = {},
  _token: string | undefined = undefined,
): Promise<T> {
  // Simulate a tiny latency for UX realism
  await new Promise(r => setTimeout(r, 50));
  return pickByPath(path) as T;
}
