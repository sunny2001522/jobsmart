import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { executeJobSearchForUser, type JobSearchSource } from "@/lib/automation/job-search";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!secret) return false;
  const expectedBytes = Buffer.from(secret);
  const suppliedBytes = Buffer.from(supplied);
  if (suppliedBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(suppliedBytes, expectedBytes);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getTursoClient();
  if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  const now = new Date();
  const nowIso = now.toISOString();
  const due = await db.execute({
    sql: "SELECT user_id, frequency, mode, query, sources_json FROM job_automation_settings WHERE enabled = 1 AND frequency != 'manual' AND next_run_at IS NOT NULL AND next_run_at <= ?",
    args: [nowIso],
  });
  const outcomes: Array<{ userId: string; success: boolean; error?: string }> = [];
  for (const row of due.rows) {
    const userId = String(row.user_id);
    const frequency = String(row.frequency) === "hourly" ? "hourly" : "daily";
    const nextRunAt = new Date(now.getTime() + (frequency === "hourly" ? 60 : 1440) * 60_000).toISOString();
    let sources: JobSearchSource[] = [];
    try {
      const parsed = JSON.parse(String(row.sources_json || "[]"));
      sources = Array.isArray(parsed) ? parsed.filter((source): source is JobSearchSource => ["linkedin", "indeed", "cake", "104"].includes(String(source))) : [];
      const result = await executeJobSearchForUser(userId, { query: String(row.query), sources, mode: String(row.mode) });
      outcomes.push({ userId, success: true });
      console.info("Scheduled job search completed", { userId, runId: result.runId, promoted: result.promoted });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scheduled job search failed";
      await db.execute({
        sql: `INSERT INTO job_automation_runs (id, user_id, provider, query, discovered_count, promoted_count, status, error, created_at)
              VALUES (?, ?, 'google-custom-search', ?, 0, 0, 'failed', ?, ?)`,
        args: [crypto.randomUUID(), userId, String(row.query || ""), message.slice(0, 500), nowIso],
      });
      outcomes.push({ userId, success: false, error: message });
    }
    await db.execute({
      sql: "UPDATE job_automation_settings SET next_run_at = ?, updated_at = ? WHERE user_id = ? AND enabled = 1",
      args: [nextRunAt, nowIso, userId],
    });
  }
  return NextResponse.json({ data: { processed: outcomes.length, outcomes } });
}
