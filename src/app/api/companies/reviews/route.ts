import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { crawlCompanyReviews, calculateCompanyRatings, type ReviewSource, crawlInterviewExperiences } from "@/lib/crawler";
import {
  getCachedCompanyReviews,
  setCachedCompanyReviews,
} from "@/lib/redis/client";
import { saveInterviewExperiences } from "@/lib/supabase/db";
import type { InterviewSource } from "@/types";

// Vercel serverless function configuration
// Increase timeout for crawling with proxy (ScraperAPI can be slow)
export const maxDuration = 60; // 60 seconds for Pro plan

const reviewsSchema = z.object({
  companyName: z.string().min(1, "請提供公司名稱"),
  contentType: z.enum(["reviews", "interviews"]).optional().default("reviews"),
  sources: z
    .array(z.enum(["dcard", "qollie", "ptt", "medium"]))
    .optional()
    .default(["dcard", "qollie", "ptt"]),
  forceRefresh: z.boolean().optional().default(false),
  limit: z.number().min(1).max(50).optional().default(10),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName, contentType, sources, forceRefresh, limit } = reviewsSchema.parse(body);

    // 面試經驗搜尋
    if (contentType === "interviews") {
      return handleInterviewSearch(companyName, sources as InterviewSource[], limit);
    }

    // 以下是原本的評論搜尋邏輯

    // 檢查快取 (只有在使用預設來源時才使用快取)
    const isDefaultSources =
      sources.length === 3 &&
      sources.includes("dcard") &&
      sources.includes("qollie") &&
      sources.includes("ptt");

    if (!forceRefresh && isDefaultSources) {
      try {
        const cached = await getCachedCompanyReviews(companyName);
        if (cached) {
          return NextResponse.json({
            success: true,
            cached: true,
            data: cached,
          });
        }
      } catch {
        // Redis 不可用時繼續爬取
        console.warn("Redis cache unavailable, proceeding with crawl");
      }
    }

    // 爬取評論
    const crawlResult = await crawlCompanyReviews(companyName, {
      sources: sources as ReviewSource[],
      limit,
      analyzeSentiment: true,
    });

    // 計算評分
    const ratings = calculateCompanyRatings(crawlResult.reviews);

    // 計算成功/失敗來源數量
    const successCount = Object.values(crawlResult.sourceResults).filter(
      (r) => r.success
    ).length;
    const failureCount = Object.values(crawlResult.sourceResults).filter(
      (r) => !r.success
    ).length;

    // 建立警告訊息
    const warnings = Object.entries(crawlResult.sourceResults)
      .filter(([, r]) => !r.success && r.error)
      .map(([source, r]) => ({
        source,
        code: r.error?.code,
        message: getHumanReadableError(r.error?.code, source),
      }));

    const result = {
      companyName,
      reviews: crawlResult.reviews,
      sourceResults: crawlResult.sourceResults,
      ratings,
      crawledAt: new Date().toISOString(),
      meta: {
        successCount,
        failureCount,
        partialSuccess: successCount > 0 && failureCount > 0,
      },
      warnings,
    };

    // 存入快取 (只快取使用預設來源的結果)
    if (isDefaultSources) {
      try {
        await setCachedCompanyReviews(companyName, result);
      } catch {
        console.warn("Failed to cache reviews");
      }
    }

    // 決定 HTTP 狀態碼
    const allFailed = successCount === 0;
    const partialSuccess = successCount > 0 && failureCount > 0;
    const status = allFailed ? 503 : partialSuccess ? 207 : 200;

    return NextResponse.json(
      {
        success: !allFailed,
        cached: false,
        data: result,
      },
      { status }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? "驗證錯誤" },
        { status: 400 }
      );
    }

    console.error("Company reviews error:", error);
    return NextResponse.json(
      { success: false, error: "取得公司評論失敗，請稍後再試" },
      { status: 500 }
    );
  }
}

// 處理面試經驗搜尋
async function handleInterviewSearch(
  companyName: string,
  sources: InterviewSource[],
  limit: number
) {
  try {
    // 爬取面試經驗
    const crawlResult = await crawlInterviewExperiences(companyName, {
      sources,
      limit,
      extractWithAI: true,
    });

    // 計算成功/失敗來源數量
    const successCount = Object.values(crawlResult.sourceResults).filter(
      (r) => r.success
    ).length;
    const failureCount = Object.values(crawlResult.sourceResults).filter(
      (r) => !r.success
    ).length;

    // 建立警告訊息
    const warnings = Object.entries(crawlResult.sourceResults)
      .filter(([, r]) => !r.success && r.error)
      .map(([source, r]) => ({
        source,
        message: getHumanReadableError(undefined, source),
        error: r.error,
      }));

    // 儲存到資料庫
    if (crawlResult.interviews.length > 0) {
      try {
        await saveInterviewExperiences(crawlResult.interviews);
      } catch (err) {
        console.warn("Failed to save interview experiences:", err);
      }
    }

    const result = {
      companyName,
      interviews: crawlResult.interviews,
      sourceResults: crawlResult.sourceResults,
      aggregated: crawlResult.aggregated,
      crawledAt: new Date().toISOString(),
      meta: {
        successCount,
        failureCount,
        partialSuccess: successCount > 0 && failureCount > 0,
      },
      warnings,
    };

    // 決定 HTTP 狀態碼
    const allFailed = successCount === 0;
    const partialSuccess = successCount > 0 && failureCount > 0;
    const status = allFailed ? 503 : partialSuccess ? 207 : 200;

    return NextResponse.json(
      {
        success: !allFailed,
        cached: false,
        data: result,
      },
      { status }
    );
  } catch (error) {
    console.error("Interview search error:", error);
    return NextResponse.json(
      { success: false, error: "搜尋面試經驗失敗，請稍後再試" },
      { status: 500 }
    );
  }
}

// 取得人類可讀的錯誤訊息
function getHumanReadableError(
  code: string | undefined,
  source: string
): string {
  const sourceNames: Record<string, string> = {
    ptt: "PTT",
    dcard: "Dcard",
    qollie: "Qollie",
    medium: "Medium",
  };
  const sourceName = sourceNames[source] || source;

  switch (code) {
    case "TIMEOUT":
      return `${sourceName} 回應過慢，請稍後再試`;
    case "NETWORK_ERROR":
      return `無法連接到 ${sourceName}`;
    case "ACCESS_DENIED":
      return `${sourceName} 暫時無法存取`;
    case "RATE_LIMITED":
      return `${sourceName} 請求過於頻繁，請稍後再試`;
    case "NOT_CONFIGURED":
      return `${sourceName} 服務未設定`;
    default:
      return `${sourceName} 發生未預期的錯誤`;
  }
}
