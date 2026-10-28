import { NextResponse } from "next/server";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";
import { dispatch } from "@/lib/turso/repository";

export async function GET() {
  const db = getTursoClient(); if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  const result = await db.execute({ sql: "SELECT * FROM job_leads WHERE user_id = ? ORDER BY discovered_at DESC LIMIT 50", args: ["demo-user"] });
  const applications = await dispatch("getJobApplications") as Array<Record<string, unknown>>;
  for (const lead of result.rows as Array<Record<string, unknown>>) {
    if (String(lead.status) !== "queued" || lead.application_id) continue;
    const existing = applications.find((app) => String(app.jd_url || "") === String(lead.url || ""));
    const application = existing || await dispatch("createJobApplication", [{
      company_id: null,
      company_name: String(lead.company || "Unknown company"),
      position: String(lead.role || "Untitled role"),
      jd_url: lead.url ? String(lead.url) : null,
      jd_content: { description: String(lead.snippet || ""), source: "automation" },
      jd_content_zh: null,
      jd_keywords: [],
      status: "wishlist",
      rating_happiness: null, rating_salary_match: null, rating_colleagues: null, rating_pressure: null,
      notes: "由 AI 職缺搜尋加入，等待確認",
      display_order: 0, applied_at: null,
      salary_min: null, salary_max: null, salary_currency: "TWD", salary_period: "monthly", benefits: [],
      work_location: null, commute_cost: 0, rent_estimate: null, meal_allowance: 0, other_allowance: 0,
      value_scores: null, category_id: null,
    }]) as Record<string, unknown> | null;
    if (application?.id) {
      await db.execute({ sql: "UPDATE job_leads SET application_id = ?, updated_at = ? WHERE id = ? AND user_id = ?", args: [String(application.id), new Date().toISOString(), String(lead.id), "demo-user"] });
    }
  }
  const refreshed = await db.execute({ sql: "SELECT * FROM job_leads WHERE user_id = ? ORDER BY discovered_at DESC LIMIT 50", args: ["demo-user"] });
  return NextResponse.json({ data: refreshed.rows });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const db = getTursoClient(); if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  if (!id) return NextResponse.json({ error: "缺少職缺 ID" }, { status: 400 });
  await ensureTursoSchema();
  await db.execute({ sql: "DELETE FROM job_leads WHERE id = ? AND user_id = ?", args: [id, "demo-user"] });
  return NextResponse.json({ data: { deleted: true } });
}
