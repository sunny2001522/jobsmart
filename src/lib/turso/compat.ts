// Turso-backed compatibility helpers for the older server routes. This keeps
// their query shape stable while removing the Turso SDK and PostgREST.
// @ts-nocheck
import { getLocalUser } from "@/lib/auth/local";
import { ensureTursoSchema, getTursoClient } from "./server";

function query(table: string) {
  const filters: Record<string, unknown> = {};
  let operation = "select";
  let payload: any = null;
  let columns = "*";
  const builder: any = {
    select(value = "*") { columns = value; operation = "select"; return builder; },
    eq(key: string, value: unknown) { filters[key] = value; return builder; },
    order() { return builder; },
    limit() { return builder; },
    single() { builder._single = true; return builder; },
    maybeSingle() { builder._single = true; return builder; },
    insert(value: any) { operation = "insert"; payload = value; return builder; },
    upsert(value: any) { operation = "upsert"; payload = value; return builder; },
    update(value: any) { operation = "update"; payload = value; return builder; },
    delete() { operation = "delete"; return builder; },
    then(resolve: any, reject: any) { return execute().then(resolve, reject); },
  };
  async function execute() {
    const db = getTursoClient();
    if (!db) return { data: null, error: new Error("Turso is not configured") };
    try {
      await ensureTursoSchema();
      const args: any[] = [];
      const where = Object.entries(filters).map(([key, value]) => `${key} = ?`).join(" AND ") || "1=1";
      Object.values(filters).forEach((value) => args.push(value));
      if (operation === "select") {
        const result = await db.execute({ sql: `SELECT ${columns} FROM ${table} WHERE ${where}`, args });
        const rows = result.rows.map((row: any) => ({ ...row }));
        return { data: builder._single ? (rows[0] ?? null) : rows, error: null };
      }
      const rows = Array.isArray(payload) ? payload : [payload];
      for (const row of rows) {
        const id = String(row.id ?? crypto.randomUUID());
        const record = { ...row, id, user_id: row.user_id ?? (await getLocalUser())?.id ?? "demo-user" };
        if (operation === "delete") { await db.execute({ sql: `DELETE FROM ${table} WHERE ${where}`, args }); continue; }
        if (operation === "update") {
          const entries = Object.entries(record).filter(([key]) => key !== "id");
          await db.execute({ sql: `UPDATE ${table} SET ${entries.map(([key]) => `${key} = ?`).join(", ")} WHERE ${where}`, args: [...entries.map(([, value]) => value), ...args] });
          continue;
        }
        const entries = Object.entries(record);
        await db.execute({ sql: `${operation === "upsert" ? "INSERT OR REPLACE" : "INSERT"} INTO ${table} (${entries.map(([key]) => key).join(",")}) VALUES (${entries.map(() => "?").join(",")})`, args: entries.map(([, value]) => value) });
      }
      return { data: payload, error: null };
    } catch (error) { return { data: null, error }; }
  }
  return builder;
}

export async function createClient() {
  return {
    auth: {
      async getUser() { const user = await getLocalUser(); return { data: { user: user ? { id: user.id, email: user.email, user_metadata: { name: user.displayName } } : null }, error: null }; },
      async exchangeCodeForSession(_code: string) { return { error: new Error("OAuth callback is not configured; use local Turso auth") }; },
    },
    from: query,
  };
}

export function createAdminClient() { return { from: query, auth: { getUser: async () => ({ data: { user: null }, error: null }) } }; }
