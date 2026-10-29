import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { customizeResume } from "@/lib/ai/gateway";
import { inferResumeLanguageCode } from "@/lib/resume/languages";
import { createClient } from "@/lib/turso/compat";
import { serverData } from "@/lib/turso/server-data";
import type { ResumeVersion, VersionJobResume } from "@/lib/turso/types";

const customizeSchema = z.object({
  versionId: z.string().uuid("無效的版本 ID"),
  jobApplicationId: z.string().uuid("無效的工作 ID"),
  languageCode: z.string().max(16).optional(),
  additionalContext: z.string().max(5000).optional(),
});

function unpackStoredRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function extractJobDescription(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of ["description", "content", "text"]) {
    if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
  }
  return "";
}

export async function POST(request: NextRequest) {
  let versionJobId: string | null = null;
  try {
    const tursoClient = await createClient();

    // 驗證使用者
    const {
      data: { user },
      error: authError,
    } = await tursoClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "未登入" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { versionId, jobApplicationId, additionalContext, languageCode: requestedLanguage } = customizeSchema.parse(body);

    // 取得版本資訊（包含基礎履歷）
    const version = await serverData<ResumeVersion | null>("getResumeVersion", [versionId]);
    if (!version) {
      return NextResponse.json(
        { success: false, error: "找不到此履歷版本" },
        { status: 404 }
      );
    }

    // Resume versions are private to the signed-in user.
    if (version.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "無權限操作此版本" },
        { status: 403 }
      );
    }

    // 取得版本-工作關聯資訊
    const versionJob = await serverData<VersionJobResume | null>("getVersionJobResume", [versionId, jobApplicationId]);
    if (!versionJob) {
      return NextResponse.json(
        { success: false, error: "此工作尚未加入此版本" },
        { status: 404 }
      );
    }
    versionJobId = versionJob.id;

    // 取得工作詳細資訊
    const { data: jobApplication, error: jobError } = await tursoClient
      .from("job_applications")
      .select("*")
      .eq("id", jobApplicationId)
      .eq("user_id", user.id)
      .single();

    if (jobError || !jobApplication) {
      return NextResponse.json(
        { success: false, error: "找不到此工作" },
        { status: 404 }
      );
    }

    // The Turso compatibility query returns storage columns as well as the
    // serialized record. Prefer the latter: older columns can be null even
    // when the application has a saved JD.
    const storedJob = unpackStoredRecord(jobApplication.data_json);
    const jdContent = extractJobDescription(storedJob.jd_content ?? jobApplication.jd_content);

    if (!jdContent) {
      return NextResponse.json(
        { success: false, code: "missing_jd", error: "此工作沒有 JD 內容，請先填寫 JD" },
        { status: 400 }
      );
    }

    // 取得基礎履歷純文字
    const baseLanguage = version.base_language || inferResumeLanguageCode(version.base_plain_text);
    const languageCode = requestedLanguage || version.active_language || baseLanguage;
    const selectedVariant = version.language_variants?.find((variant) => variant.language_code === languageCode);
    const baseResumeText = languageCode === baseLanguage
      ? version.base_plain_text
      : selectedVariant?.plain_text;
    if (!baseResumeText) {
      return NextResponse.json(
        { success: false, code: "missing_resume", error: "這個語言版本尚未建立，請先到編輯器新增版本" },
        { status: 400 }
      );
    }
    // 更新狀態為生成中
    await serverData<VersionJobResume | null>("updateVersionJobResume", [versionJob.id, {
      generation_status: "generating",
    }]);

    // 呼叫 AI 生成
    const result = await customizeResume(
      baseResumeText,
      jdContent,
      String(storedJob.company_name ?? jobApplication.company_name ?? ""),
      String(storedJob.position ?? jobApplication.position ?? ""),
      additionalContext
    );

    const customizedVariants = [
      ...(versionJob.customized_variants ?? []).filter((variant) => variant.language_code !== languageCode),
      {
        language_code: languageCode,
        customized_plain_text: result.customizedContent,
        jd_highlight_phrases: result.jdDrivenPhrases,
        ats_score: result.atsScore,
        matched_keywords: result.matchedKeywords,
      },
    ];

    await serverData<ResumeVersion | null>("updateResumeVersion", [versionId, { base_ats_score: result.baseAtsScore }]);

    // 儲存結果
    const updated = await serverData<VersionJobResume | null>("updateVersionJobResume", [versionJob.id, {
      customized_plain_text: result.customizedContent,
      customized_language_code: languageCode,
      customized_variants: customizedVariants,
      jd_highlight_phrases: result.jdDrivenPhrases,
      ats_score: result.atsScore,
      matched_keywords: result.matchedKeywords,
      missing_keywords: result.missingKeywords,
      ai_suggestions: { suggestions: result.suggestions, audit: result.audit },
      generation_status: "completed",
      generated_at: new Date().toISOString(),
    }]);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "儲存失敗" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        customizedContent: result.customizedContent,
        jdDrivenPhrases: result.jdDrivenPhrases,
        languageCode,
        baseAtsScore: result.baseAtsScore,
        atsScore: result.atsScore,
        matchedKeywords: result.matchedKeywords,
        missingKeywords: result.missingKeywords,
        suggestions: result.suggestions,
        audit: result.audit,
        usedSourceFallback: result.usedSourceFallback,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? "驗證錯誤" },
        { status: 400 }
      );
    }

    console.error("Resume customize error:", error);

    if (versionJobId) {
      await serverData<VersionJobResume | null>("updateVersionJobResume", [versionJobId, { generation_status: "failed" }]).catch(() => undefined);
    }

    // Preserve actionable provider configuration errors for the UI. Other
    // internal failures remain deliberately generic.
    if (error instanceof Error && error.message.startsWith("Nebius 驗證失敗")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { success: false, error: "履歷客製化失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
