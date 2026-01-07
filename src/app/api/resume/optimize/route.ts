import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { optimizeResume } from "@/lib/ai/gateway";

const optimizeSchema = z.object({
  resumeContent: z.string().min(50, "履歷內容太短"),
  targetJD: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resumeContent, targetJD } = optimizeSchema.parse(body);

    const result = await optimizeResume(resumeContent, targetJD);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        optimizedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? "驗證錯誤" },
        { status: 400 }
      );
    }

    console.error("Resume optimize error:", error);
    return NextResponse.json(
      { success: false, error: "履歷優化失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
