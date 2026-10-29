import { NextResponse } from "next/server";
import { getLocalUser } from "@/lib/auth/local";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

const defaults = { enabled: true, syncProfile: false, syncJobs: false };

export async function GET() {
  const user = await getLocalUser();
  if (!user) return NextResponse.json({ success: false, error: "請先登入" }, { status: 401 });
  const db = getTursoClient();
  if (!db) return NextResponse.json({ success: false, error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  const result = await db.execute({ sql: "SELECT enabled, sync_profile, sync_jobs FROM linkedin_sync_settings WHERE user_id = ?", args: [user.id] });
  const row = result.rows[0];
  return NextResponse.json({ success: true, data: row ? { enabled: Boolean(row.enabled), syncProfile: Boolean(row.sync_profile), syncJobs: Boolean(row.sync_jobs) } : defaults });
}

export async function POST(request: Request) {
  const user = await getLocalUser();
  if (!user) return NextResponse.json({ success: false, error: "請先登入" }, { status: 401 });
  const body = await request.json();
  const data = { enabled: Boolean(body.enabled), syncProfile: Boolean(body.syncProfile), syncJobs: Boolean(body.syncJobs) };
  const db = getTursoClient();
  if (!db) return NextResponse.json({ success: false, error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  await db.execute({
    sql: `INSERT OR REPLACE INTO linkedin_sync_settings (user_id, enabled, frequency, sync_profile, sync_jobs, next_run_at, updated_at, sync_consent_version)
          VALUES (?, ?, 'manual', ?, ?, NULL, ?, 1)`,
    args: [user.id, data.enabled ? 1 : 0, data.syncProfile ? 1 : 0, data.syncJobs ? 1 : 0, new Date().toISOString()],
  });
  if (!data.enabled) {
    await db.execute({
      sql: "UPDATE linkedin_fill_tasks SET status = 'revoked', updated_at = ? WHERE user_id = ? AND status IN ('pending', 'active')",
      args: [new Date().toISOString(), user.id],
    });
  }
  return NextResponse.json({ success: true, data });
}
