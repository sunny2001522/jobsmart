import { createClient, type Client, type InValue } from "@libsql/client";

let client: Client | null = null;

export function getTursoClient(): Client | null {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) return null;
  client ??= createClient({ url, authToken });
  return client;
}

export async function ensureTursoSchema() {
  const db = getTursoClient();
  if (!db) return false;
  await db.batch([
    `CREATE TABLE IF NOT EXISTS career_profiles (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, display_name TEXT,
      skills_json TEXT NOT NULL DEFAULT '[]', preferences_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS job_opportunities (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, company TEXT NOT NULL, role TEXT NOT NULL,
      url TEXT, match_score INTEGER, source TEXT, jd_json TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS resume_versions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, job_id TEXT, title TEXT NOT NULL,
      content_json TEXT NOT NULL, ats_score INTEGER, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS interview_sessions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, job_id TEXT, question TEXT,
      transcript TEXT, feedback_json TEXT, recording_url TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, action TEXT NOT NULL, provider TEXT NOT NULL,
      model TEXT NOT NULL, input_json TEXT NOT NULL, output_json TEXT NOT NULL, created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_agent_runs_user_created ON agent_runs(user_id, created_at DESC)`,
    ...["profiles", "resumes", "job_applications", "interview_questions", "interview_answers", "value_rankings", "resume_versions", "version_job_resumes", "job_categories", "interview_experiences", "companies", "company_reviews", "linkedin_generations", "ai_usage_logs", "value_cards"].map((table) => `CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, user_id TEXT NOT NULL DEFAULT 'demo-user', status TEXT, category_id TEXT, display_order INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, data_json TEXT NOT NULL DEFAULT '{}')`),
    `CREATE INDEX IF NOT EXISTS idx_jobsmart_user_table ON job_applications(user_id, updated_at DESC)`,
    `CREATE TABLE IF NOT EXISTS linkedin_sync_settings (user_id TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1, frequency TEXT NOT NULL DEFAULT 'daily', sync_profile INTEGER NOT NULL DEFAULT 1, sync_jobs INTEGER NOT NULL DEFAULT 1, next_run_at TEXT, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL, email_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS job_automation_settings (
      user_id TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 0, frequency TEXT NOT NULL DEFAULT 'daily',
      mode TEXT NOT NULL DEFAULT 'review', query TEXT NOT NULL DEFAULT '', sources_json TEXT NOT NULL DEFAULT '["linkedin","indeed","cake","104"]',
      next_run_at TEXT, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS job_leads (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, company TEXT NOT NULL, role TEXT NOT NULL, url TEXT,
      source TEXT NOT NULL, snippet TEXT, status TEXT NOT NULL DEFAULT 'queued', mode TEXT NOT NULL DEFAULT 'review',
      cover_letter_status TEXT NOT NULL DEFAULT 'pending', application_id TEXT, discovered_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_job_leads_user_status ON job_leads(user_id, status, discovered_at DESC)`,
    `CREATE TABLE IF NOT EXISTS job_automation_runs (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, provider TEXT NOT NULL, query TEXT NOT NULL,
      discovered_count INTEGER NOT NULL DEFAULT 0, promoted_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL, error TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS external_connections (
      user_id TEXT NOT NULL, provider TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'disconnected',
      account_label TEXT, scopes_json TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, provider)
    )`,
  ], "write");
  return true;
}

export async function recordAgentRun(input: {
  action: string;
  provider: string;
  model: string;
  request: unknown;
  response: unknown;
  userId?: string;
}) {
  const db = getTursoClient();
  if (!db) return false;
  await ensureTursoSchema();
  await db.execute({
    sql: `INSERT INTO agent_runs (id, user_id, action, provider, model, input_json, output_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [crypto.randomUUID(), input.userId ?? "demo-user", input.action, input.provider, input.model,
      JSON.stringify(input.request), JSON.stringify(input.response), new Date().toISOString()],
  });
  return true;
}

export async function getLatestLinkedInContext() {
  const db = getTursoClient();
  if (!db) return null;
  await ensureTursoSchema();
  const result = await db.execute("SELECT preferences_json FROM career_profiles WHERE user_id = 'demo-user' ORDER BY updated_at DESC LIMIT 1");
  const value = result.rows[0]?.preferences_json;
  if (!value) return null;
  try { return JSON.parse(String(value)); } catch { return null; }
}
