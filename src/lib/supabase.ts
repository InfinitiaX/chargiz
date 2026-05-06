import { apiFetch, setAccessToken, setStoredUser, User } from "./api";

// This is a bridge layer that makes existing Supabase-style calls 
// work with the new FastAPI backend. 
// It allows the UI to stay as-is while we migrate.

type SupabaseResult<T> = {
  data: T | null;
  error: any;
  count?: number | null;
};

class SupabaseQueryBuilder<TRow> {
  private table: string;
  private filters: Record<string, any> = {};
  private limitCount: number | null = null;
  private isCountExact: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string, options?: { count?: "exact" | "planned" | "estimated" }) {
    if (options?.count === "exact") {
      this.isCountExact = true;
    }
    return this; 
  }
  
  insert(data: any) { 
    return this.execute("POST", data);
  }
  
  update(data: any) {
    return this.execute("PATCH", data);
  }
  
  delete() {
    return this.execute("DELETE");
  }
  
  upsert(data: any) {
    return this.execute("POST", data);
  }

  eq(column: string, value: any) {
    if (value === undefined || value === null) return this;
    this.filters[column] = value;
    return this;
  }
  
  neq(column: string, value: any) { return this; }
  
  in(column: string, values: any[]) { 
    if (!values || values.length === 0) return this;
    this.filters[column] = values.join(",");
    return this; 
  }

  gte(_column: string, _value: any) { return this; }
  lte(_column: string, _value: any) { return this; }
  gt(_column: string, _value: any) { return this; }
  lt(_column: string, _value: any) { return this; }
  like(_column: string, _value: any) { return this; }
  ilike(_column: string, _value: any) { return this; }
  is(_column: string, _value: any) { return this; }
  
  order(column: string, options?: { ascending?: boolean }) { return this; }
  
  limit(n: number) { 
    this.limitCount = n;
    return this; 
  }

  maybeSingle() {
    return this.execute("GET");
  }

  single() {
    return this.execute("GET");
  }

  async then<TResult1 = SupabaseResult<TRow | TRow[]>>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null
  ): Promise<any> {
    const result = await this.execute();
    return onfulfilled ? onfulfilled(result) : result;
  }

  private async execute(method: string = "GET", body?: any): Promise<SupabaseResult<any>> {
    try {
      let path = "";
      
      // Mapping tables to FastAPI routes
      const tableMap: Record<string, string> = {
        "entreprises": "/api/entreprises",
        "filiales": "/api/filiales",
        "sites": "/api/sites",
        "profiles": "/api/collaborateurs",
        "collaborateurs": "/api/collaborateurs",
        "vehicules": "/api/vehicules",
        "sessions_recharge": "/api/sessions",
        "user_roles": "/api/users",
        "users": "/api/users"
      };

      const baseRoute = tableMap[this.table] || `/api/${this.table}`;
      path = baseRoute;

      // Special case for ID filter in URL
      if (this.filters.id && (method === "GET" || method === "PATCH" || method === "DELETE")) {
        path = `${baseRoute}/${this.filters.id}`;
        // We keep it in filters for GET query params if needed, 
        // but usually FastAPI expects it in path.
      }

      // Build query string for GET
      if (method === "GET") {
        const params = new URLSearchParams();
        Object.entries(this.filters).forEach(([k, v]) => {
          if (k !== "id") params.append(k, String(v));
        });
        if (this.limitCount) params.append("limit", String(this.limitCount));
        const qs = params.toString();
        if (qs) path += (path.includes("?") ? "&" : "?") + qs;
      }

      const data = await apiFetch<any>(path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {})
      });

      // Handle count for lists
      let count = null;
      if (Array.isArray(data)) {
        count = data.length;
      } else if (data && typeof data === "object" && this.isCountExact) {
        count = 1;
      }

      return { data, error: null, count };
    } catch (error: any) {
      console.error(`API Error (${this.table}):`, error);
      return { data: null, error, count: 0 };
    }
  }
}

export const supabase = {
  from<TRow = any>(table: string) {
    return new SupabaseQueryBuilder<TRow>(table);
  },
  auth: {
    signInWithPassword: async ({ email, password }: any) => {
      try {
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || "Login failed");
        }

        const { access_token } = await response.json();
        setAccessToken(access_token);

        // Fetch user data
        const user = await apiFetch<User>("/api/auth/me");
        setStoredUser(user);

        return { data: { user, session: { access_token } }, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    signOut: async () => {
      setAccessToken(null);
      setStoredUser(null);
      return { error: null };
    },
    getUser: async () => {
      try {
        const user = await apiFetch<User>("/auth/me");
        return { data: { user }, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    getSession: async () => {
      const token = localStorage.getItem("chargiz_access_token");
      if (!token) return { data: { session: null }, error: null };
      return { data: { session: { access_token: token } }, error: null };
    },
    onAuthStateChange: (cb: any) => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    updateUser: async (data: any) => {
      return { data: null, error: new Error("Not implemented") };
    }
  }
};
