import { NextResponse } from "next/server";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const db = getTursoClient(); if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema(); const now = new Date().toISOString();
  const result = await db.execute({ sql: "SELECT * FROM job_leads WHERE id = ? AND user_id = ?", args: [id, "demo-user"] });
  const lead = result.rows[0]; if (!lead) return NextResponse.json({ error: "找不到職缺" }, { status: 404 });
  const applicationId = crypto.randomUUID();
  await db.execute({ sql: "INSERT INTO job_applications (id, user_id, status, category_id, display_order, created_at, updated_at, data_json) VALUES (?, ?, 'editing', NULL, 0, ?, ?, ?)", args: [applicationId, "demo-user", now, now, JSON.stringify({ id: applicationId, user_id: "demo-user", company_name: lead.company, position: lead.role, jd_url: lead.url, jd_content: { description: lead.snippet }, status: "editing", automation_mode: "review", resume_status: "ready", cover_letter_status: "ready", notes: "已由使用者核准進入投遞準備" })] });
  await db.execute({ sql: "DELETE FROM job_leads WHERE id = ? AND user_id = ?", args: [id, "demo-user"] });
  return NextResponse.json({ data: { applicationId, status: "editing" } });
}
