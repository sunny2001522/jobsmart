import { NextResponse } from "next/server";
import { getLocalUser } from "@/lib/auth/local";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

const defaultSources = ["linkedin", "indeed", "cake", "104"];
const allowedSources = new Set(defaultSources);
const frequencies = new Set(["manual", "hourly", "daily"]);
const modes = new Set(["review", "ask"]);

function unauthorized() { return NextResponse.json({ error: "請先登入" }, { status: 401 }); }

export async function GET() {
  const user = await getLocalUser();
  if (!user) return unauthorized();
  const db = getTursoClient();
  if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  const result = await db.execute({ sql: "SELECT * FROM job_automation_settings WHERE user_id = ?", args: [user.id] });
  const row = result.rows[0];
  if (!row) return NextResponse.json({ data: { enabled: false, frequency: "manual", mode: "review", query: "", sources: defaultSources, nextRunAt: null } });
  let sources: string[] = defaultSources;
  try { sources = JSON.parse(String(row.sources_json || "[]")); } catch { /* use defaults */ }
  return NextResponse.json({ data: {
    enabled: Boolean(row.enabled),
    frequency: frequencies.has(String(row.frequency)) ? String(row.frequency) : "manual",
    mode: String(row.mode) === "ask" ? "ask" : "review",
    query: String(row.query || ""),
    sources: sources.filter((source) => allowedSources.has(source)),
    nextRunAt: row.next_run_at ?? null,
  } });
}

export async function POST(request: Request) {
  const user = await getLocalUser();
  if (!user) return unauthorized();
  const body = await request.json();
  const frequency = String(body.frequency || "manual");
  const mode = String(body.mode || "review");
  const query = String(body.query || "").trim().slice(0, 200);
  const sources = Array.isArray(body.sources) ? body.sources.filter((source: unknown) => allowedSources.has(String(source))) : [];
  const enabled = Boolean(body.enabled);
  if (!frequencies.has(frequency) || !modes.has(mode)) return NextResponse.json({ error: "設定值無效" }, { status: 400 });
  if (enabled && query.length < 2) return NextResponse.json({ error: "啟用搜尋前請輸入至少 2 個字的職缺條件" }, { status: 400 });
  if (enabled && !sources.length) return NextResponse.json({ error: "請至少選擇一個職缺來源" }, { status: 400 });
  const db = getTursoClient();
  if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  const nextRunAt = enabled && frequency !== "manual"
    ? new Date(Date.now() + (frequency === "hourly" ? 60 : 1440) * 60_000).toISOString()
    : null;
  const data = { enabled, frequency, mode, query, sources, nextRunAt };
  await db.execute({
    sql: `INSERT OR REPLACE INTO job_automation_settings (user_id, enabled, frequency, mode, query, sources_json, next_run_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [user.id, enabled ? 1 : 0, frequency, mode, query, JSON.stringify(sources), nextRunAt, new Date().toISOString()],
  });
  return NextResponse.json({ data });
}
