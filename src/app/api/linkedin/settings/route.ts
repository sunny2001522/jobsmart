import { NextResponse } from "next/server";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

const defaults = { enabled: true, frequency: "daily", syncProfile: true, syncJobs: true, nextRunAt: null };
const allowedFrequencies = new Set(["manual", "15m", "hourly", "daily"]);

export async function GET() {
  const db = getTursoClient();
  if (!db) return NextResponse.json({ success: false, error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  const result = await db.execute("SELECT * FROM linkedin_sync_settings WHERE user_id = 'demo-user'");
  const row = result.rows[0];
  if (!row) return NextResponse.json({ success: true, data: defaults });
  return NextResponse.json({ success: true, data: { enabled: Boolean(row.enabled), frequency: String(row.frequency), syncProfile: Boolean(row.sync_profile), syncJobs: Boolean(row.sync_jobs), nextRunAt: row.next_run_at ?? null } });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!allowedFrequencies.has(body.frequency)) return NextResponse.json({ success: false, error: "Invalid frequency" }, { status: 400 });
  const db = getTursoClient();
  if (!db) return NextResponse.json({ success: false, error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  const nextRunAt = body.enabled && body.frequency !== "manual" ? new Date(Date.now() + (body.frequency === "15m" ? 15 : body.frequency === "hourly" ? 60 : 1440) * 60_000).toISOString() : null;
  await db.execute({ sql: `INSERT OR REPLACE INTO linkedin_sync_settings (user_id, enabled, frequency, sync_profile, sync_jobs, next_run_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, args: ["demo-user", body.enabled ? 1 : 0, body.frequency, body.syncProfile ? 1 : 0, body.syncJobs ? 1 : 0, nextRunAt, new Date().toISOString()] });
  return NextResponse.json({ success: true, data: { enabled: Boolean(body.enabled), frequency: body.frequency, syncProfile: Boolean(body.syncProfile), syncJobs: Boolean(body.syncJobs), nextRunAt } });
}
