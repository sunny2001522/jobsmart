import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { aiGateway } from "@/lib/ai/gateway";
import { extractJobTextFromHTML, normalizeJobList, normalizeJobText } from "@/lib/crawler/job-description";

const fetchJDSchema = z.object({
  url: z.string().url("請輸入有效的網址"),
});

// 支援的網站
const SUPPORTED_SITES = [
  { domain: "cakeresume.com", name: "CakeResume" },
  { domain: "cake.me", name: "CakeResume" },
  { domain: "104.com.tw", name: "104人力銀行" },
  { domain: "yourator.co", name: "Yourator" },
  { domain: "meet.jobs", name: "Meet.jobs" },
];

function getSiteName(url: string): string | null {
  for (const site of SUPPORTED_SITES) {
    if (url.includes(site.domain)) {
      return site.name;
    }
  }
  return null;
}

// 清理 HTML 標籤，提取純文字
function extractTextFromHTML(html: string): string {
  return extractJobTextFromHTML(html);
  /*
  // 移除 script 和 style 標籤及其內容
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // 移除 HTML 註解
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  // 將 br 和 p 標籤替換為換行
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");

  // 移除所有 HTML 標籤
  text = text.replace(/<[^>]+>/g, " ");

  // 解碼 HTML 實體
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&mdash;/g, "—");
  text = text.replace(/&ndash;/g, "–");

  // 清理多餘的空白和換行
  text = text.replace(/\s+/g, " ");
  text = text.replace(/\n\s*\n/g, "\n\n");
  text = text.trim();

  return text;
  */
}

// 使用 AI 從網頁內容中提取 JD
async function extractJDFromContent(
  content: string,
  url: string,
  siteName: string | null
): Promise<{
  companyName: string;
  position: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  keywords: string[];
  salary?: string;
  location?: string;
}> {
  const result = await aiGateway("jd_analysis", content, {
    systemPrompt: `你是一個專業的職缺資訊提取專家。請從以下網頁內容中提取職缺資訊。
這是來自 ${siteName || "求職網站"} 的職缺頁面。

請仔細分析內容，提取以下資訊：
1. 公司名稱
2. 職位名稱
3. 職缺描述（完整描述）
4. 職位要求（學歷、經驗、技能等）
5. 工作職責
6. 福利待遇（薪資、獎金、保險、假期、零食、培訓等）
7. 關鍵技能和關鍵字
8. 薪資範圍（如果有）
9. 工作地點（如果有）

重要：輸入可能包含網站導覽列、頁尾、登入按鈕、購物車、選單文字或重複的網站 UI，全部忽略，只保留這個職缺本身的內容。description 請保留段落與條列的換行；不要把多個段落串成一行，也不要加入輸入中不存在的內容。

請返回 JSON 格式：
{
  "companyName": "公司名稱",
  "position": "職位名稱",
  "description": "完整的職缺描述文字",
  "requirements": ["要求1", "要求2"],
  "responsibilities": ["職責1", "職責2"],
  "benefits": ["福利1", "福利2", "福利3"],
  "keywords": ["關鍵字1", "關鍵字2"],
  "salary": "薪資範圍（選填）",
  "location": "工作地點（選填）"
}

重要提示：
- benefits 要盡可能完整，包括所有提到的福利項目
- 如果有列出具體薪資或範圍，請提取到 salary 欄位
- keywords 應包含技術棧、工具、軟技能等
- 只返回 JSON，不要包含其他文字`,
    temperature: 0.3,
    maxTokens: 4096,
  });

  try {
    // 嘗試解析 JSON
    let jsonStr = result.text.trim();
    // 移除可能的 markdown 代碼塊標記
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);
    return {
      companyName: parsed.companyName || "",
      position: parsed.position || "",
      description: normalizeJobText(parsed.description),
      requirements: normalizeJobList(parsed.requirements),
      responsibilities: normalizeJobList(parsed.responsibilities),
      benefits: normalizeJobList(parsed.benefits),
      keywords: normalizeJobList(parsed.keywords),
      salary: normalizeJobText(parsed.salary) || undefined,
      location: normalizeJobText(parsed.location) || undefined,
    };
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("無法解析職缺資訊");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = fetchJDSchema.parse(body);

    const siteName = getSiteName(url);

    // 抓取網頁內容
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `無法存取網頁 (${response.status})` },
        { status: 400 }
      );
    }

    const html = await response.text();

    // 提取純文字
    const textContent = extractTextFromHTML(html);

    if (textContent.length < 100) {
      return NextResponse.json(
        { success: false, error: "網頁內容太少，可能需要登入或頁面已失效" },
        { status: 400 }
      );
    }

    // 限制內容長度避免 token 超出
    const truncatedContent = textContent.slice(0, 15000);

    // 使用 AI 提取 JD 資訊
    const jdData = await extractJDFromContent(truncatedContent, url, siteName);

    return NextResponse.json({
      success: true,
      data: {
        ...jdData,
        sourceUrl: url,
        sourceSite: siteName,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? "驗證錯誤" },
        { status: 400 }
      );
    }

    console.error("JD fetch error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "抓取失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
