import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { crawlCompanyReviews, calculateCompanyRatings, type CompanyReview as CrawledCompanyReview, type ReviewSource, crawlInterviewExperiences } from "@/lib/crawler";
import { generateInterviewQuestionsFromReviews } from "@/lib/ai/gateway";
import {
  getCachedCompanyReviews,
  setCachedCompanyReviews,
} from "@/lib/redis/client";
import { serverData } from "@/lib/turso/server-data";
import type { InterviewSource } from "@/types";
import { getLocalUser } from "@/lib/auth/local";
import { isTextInInterviewLocale, validatePredictedInterviewQuestions, type InterviewLocale } from "@/lib/interview/question-utils";

// Vercel serverless function configuration
// Increase timeout for crawling with proxy (ScraperAPI can be slow)
export const maxDuration = 60; // 60 seconds for Pro plan

const reviewsSchema = z.object({
  companyName: z.string().min(1, "請提供公司名稱"),
  contentType: z.enum(["reviews", "interviews"]).optional().default("reviews"),
  sources: z
    .array(z.enum(["dcard", "qollie", "ptt", "medium", "glassdoor", "indeed", "comparably"]))
    .optional()
    .default(["dcard", "qollie", "ptt"]),
  forceRefresh: z.boolean().optional().default(false),
  limit: z.number().min(1).max(50).optional().default(10),
  locale: z.enum(["en", "zh-TW"]).optional().default("zh-TW"),
  companyId: z.string().max(200).nullable().optional(),
  resumeQuestions: z.array(z.string().max(300)).max(10).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName, contentType, sources, forceRefresh, limit, locale, companyId, resumeQuestions } = reviewsSchema.parse(body);

    // 面試經驗搜尋
    if (contentType === "interviews") {
      if (!(await getLocalUser())) {
        return NextResponse.json({ success: false, error: locale === "en" ? "Please sign in first." : "請先登入" }, { status: 401 });
      }
      return handleInterviewSearch(companyName, sources as InterviewSource[], limit, {
        locale,
        companyId: companyId ?? null,
        resumeQuestions,
      });
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
          // Migrate entries created by older releases, which only wrote to
          // Redis, into durable storage the first time they are read.
          const cachedReviews = (cached as { reviews?: CrawledCompanyReview[] }).reviews;
          if (cachedReviews?.length) await persistCrawledReviews(companyName, cachedReviews);
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

    // Redis is only a short-lived acceleration layer. Persist successful crawl
    // results before responding so a cache expiry or redeploy cannot make
    // previously found reviews disappear from an application's detail panel.
    if (crawlResult.reviews.length > 0) {
      try {
        await persistCrawledReviews(companyName, crawlResult.reviews);
      } catch (error) {
        // A crawler response is still useful when persistence is temporarily
        // unavailable; report the problem without discarding its results.
        console.warn("Failed to persist company reviews:", error);
      }
    }

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

async function persistCrawledReviews(companyName: string, reviews: CrawledCompanyReview[]) {
  await serverData<boolean>("saveCompanyReviews", [reviews.map((review) => ({
    company_name: companyName,
    source: review.source,
    source_url: review.sourceUrl || null,
    title: review.title || null,
    content: review.content,
    sentiment: review.sentiment,
    sentiment_score: review.sentimentScore,
    author: review.author || null,
    published_at: review.publishedAt || null,
    scraped_at: review.scrapedAt,
  }))]);
}

// 處理面試經驗搜尋
async function handleInterviewSearch(
  companyName: string,
  sources: InterviewSource[],
  limit: number,
  options: { locale: InterviewLocale; companyId: string | null; resumeQuestions: string[] },
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
        await serverData<boolean>("saveInterviewExperiences", [crawlResult.interviews]);
      } catch (err) {
        console.warn("Failed to save interview experiences:", err);
      }
    }

    let predictedQuestions = [] as ReturnType<typeof validatePredictedInterviewQuestions>;
    let generationWarning: string | null = null;
    if (crawlResult.interviews.length > 0) {
      try {
        const sourcesForAI = crawlResult.interviews.map((interview) => ({
          id: interview.id,
          source_url: interview.source_url,
          title: interview.title,
          content: interview.content,
          questions: interview.questions,
        }));
        const candidates = await generateInterviewQuestionsFromReviews(sourcesForAI, options.locale);
        predictedQuestions = validatePredictedInterviewQuestions(candidates, sourcesForAI, options.locale);
      } catch (error) {
        console.warn("Failed to generate review-grounded interview questions:", error);
        generationWarning = options.locale === "en"
          ? "Could not generate review-based questions. Please try again later."
          : "無法根據評論整理面試題目，請稍後再試。";
      }
    }

    const resumeQuestionRecords = options.resumeQuestions
      .map((question) => question.trim())
      .filter((question) => question.length >= 8 && isTextInInterviewLocale(question, options.locale))
      .map((question) => ({
        question,
        company_id: options.companyId,
        company_name: companyName,
        category: "behavioral",
        difficulty: "medium",
        locale: options.locale,
        origin: "resume_followup",
        evidence: [],
        source_urls: [],
      }));
    const questionRecords = [
      ...predictedQuestions.map((question) => ({
        question: question.question,
        company_id: options.companyId,
        company_name: companyName,
        category: question.category,
        difficulty: question.difficulty,
        locale: options.locale,
        origin: "company_review",
        evidence: question.evidence,
        source_urls: question.source_urls,
      })),
      ...resumeQuestionRecords,
    ];
    let savedQuestions: unknown[] = [];
    if (questionRecords.length > 0) {
      try {
        savedQuestions = await serverData<unknown[]>("saveInterviewQuestions", [questionRecords]);
      } catch (error) {
        console.warn("Failed to save generated interview questions:", error);
        generationWarning = options.locale === "en"
          ? "Questions were generated but could not be saved to your question bank."
          : "題目已產生，但無法儲存到面試題庫。";
      }
    }

    const result = {
      companyName,
      interviews: crawlResult.interviews,
      questions: savedQuestions,
      sourceResults: crawlResult.sourceResults,
      aggregated: crawlResult.aggregated,
      crawledAt: new Date().toISOString(),
      meta: {
        successCount,
        failureCount,
        partialSuccess: successCount > 0 && failureCount > 0,
      },
      warnings: generationWarning ? [...warnings, { source: "question_generation", message: generationWarning }] : warnings,
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
