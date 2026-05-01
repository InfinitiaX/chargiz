type SupabaseResult<T> = {
  data: T;
  error: Error | null;
  count: number | null;
};

const MIGRATION_MESSAGE =
  "Supabase est desactive pendant la migration vers le backend Chargiz.";

class SupabaseQueryStub<TData> implements PromiseLike<SupabaseResult<TData>> {
  private mode: "list" | "single" | "mutation";

  constructor(mode: "list" | "single" | "mutation" = "list") {
    this.mode = mode;
  }

  select(..._args: unknown[]) {
    return this;
  }

  insert(..._args: unknown[]) {
    this.mode = "mutation";
    return this;
  }

  update(..._args: unknown[]) {
    this.mode = "mutation";
    return this;
  }

  delete(..._args: unknown[]) {
    this.mode = "mutation";
    return this;
  }

  eq(..._args: unknown[]) {
    return this;
  }

  in(..._args: unknown[]) {
    return this;
  }

  order(..._args: unknown[]) {
    return this;
  }

  limit(..._args: unknown[]) {
    return this;
  }

  maybeSingle(..._args: unknown[]) {
    this.mode = "single";
    return this as unknown as SupabaseQueryStub<null>;
  }

  single(..._args: unknown[]) {
    this.mode = "single";
    return this as unknown as SupabaseQueryStub<null>;
  }

  then<TResult1 = SupabaseResult<TData>, TResult2 = never>(
    onfulfilled?:
      | ((value: SupabaseResult<TData>) => TResult1 | PromiseLike<TResult1>)
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

  private buildResult(): SupabaseResult<TData> {
    if (this.mode === "single") {
      return {
        data: null as TData,
        error: null,
        count: 0,
      };
    }

    if (this.mode === "mutation") {
      return {
        data: null as TData,
        error: null,
        count: 0,
      };
    }

    return {
      data: [] as TData,
      error: null,
      count: 0,
    };
  }
}

// Temporary migration shim:
// we keep the old import path so legacy screens still render,
// but every Supabase call is neutralized locally and no network
// request is sent to Supabase anymore.
export const supabase = {
  from<TData = unknown>(_table: string) {
    return new SupabaseQueryStub<TData[]>();
  },
  auth: {
    async signInWithPassword(..._args: unknown[]) {
      return {
        data: null,
        error: new Error(MIGRATION_MESSAGE),
      };
    },
    async resetPasswordForEmail(..._args: unknown[]) {
      return {
        data: null,
        error: new Error(MIGRATION_MESSAGE),
      };
    },
    async updateUser(..._args: unknown[]) {
      return {
        data: null,
        error: new Error(MIGRATION_MESSAGE),
      };
    },
    async getClaims(..._args: unknown[]) {
      return {
        data: null,
        error: new Error(MIGRATION_MESSAGE),
      };
    },
  },
};
