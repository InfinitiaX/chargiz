// Front-only mock client mimicking the subset of the Supabase JS API
// used by ChargiZ screens. Returns realistic data from src/lib/mockData.ts
// so the demo maquette stays interactive without any backend.
import { tableMap } from "./mockData";

type AnyRow = Record<string, any>;

interface CountOptions { count?: "exact" | "planned" | "estimated" }

class QueryBuilder<TRow extends AnyRow = AnyRow> implements PromiseLike<{ data: TRow[]; error: null; count: number | null }> {
  private rows: AnyRow[];
  private wantCount = false;
  private orderBy: { col: string; asc: boolean } | null = null;
  private rangeLimit: number | null = null;

  constructor(private table: string) {
    this.rows = [...(tableMap[table] || [])];
  }

  select(_cols?: string, opts?: CountOptions) {
    if (opts?.count) this.wantCount = true;
    return this;
  }
  insert(payload: AnyRow | AnyRow[]) {
    const list = Array.isArray(payload) ? payload : [payload];
    list.forEach((p, i) => {
      const row = { id: `${this.table}-new-${Date.now()}-${i}`, created_at: new Date().toISOString(), ...p };
      (tableMap[this.table] ||= []).push(row);
      this.rows.push(row);
    });
    return this;
  }
  update(patch: AnyRow) {
    this.rows = this.rows.map(r => ({ ...r, ...patch }));
    return this;
  }
  delete() { this.rows = []; return this; }
  upsert(payload: AnyRow | AnyRow[]) { return this.insert(payload); }

  eq(col: string, val: unknown) { this.rows = this.rows.filter(r => r[col] === val); return this; }
  neq(col: string, val: unknown) { this.rows = this.rows.filter(r => r[col] !== val); return this; }
  in(col: string, vals: unknown[]) { this.rows = this.rows.filter(r => vals.includes(r[col])); return this; }
  gt(col: string, val: any) { this.rows = this.rows.filter(r => r[col] > val); return this; }
  gte(col: string, val: any) { this.rows = this.rows.filter(r => r[col] >= val); return this; }
  lt(col: string, val: any) { this.rows = this.rows.filter(r => r[col] < val); return this; }
  lte(col: string, val: any) { this.rows = this.rows.filter(r => r[col] <= val); return this; }
  like() { return this; }
  ilike(col: string, pattern: string) {
    const re = new RegExp(pattern.replace(/%/g, ".*"), "i");
    this.rows = this.rows.filter(r => re.test(String(r[col] ?? "")));
    return this;
  }
  is(col: string, val: any) { this.rows = this.rows.filter(r => r[col] === val); return this; }
  not(col: string, _op: string, val: any) { this.rows = this.rows.filter(r => r[col] !== val); return this; }
  or() { return this; }
  contains() { return this; }
  match(filters: AnyRow) {
    Object.entries(filters).forEach(([k, v]) => { this.rows = this.rows.filter(r => r[k] === v); });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, asc: opts?.ascending !== false };
    return this;
  }
  limit(n: number) { this.rangeLimit = n; return this; }
  range(from: number, to: number) { this.rows = this.rows.slice(from, to + 1); return this; }

  private build(): TRow[] {
    let out = [...this.rows];
    if (this.orderBy) {
      const { col, asc } = this.orderBy;
      out.sort((a, b) => {
        const av = a[col], bv = b[col];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return asc ? -1 : 1;
        if (av > bv) return asc ? 1 : -1;
        return 0;
      });
    }
    if (this.rangeLimit != null) out = out.slice(0, this.rangeLimit);
    return out as TRow[];
  }

  maybeSingle() {
    const data = this.build()[0] ?? null;
    return Promise.resolve({ data, error: null, count: data ? 1 : 0 });
  }
  single() {
    const data = this.build()[0] ?? null;
    return Promise.resolve({ data, error: null, count: data ? 1 : 0 });
  }

  then<TResult1 = { data: TRow[]; error: null; count: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: TRow[]; error: null; count: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const data = this.build();
    return Promise.resolve({ data, error: null, count: this.wantCount ? data.length : null }).then(onfulfilled, onrejected);
  }
  catch(onrejected?: ((reason: unknown) => unknown) | null) {
    return Promise.resolve(this.build()).catch(onrejected as any);
  }
  finally(onfinally?: (() => void) | null) {
    return Promise.resolve(this.build()).finally(onfinally ?? undefined);
  }
}

export const supabase = {
  from<TRow extends AnyRow = AnyRow>(table: string): QueryBuilder<TRow> {
    return new QueryBuilder<TRow>(table);
  },
  auth: {
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
    resetPasswordForEmail: async () => ({ data: null, error: null }),
    updateUser: async () => ({ data: { user: null }, error: null }),
    getClaims: async () => ({ data: null, error: null }),
    signOut: async () => ({ error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: (_cb: unknown) => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  },
};
