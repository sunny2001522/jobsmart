import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { evaluateInterviewAnswer } from "@/lib/ai/gateway";

const evaluateSchema = z.object({
  question: z.string().min(5, "問題太短"),
  answer: z.string().min(20, "回答太短，請提供更完整的回答"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, answer } = evaluateSchema.parse(body);

    const result = await evaluateInterviewAnswer(question, answer);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
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
