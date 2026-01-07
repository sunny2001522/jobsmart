import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeJD, extractKeywords } from "@/lib/ai/gateway";

const parseJDSchema = z.object({
  content: z.string().min(10, "JD 內容太短"),
  url: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, url } = parseJDSchema.parse(body);

    // 如果提供了 URL，未來可以在這裡爬取內容
    // 目前先使用傳入的內容

    // 分析 JD
    const analysis = await analyzeJD(content);

    // 額外提取關鍵字（如果 JD 分析結果關鍵字不夠）
    if (analysis.keywords.length < 5) {
      const additionalKeywords = await extractKeywords(content);
      analysis.keywords = [
        ...new Set([...analysis.keywords, ...additionalKeywords]),
      ];
    }

    return NextResponse.json({
      success: true,
      data: {
        ...analysis,
        sourceUrl: url,
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? "驗證錯誤" },
        { status: 400 }
      );
    }

    console.error("JD parse error:", error);
    return NextResponse.json(
      { success: false, error: "JD 分析失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
