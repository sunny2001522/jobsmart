import { NextResponse } from "next/server";
import { customizeResume } from "@/lib/ai/gateway";
import { dispatch } from "@/lib/turso/repository";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

function extractJd(application: Record<string, unknown>) {
  const content = application.jd_content;
  if (content && typeof content === "object") {
    const record = content as Record<string, unknown>;
    return [record.description, record.requirements, record.responsibilities, record.benefits]
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .filter(Boolean).join("\n").trim();
  }
  return "";
}

export async function POST(request: Request) {
  const db = getTursoClient();
  if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  try {
    const body = await request.json();
    const applicationId = String(body.applicationId || "");
    const versionId = String(body.versionId || "");
    if (!applicationId || !versionId) return NextResponse.json({ error: "請先選擇原始履歷" }, { status: 400 });
    const applications = await dispatch("getJobApplications") as Array<Record<string, unknown>>;
    const application = applications.find((item) => String(item.id) === applicationId);
    if (!application) return NextResponse.json({ error: "找不到這個職缺" }, { status: 404 });
    const version = await dispatch("getResumeVersion", [versionId]) as Record<string, unknown> | null;
    if (!version?.base_plain_text || !String(version.base_plain_text).trim()) return NextResponse.json({ error: "原始履歷沒有文字內容，請先完成履歷" }, { status: 400 });
    const jd = String(body.jdContent || extractJd(application)).trim();
    if (jd.length < 20) return NextResponse.json({ error: "找不到完整 JD，請先開啟職缺詳情並取得 JD" }, { status: 400 });
    const updated = await dispatch("updateJobApplication", [applicationId, { status: "editing", resume_version_id: versionId, resume_status: "generating" }]) as Record<string, unknown> | null;
    let relation = await dispatch("getVersionJobResume", [versionId, applicationId]) as Record<string, unknown> | null;
    if (!relation) relation = await dispatch("addJobToVersion", [versionId, applicationId]) as Record<string, unknown> | null;
    if (!relation?.id) throw new Error("無法建立履歷關聯");
    const tailored = await customizeResume(String(version.base_plain_text), jd, String(application.company_name), String(application.position));
    await dispatch("updateVersionJobResume", [String(relation.id), {
      customized_plain_text: tailored.customizedContent,
      ats_score: tailored.atsScore,
      matched_keywords: tailored.matchedKeywords,
      missing_keywords: tailored.missingKeywords,
      ai_suggestions: { suggestions: tailored.suggestions, audit: tailored.audit },
      generation_status: "completed",
      generated_at: new Date().toISOString(),
    }]);
    const savedApplication = await dispatch("updateJobApplication", [applicationId, { status: "editing", resume_status: "needs_review", resume_version_id: versionId }]);
    return NextResponse.json({ data: { application: savedApplication || updated, versionId, versionName: version.name, relationId: relation.id, ...tailored } });
  } catch (error) {
    console.error("Failed to approve application", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "履歷準備失敗，請稍後重試" }, { status: 500 });
  }
}
