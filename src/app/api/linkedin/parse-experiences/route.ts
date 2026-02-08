import { NextRequest, NextResponse } from "next/server";
import { aiGateway } from "@/lib/ai/gateway";
import { z } from "zod";

const parseSchema = z.object({
  resumeText: z.string().min(1, "履歷內容不能為空"),
});

export interface ParsedExperience {
  company: string;
  position: string;
  duration: string;
  description: string;
}

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
    const { resumeText } = parseSchema.parse(body);

    const result = await aiGateway("jd_analysis", resumeText, {
      systemPrompt: `你是一個專業的履歷解析專家。請從以下履歷內容中提取所有工作經歷。

請返回 JSON 格式：
{
  "experiences": [
    {
      "company": "公司名稱",
      "position": "職位名稱",
      "duration": "在職時間（如 2020/01 - 2023/06）",
      "description": "工作描述（保持原文，包含職責和成就）"
    }
  ]
}

注意事項：
1. 按時間順序排列（最新的在前）
2. 保持描述的原始內容，不要修改或摘要
3. 如果無法判斷時間，duration 留空字串
4. 只返回 JSON，不要包含任何其他文字`,
      temperature: 0.3,
    });

    try {
      const cleanedJson = cleanJsonResponse(result.text);
      const parsed = JSON.parse(cleanedJson);
      return NextResponse.json({
        success: true,
        data: {
          experiences: parsed.experiences || [],
          parsedAt: new Date().toISOString(),
        },
      });
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Raw text:", result.text);
      return NextResponse.json({
        success: false,
        error: "解析失敗，請確認履歷內容格式",
      }, { status: 400 });
    }
  } catch (error) {
    console.error("Parse experiences error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "解析失敗",
    }, { status: 500 });
  }
}
