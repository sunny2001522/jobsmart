import { NextRequest, NextResponse } from "next/server";
import { aiGateway } from "@/lib/ai/gateway";
import { z } from "zod";

const optimizeSchema = z.object({
  experience: z.object({
    company: z.string(),
    position: z.string(),
    description: z.string(),
  }),
  topSkills: z.array(z.string()).optional(),
});

// 清理 AI 返回的 JSON（移除 markdown 代碼塊）
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { experience, topSkills } = optimizeSchema.parse(body);

    const skillsContext = topSkills && topSkills.length > 0
      ? `\n\n目標技能關鍵字（請盡量融入）：${topSkills.slice(0, 10).join("、")}`
      : "";

    const prompt = `
公司：${experience.company}
職位：${experience.position}
原始描述：
${experience.description}
${skillsContext}
`;

    const result = await aiGateway("linkedin_generate", prompt, {
      systemPrompt: `你是一個專業的 LinkedIn 優化顧問。請優化以下工作經歷描述，使其更適合 LinkedIn 展示。

優化原則：
1. 使用強動詞開頭（如：領導、推動、優化、建立、達成）
2. 量化成果（加入數據，如百分比、人數、金額）
3. 使用 bullet points 格式
4. 突出成就而非職責
5. 保持專業但有吸引力
6. 如果有提供目標技能，自然地融入相關關鍵字

請返回 JSON 格式：
{
  "optimized": "優化後的經歷描述（Markdown 格式，使用 bullet points）",
  "highlights": ["亮點1", "亮點2", "亮點3"],
  "suggestions": ["額外建議1", "建議2"]
}

只返回 JSON，不要包含任何其他文字。`,
      temperature: 0.7,
    });

    try {
      const cleanedJson = cleanJsonResponse(result.text);
      const parsed = JSON.parse(cleanedJson);
      return NextResponse.json({
        success: true,
        data: {
          optimized: parsed.optimized || experience.description,
          highlights: parsed.highlights || [],
          suggestions: parsed.suggestions || [],
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Raw text:", result.text);
      return NextResponse.json({
        success: false,
        error: "生成失敗，請稍後再試",
      }, { status: 400 });
    }
  } catch (error) {
    console.error("Optimize experience error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "優化失敗",
    }, { status: 500 });
  }
}
