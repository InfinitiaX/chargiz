// Migration shim — kept so existing screens still compile while we move
// every page to the new src/api/ layer. No network call to Supabase is
// performed; everything resolves to empty data of the correct shape so
// the UI keeps rendering without runtime crashes.

type SupabaseListResult<TRow> = {
  data: TRow[];
  error: Error | null;
  count: number | null;
};

type SupabaseSingleResult<TRow> = {
  data: TRow | null;
  error: Error | null;
  count: number | null;
};

type SupabaseMutationResult<TRow> = {
  data: TRow | null;
  error: Error | null;
  count: number | null;
};

const MIGRATION_MESSAGE =
  "Supabase est désactivé pendant la migration vers le backend ChargiZ.";

class SupabaseQueryBuilder<TRow> implements PromiseLike<SupabaseListResult<TRow>> {
  protected mode: "list" | "single" | "mutation" = "list";

  // --- selection / mutation ---
  select<TPicked = TRow>(..._args: unknown[]): SupabaseQueryBuilder<TPicked> {
    return this as unknown as SupabaseQueryBuilder<TPicked>;
  }

  insert(..._args: unknown[]): SupabaseQueryBuilder<TRow> {
    this.mode = "mutation";
    return this;
  }

  update(..._args: unknown[]): SupabaseQueryBuilder<TRow> {
    this.mode = "mutation";
    return this;
  }

  delete(..._args: unknown[]): SupabaseQueryBuilder<TRow> {
    this.mode = "mutation";
    return this;
  }

  upsert(..._args: unknown[]): SupabaseQueryBuilder<TRow> {
    this.mode = "mutation";
    return this;
  }

  // --- filters ---
  eq(..._args: unknown[]) { return this; }
  neq(..._args: unknown[]) { return this; }
  in(..._args: unknown[]) { return this; }
  gt(..._args: unknown[]) { return this; }
  gte(..._args: unknown[]) { return this; }
  lt(..._args: unknown[]) { return this; }
  lte(..._args: unknown[]) { return this; }
  like(..._args: unknown[]) { return this; }
  ilike(..._args: unknown[]) { return this; }
  is(..._args: unknown[]) { return this; }
  not(..._args: unknown[]) { return this; }
  or(..._args: unknown[]) { return this; }
  contains(..._args: unknown[]) { return this; }
  match(..._args: unknown[]) { return this; }

  // --- ordering / paging ---
  order(..._args: unknown[]) { return this; }
  limit(..._args: unknown[]) { return this; }
  range(..._args: unknown[]) { return this; }

  // --- result-shaping ---
  maybeSingle(): PromiseLike<SupabaseSingleResult<TRow>> {
    this.mode = "single";
    return Promise.resolve({ data: null, error: null, count: 0 });
  }

  single(): PromiseLike<SupabaseSingleResult<TRow>> {
    this.mode = "single";
    return Promise.resolve({ data: null, error: null, count: 0 });
  }

  // --- promise interface (default = list) ---
  then<TResult1 = SupabaseListResult<TRow>, TResult2 = never>(
    onfulfilled?:
      | ((value: SupabaseListResult<TRow>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.buildResult()).then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ) {
    return Promise.resolve(this.buildResult()).catch(onrejected);
  }

  finally(onfinally?: (() => void) | null) {
    return Promise.resolve(this.buildResult()).finally(onfinally ?? undefined);
  }

  private buildResult(): SupabaseListResult<TRow> | SupabaseMutationResult<TRow> {
    if (this.mode === "mutation") {
      return { data: null, error: null, count: 0 };
    }
    return { data: [] as TRow[], error: null, count: 0 };
  }
}

type AuthResponse<T> = { data: T | null; error: Error | null };

async function migrationError<T>(): Promise<AuthResponse<T>> {
  return { data: null, error: new Error(MIGRATION_MESSAGE) };
}

export const supabase = {
  from<TRow = Record<string, unknown>>(_table: string): SupabaseQueryBuilder<TRow> {
    return new SupabaseQueryBuilder<TRow>();
  },
  auth: {
    signInWithPassword: (..._args: unknown[]) => migrationError(),
    resetPasswordForEmail: (..._args: unknown[]) => migrationError(),
    updateUser: (..._args: unknown[]) => migrationError(),
    getClaims: (..._args: unknown[]) => migrationError(),
    signOut: async () => ({ error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: (_cb: unknown) => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  },
};
