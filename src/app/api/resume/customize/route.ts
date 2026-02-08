import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { customizeResume } from "@/lib/ai/gateway";
import { createClient } from "@/lib/supabase/server";
import {
  getResumeVersion,
  getVersionJobResume,
  updateVersionJobResume,
} from "@/lib/supabase/db";

const customizeSchema = z.object({
  versionId: z.string().uuid("無效的版本 ID"),
  jobApplicationId: z.string().uuid("無效的工作 ID"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 驗證使用者
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "未登入" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { versionId, jobApplicationId } = customizeSchema.parse(body);

    // 取得版本資訊（包含基礎履歷）
    const version = await getResumeVersion(versionId);
    if (!version) {
      return NextResponse.json(
        { success: false, error: "找不到此履歷版本" },
        { status: 404 }
      );
    }

    // 確認使用者擁有此版本
    if (version.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "無權限操作此版本" },
        { status: 403 }
      );
    }

    // 取得版本-工作關聯資訊
    const versionJob = await getVersionJobResume(versionId, jobApplicationId);
    if (!versionJob) {
      return NextResponse.json(
        { success: false, error: "此工作尚未加入此版本" },
        { status: 404 }
      );
    }

    // 取得工作詳細資訊
    const { data: jobApplication, error: jobError } = await supabase
      .from("job_applications")
      .select("*")
      .eq("id", jobApplicationId)
      .single();

    if (jobError || !jobApplication) {
      return NextResponse.json(
        { success: false, error: "找不到此工作" },
        { status: 404 }
      );
    }

    // 檢查是否有 JD 內容
    let jdContent = jobApplication.jd_content;

    // 如果 jd_content 是 JSONB 物件，嘗試提取文字
    if (jdContent && typeof jdContent === 'object') {
      // 可能是 { content: "..." } 或 TipTap JSON 格式
      if ('content' in jdContent && typeof jdContent.content === 'string') {
        jdContent = jdContent.content;
      } else {
        // 嘗試轉換為字串
        jdContent = JSON.stringify(jdContent);
      }
    }

    if (!jdContent || (typeof jdContent === 'string' && jdContent.trim().length === 0)) {
      return NextResponse.json(
        { success: false, error: "此工作沒有 JD 內容，請先填寫 JD" },
        { status: 400 }
      );
    }

    // 取得基礎履歷純文字
    const baseResumeText = version.base_plain_text;
    if (!baseResumeText) {
      return NextResponse.json(
        { success: false, error: "基礎履歷為空，請先編輯履歷" },
        { status: 400 }
      );
    }

    // 更新狀態為生成中
    await updateVersionJobResume(versionJob.id, {
      generation_status: "generating",
    });

    // 呼叫 AI 生成
    const result = await customizeResume(
      baseResumeText,
      jdContent,
      jobApplication.company_name,
      jobApplication.position
    );

    // 儲存結果
    const updated = await updateVersionJobResume(versionJob.id, {
      customized_plain_text: result.customizedContent,
      ats_score: result.atsScore,
      matched_keywords: result.matchedKeywords,
      missing_keywords: result.missingKeywords,
      ai_suggestions: { suggestions: result.suggestions },
      generation_status: "completed",
      generated_at: new Date().toISOString(),
    });

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
        atsScore: result.atsScore,
        matchedKeywords: result.matchedKeywords,
        missingKeywords: result.missingKeywords,
        suggestions: result.suggestions,
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

    return NextResponse.json(
      { success: false, error: "履歷客製化失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
