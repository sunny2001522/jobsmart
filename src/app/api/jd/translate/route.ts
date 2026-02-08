import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { translateJD } from "@/lib/ai/gateway";

const translateJDSchema = z.object({
  jdContent: z.object({
    description: z.string().optional(),
    requirements: z.array(z.string()).optional(),
    responsibilities: z.array(z.string()).optional(),
    benefits: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jdContent } = translateJDSchema.parse(body);

    // 檢查是否有足夠內容可翻譯
    if (
      !jdContent.description &&
      !jdContent.requirements?.length &&
      !jdContent.responsibilities?.length
    ) {
      return NextResponse.json(
        { success: false, error: "職缺內容不足，無法翻譯" },
        { status: 400 }
      );
    }

    // 執行翻譯
    const translation = await translateJD({
      description: jdContent.description || "",
      requirements: jdContent.requirements,
      responsibilities: jdContent.responsibilities,
      benefits: jdContent.benefits,
      keywords: jdContent.keywords,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...translation,
        translated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? "驗證錯誤" },
        { status: 400 }
      );
    }

    console.error("JD translate error:", error);
    return NextResponse.json(
      { success: false, error: "翻譯失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
