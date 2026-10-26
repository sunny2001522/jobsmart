import { NextResponse } from "next/server";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

const defaults = { enabled: false, frequency: "daily", mode: "review", query: "AI product manager", sources: ["linkedin", "indeed", "cake", "104"], nextRunAt: null };
const frequencies = new Set(["manual", "hourly", "daily"]);
const modes = new Set(["review", "ask", "auto"]);

export async function GET() {
  const db = getTursoClient(); if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  const result = await db.execute({ sql: "SELECT * FROM job_automation_settings WHERE user_id = ?", args: ["demo-user"] });
  const row = result.rows[0]; if (!row) return NextResponse.json({ data: defaults });
  return NextResponse.json({ data: { enabled: Boolean(row.enabled), frequency: String(row.frequency), mode: String(row.mode), query: String(row.query), sources: JSON.parse(String(row.sources_json)), nextRunAt: row.next_run_at ?? null } });
}

export async function POST(request: Request) {
  const body = await request.json();
  const frequency = String(body.frequency || "daily"); const mode = String(body.mode || "review");
  if (!frequencies.has(frequency) || !modes.has(mode)) return NextResponse.json({ error: "設定值無效" }, { status: 400 });
  const db = getTursoClient(); if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  const nextRunAt = body.enabled && frequency !== "manual" ? new Date(Date.now() + (frequency === "hourly" ? 3600000 : 86400000)).toISOString() : null;
  const data = { enabled: Boolean(body.enabled), frequency, mode, query: String(body.query || "").trim(), sources: Array.isArray(body.sources) ? body.sources : defaults.sources, nextRunAt };
  await db.execute({ sql: "INSERT OR REPLACE INTO job_automation_settings (user_id, enabled, frequency, mode, query, sources_json, next_run_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ["demo-user", data.enabled ? 1 : 0, frequency, mode, data.query, JSON.stringify(data.sources), nextRunAt, new Date().toISOString()] });
  return NextResponse.json({ data });
}
