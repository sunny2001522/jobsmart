import { NextResponse } from "next/server";
import { getLocalUser } from "@/lib/auth/local";
import { generateApplicationPackage } from "@/lib/automation/prepare-application";
import { dispatch } from "@/lib/turso/repository";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getLocalUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { id } = await context.params;
  const db = getTursoClient();
  if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  let recoveryApplicationId = "";
  let recoveryRelationId = "";

  try {
    const body = await request.json();
    const versionId = String(body.versionId ?? "");
    const jdContent = String(body.jdContent ?? "").trim();
    if (!versionId) return NextResponse.json({ error: "請先選擇一份履歷" }, { status: 400 });
    if (jdContent.length < 80) return NextResponse.json({ error: "JD 太短，請貼上完整職缺內容後再分析" }, { status: 400 });

    const result = await db.execute({ sql: "SELECT * FROM job_leads WHERE id = ? AND user_id = ?", args: [id, user.id] });
    const lead = result.rows[0];
    if (!lead) return NextResponse.json({ error: "找不到此職缺，請重新整理頁面" }, { status: 404 });

    const version = await dispatch("getResumeVersion", [versionId]) as { id: string; user_id: string; name: string; base_plain_text?: string | null } | null;
    if (!version || version.user_id !== user.id) return NextResponse.json({ error: "找不到這份履歷" }, { status: 404 });
    if (!version.base_plain_text?.trim()) return NextResponse.json({ error: "這份履歷沒有文字內容，請先完成履歷編輯" }, { status: 400 });
    const profile = await dispatch("getProfile") as Record<string, unknown> | null;
    const claimed = await db.execute({
      sql: "UPDATE job_leads SET status = 'processing', updated_at = ? WHERE id = ? AND user_id = ? AND status != 'processing'",
      args: [new Date().toISOString(), id, user.id],
    });
    if (!claimed.rowsAffected) return NextResponse.json({ error: "這個職缺已在準備中，請稍候重新整理" }, { status: 409 });

    let applicationId = String(lead.application_id ?? "");
    let application: Record<string, unknown> | null = null;
    if (applicationId) {
      const apps = await dispatch("getJobApplications") as Record<string, unknown>[];
      application = apps.find((item) => item.id === applicationId) ?? null;
    }
    if (!application) {
      application = await dispatch("createJobApplication", [{
        company_name: String(lead.company),
        position: String(lead.role),
        jd_url: lead.url ? String(lead.url) : null,
        jd_content: { description: jdContent, source: "user-reviewed", verified_at: new Date().toISOString() },
        jd_keywords: [],
        status: "editing",
        rating_happiness: null,
        rating_salary_match: null,
        rating_colleagues: null,
        rating_pressure: null,
        notes: "JD 已由使用者確認；履歷客製草稿待使用者審核。",
        resume_status: "needs_review",
        cover_letter_status: "generating",
        automation_mode: "review",
        resume_version_id: versionId,
        display_order: 0,
        applied_at: null,
        salary_min: null,
        salary_max: null,
        salary_currency: "TWD",
        salary_period: "monthly",
        benefits: [],
        work_location: null,
        commute_cost: 0,
        rent_estimate: null,
        meal_allowance: 0,
        other_allowance: 0,
        value_scores: null,
        category_id: null,
      }]) as Record<string, unknown> | null;
      applicationId = String(application?.id ?? "");
      if (!applicationId) throw new Error("建立追蹤資料失敗");
      await db.execute({ sql: "UPDATE job_leads SET application_id = ?, updated_at = ? WHERE id = ? AND user_id = ?", args: [applicationId, new Date().toISOString(), id, user.id] });
    }
    recoveryApplicationId = applicationId;

    application = await dispatch("updateJobApplication", [applicationId, {
      jd_content: { description: jdContent, source: "user-reviewed", verified_at: new Date().toISOString() },
      resume_status: "needs_review",
      resume_version_id: versionId,
    }]) as Record<string, unknown> | null;
    if (!application) throw new Error("更新職缺內容失敗");

    let relation = await dispatch("getVersionJobResume", [versionId, applicationId]) as Record<string, unknown> | null;
    if (!relation) relation = await dispatch("addJobToVersion", [versionId, applicationId]) as Record<string, unknown> | null;
    if (!relation?.id) throw new Error("無法建立履歷與職缺的關聯");
    recoveryRelationId = String(relation.id);

    await dispatch("updateVersionJobResume", [String(relation.id), { generation_status: "generating" }]);
    await dispatch("updateJobApplication", [applicationId, { resume_status: "generating" }]);
    const { tailored, coverLetter } = await generateApplicationPackage({
      resumeText: version.base_plain_text,
      jobDescription: jdContent,
      companyName: String(lead.company),
      position: String(lead.role),
      applicantName: String(profile?.name || user.displayName),
      contactEmail: user.email,
    });
    const saved = await dispatch("updateVersionJobResume", [String(relation.id), {
      customized_plain_text: tailored.customizedContent,
      ats_score: tailored.atsScore,
      matched_keywords: tailored.matchedKeywords,
      missing_keywords: tailored.missingKeywords,
      ai_suggestions: { suggestions: tailored.suggestions, audit: tailored.audit },
      generation_status: "completed",
      generated_at: new Date().toISOString(),
    }]) as Record<string, unknown> | null;
    if (!saved) throw new Error("客製履歷儲存失敗");
    application = await dispatch("updateJobApplication", [applicationId, {
      status: "editing",
      resume_status: "needs_review",
      cover_letter: coverLetter,
      cover_letter_status: "needs_review",
      resume_version_id: versionId,
    }]) as Record<string, unknown> | null;
    if (!application) throw new Error("更新履歷審核狀態失敗");

    await db.execute({ sql: "DELETE FROM job_leads WHERE id = ? AND user_id = ?", args: [id, user.id] });
    return NextResponse.json({ data: {
      applicationId,
      application,
      resume: {
        relationId: saved.id,
        versionId,
        versionName: version.name,
        customizedContent: tailored.customizedContent,
        coverLetter,
        atsScore: tailored.atsScore,
        matchedKeywords: tailored.matchedKeywords,
        missingKeywords: tailored.missingKeywords,
        suggestions: tailored.suggestions,
        audit: tailored.audit,
      },
    } });
  } catch (error) {
    console.error("Failed to prepare job application", error);
    if (recoveryRelationId) {
      try { await dispatch("updateVersionJobResume", [recoveryRelationId, { generation_status: "failed" }]); }
      catch (statusError) { console.error("Failed to record resume generation error", statusError); }
    }
    if (recoveryApplicationId) {
      try { await dispatch("updateJobApplication", [recoveryApplicationId, { resume_status: "failed", cover_letter_status: "failed" }]); }
      catch (statusError) { console.error("Failed to record application preparation error", statusError); }
    }
    try {
      await db.execute({ sql: "UPDATE job_leads SET status = 'queued', updated_at = ? WHERE id = ? AND user_id = ? AND status = 'processing'", args: [new Date().toISOString(), id, user.id] });
    } catch (resetError) {
      console.error("Failed to reset job lead after preparation error", resetError);
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "準備失敗，請稍後重試" }, { status: 500 });
  }
}
