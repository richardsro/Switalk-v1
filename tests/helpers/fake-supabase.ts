/**
 * In-memory fake for the Supabase client, just enough surface for our
 * queries. Script responses per table; every method call is recorded so
 * tests can assert on what was written.
 *
 * Each `from(table)` chain consumes ONE scripted result when it hits a
 * terminal (.single() / .maybeSingle() / being awaited).
 */

type Result = { data?: unknown; error?: unknown; count?: number };

export interface RecordedCall {
  table: string;
  method: string;
  args: unknown[];
}

class FakeQuery {
  // eslint-disable-next-line no-use-before-define
  constructor(private db: FakeDb, private table: string) {}

  private record(method: string, args: unknown[]) {
    this.db.calls.push({ table: this.table, method, args });
    return this;
  }

  select(...a: unknown[]) { return this.record("select", a); }
  insert(...a: unknown[]) { return this.record("insert", a); }
  update(...a: unknown[]) { return this.record("update", a); }
  upsert(...a: unknown[]) { return this.record("upsert", a); }
  delete(...a: unknown[]) { return this.record("delete", a); }
  eq(...a: unknown[]) { return this.record("eq", a); }
  neq(...a: unknown[]) { return this.record("neq", a); }
  gte(...a: unknown[]) { return this.record("gte", a); }
  in(...a: unknown[]) { return this.record("in", a); }
  order(...a: unknown[]) { return this.record("order", a); }
  limit(...a: unknown[]) { return this.record("limit", a); }

  private consume(): Result {
    const queue = this.db.scripts[this.table];
    const result = queue && queue.length ? queue.shift()! : {};
    return { data: null, error: null, count: 0, ...result };
  }

  single() { return Promise.resolve(this.consume()); }
  maybeSingle() { return Promise.resolve(this.consume()); }

  // awaiting the builder itself (plain insert/update/delete)
  then<T>(
    resolve: (value: Result) => T,
    reject?: (reason: unknown) => unknown
  ) {
    return Promise.resolve(this.consume()).then(resolve, reject);
  }
}

export class FakeDb {
  scripts: Record<string, Result[]> = {};
  calls: RecordedCall[] = [];
  user: { id: string; email?: string } | null = { id: "user-1", email: "t@t.t" };

  reset(scripts: Record<string, Result[]> = {}) {
    this.scripts = scripts;
    this.calls = [];
    this.user = { id: "user-1", email: "t@t.t" };
  }

  client() {
    const db = this;
    return {
      from(table: string) {
        return new FakeQuery(db, table);
      },
      rpc(name: string, args: unknown) {
        db.calls.push({ table: `rpc:${name}`, method: "rpc", args: [args] });
        const queue = db.scripts[`rpc:${name}`];
        const result = queue && queue.length ? queue.shift()! : {};
        return Promise.resolve({ data: null, error: null, ...result });
      },
      auth: {
        getUser: () => Promise.resolve({ data: { user: db.user } }),
        admin: {
          getUserById: () =>
            Promise.resolve({ data: { user: db.user }, error: null }),
        },
      },
    };
  }

  /** Calls of a given method on a given table, e.g. inserts("messages"). */
  of(table: string, method: string): RecordedCall[] {
    return this.calls.filter((c) => c.table === table && c.method === method);
  }
}

/** Shared singleton — vi.mock factories and tests import the same instance. */
export const db = new FakeDb();
