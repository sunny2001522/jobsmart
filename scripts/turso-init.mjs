import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN first");

const db = createClient({ url, authToken });
await db.batch([
  `CREATE TABLE IF NOT EXISTS career_profiles (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, display_name TEXT, skills_json TEXT NOT NULL DEFAULT '[]', preferences_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS job_opportunities (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, company TEXT NOT NULL, role TEXT NOT NULL, url TEXT, match_score INTEGER, source TEXT, jd_json TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS resume_versions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, job_id TEXT, title TEXT NOT NULL, content_json TEXT NOT NULL, ats_score INTEGER, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS interview_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, job_id TEXT, question TEXT, transcript TEXT, feedback_json TEXT, recording_url TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS agent_runs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, action TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL, input_json TEXT NOT NULL, output_json TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_agent_runs_user_created ON agent_runs(user_id, created_at DESC)`,
], "write");
console.log("Turso schema ready");
