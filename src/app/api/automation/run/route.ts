import { NextResponse } from "next/server";
import { getLocalUser } from "@/lib/auth/local";
import { executeJobSearchForUser, type JobSearchSource } from "@/lib/automation/job-search";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

const allowedSources = new Set(["linkedin", "indeed", "cake", "104"]);

export async function POST() {
  const user = await getLocalUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const db = getTursoClient();
  if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  const result = await db.execute({
    sql: "SELECT query, sources_json, mode FROM job_automation_settings WHERE user_id = ?",
    args: [user.id],
  });
  const settings = result.rows[0];
  if (!settings || !String(settings.query || "").trim()) {
    return NextResponse.json({ error: "請先設定職缺關鍵字與搜尋來源" }, { status: 400 });
  }
  let sources: JobSearchSource[];
  try {
    const parsed = JSON.parse(String(settings.sources_json || "[]"));
    sources = Array.isArray(parsed) ? parsed.filter((source): source is JobSearchSource => allowedSources.has(String(source))) : [];
  } catch {
    sources = [];
  }
  try {
    const data = await executeJobSearchForUser(user.id, {
      query: String(settings.query),
      sources,
      mode: String(settings.mode || "review"),
    });
    return NextResponse.json({ data: { ...data, note: "搜尋結果已加入候選佇列；請先確認職缺與完整 JD。" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "職缺搜尋失敗";
    const status = message.includes("尚未設定 Google") ? 503 : message.includes("Google Custom Search") ? 502 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
