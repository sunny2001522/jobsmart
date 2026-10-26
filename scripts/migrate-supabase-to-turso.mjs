import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createTursoClient } from "@libsql/client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY");
if (!tursoUrl || !tursoToken) throw new Error("Missing Turso URL or TURSO_AUTH_TOKEN");

const source = createSupabaseClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
const target = createTursoClient({ url: tursoUrl, authToken: tursoToken });
const tables = [
  "profiles", "resumes", "job_applications", "interview_questions", "interview_answers",
  "value_rankings", "resume_versions", "version_job_resumes", "job_categories",
  "interview_experiences", "companies", "company_reviews", "linkedin_generations",
  "ai_usage_logs", "value_cards",
];

await target.batch(tables.map((table) => `CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, user_id TEXT NOT NULL DEFAULT 'demo-user', status TEXT, category_id TEXT, display_order INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, data_json TEXT NOT NULL DEFAULT '{}')`), "write");

let total = 0;
for (const table of tables) {
  const { data, error } = await source.from(table).select("*");
  if (error) {
    if (error.code === "42P01") { console.log(`${table}: skipped (not present)`); continue; }
    throw new Error(`${table}: ${error.message}`);
  }
  const rows = data ?? [];
  for (const row of rows) {
    const id = String(row.id ?? crypto.randomUUID());
    const userId = String(row.user_id ?? row.id ?? "demo-user");
    const createdAt = String(row.created_at ?? new Date().toISOString());
    const updatedAt = String(row.updated_at ?? createdAt);
    await target.execute({
      sql: `INSERT OR REPLACE INTO ${table} (id, user_id, status, category_id, display_order, created_at, updated_at, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, row.status == null ? null : String(row.status), row.category_id == null ? null : String(row.category_id), Number(row.display_order ?? 0), createdAt, updatedAt, JSON.stringify(row)],
    });
  }
  total += rows.length;
  console.log(`${table}: ${rows.length} rows migrated`);
}
console.log(`Migration complete: ${total} rows`);
