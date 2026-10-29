import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { evaluateInterviewAnswer } from "@/lib/ai/gateway";
import { serverData } from "@/lib/turso/server-data";
import { getLocalUser } from "@/lib/auth/local";

const evaluateSchema = z.object({
  question: z.string().min(5, "問題太短").max(300),
  answer: z.string().min(20, "回答太短，請提供更完整的回答").max(15000),
  questionId: z.string().min(1).max(200).optional(),
  locale: z.enum(["en", "zh-TW"]).optional().default("zh-TW"),
  durationSeconds: z.number().int().min(0).max(3600).nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, answer, questionId, locale, durationSeconds } = evaluateSchema.parse(body);
    if (!(await getLocalUser())) {
      return NextResponse.json({ success: false, error: locale === "en" ? "Please sign in first." : "請先登入" }, { status: 401 });
    }

    const result = await evaluateInterviewAnswer(question, answer, locale);
    let savedAnswer: { id?: string } | null = null;
    if (questionId) {
      savedAnswer = await serverData<{ id?: string } | null>("createInterviewAnswer", [{
        question_id: questionId,
        transcript: answer.trim(),
        duration_seconds: durationSeconds ?? null,
        word_count: answer.trim().split(/\s+/u).filter(Boolean).length,
        ai_feedback: {
          strengths: result.strengths,
          improvements: result.improvements,
          suggestions: result.suggestions,
        },
        ai_score: result.score,
      }]);
      if (!savedAnswer) throw new Error("Answer was evaluated but could not be saved");
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        saved: Boolean(savedAnswer),
        answerId: savedAnswer?.id ?? null,
        evaluatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? "驗證錯誤" },
        { status: 400 }
      );
    }

    console.error("Interview evaluate error:", error);
    return NextResponse.json(
      { success: false, error: "面試評分失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
