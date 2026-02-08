import { searchDcardPosts, type DcardPost } from "./dcard";
import { searchQollie, qollieToReview } from "./qollie";
import { searchPTTWithContent, pttToReview } from "./ptt";
import { searchMediumArticles, mediumToReview } from "./google-search";
import { aiGateway } from "../ai/gateway";
import { CrawlerError, type CrawlerErrorCode } from "./proxy-fetch";

export type ReviewSource = "dcard" | "medium" | "qollie" | "ptt";

export interface CompanyReview {
  id: string;
  source: ReviewSource | "manual";
  sourceUrl: string;
  title: string;
  content: string;
  excerpt: string;
  sentiment: "positive" | "neutral" | "negative" | null;
  sentimentScore: number | null;
  author: string;
  publishedAt: string;
  scrapedAt: string;
}

export interface SourceResult {
  success: boolean;
  count: number;
  error?: {
    code: CrawlerErrorCode;
    message: string;
  };
}

export interface CrawlResult {
  reviews: CompanyReview[];
  sourceResults: Record<ReviewSource, SourceResult>;
}

// 從多個來源爬取公司評論
export async function crawlCompanyReviews(
  companyName: string,
  options?: {
    sources?: ReviewSource[];
    limit?: number;
    analyzeSentiment?: boolean;
  }
): Promise<CrawlResult> {
  const {
    sources = ["dcard", "qollie", "ptt"],
    limit = 10,
    analyzeSentiment = true,
  } = options ?? {};

  const allReviews: CompanyReview[] = [];
  const sourceResults: Record<ReviewSource, SourceResult> = {
    dcard: { success: false, count: 0 },
    qollie: { success: false, count: 0 },
    ptt: { success: false, count: 0 },
    medium: { success: false, count: 0 },
  };

  // 並行爬取所有來源
  const crawlPromises: Promise<void>[] = [];

  // Dcard 爬取
  if (sources.includes("dcard")) {
    crawlPromises.push(
      (async () => {
        try {
          const dcardPosts = await searchDcardPosts(companyName, { limit });
          const dcardReviews = dcardPosts.map(postToReview);
          allReviews.push(...dcardReviews);
          sourceResults.dcard = { success: true, count: dcardReviews.length };
        } catch (error) {
          sourceResults.dcard = {
            success: false,
            count: 0,
            error: extractErrorInfo(error),
          };
        }
      })()
    );
  }

  // Qollie 爬取
  if (sources.includes("qollie")) {
    crawlPromises.push(
      (async () => {
        try {
          const qolliePosts = await searchQollie(companyName, { limit });
          const qollieReviews = qolliePosts.map(qollieToReview);
          allReviews.push(...qollieReviews);
          sourceResults.qollie = { success: true, count: qollieReviews.length };
        } catch (error) {
          sourceResults.qollie = {
            success: false,
            count: 0,
            error: extractErrorInfo(error),
          };
        }
      })()
    );
  }

  // PTT 爬取
  if (sources.includes("ptt")) {
    crawlPromises.push(
      (async () => {
        try {
          const pttPosts = await searchPTTWithContent(companyName, {
            limit,
            fetchContent: true,
          });
          const pttReviews = pttPosts.map(pttToReview);
          allReviews.push(...pttReviews);
          sourceResults.ptt = { success: true, count: pttReviews.length };
        } catch (error) {
          sourceResults.ptt = {
            success: false,
            count: 0,
            error: extractErrorInfo(error),
          };
        }
      })()
    );
  }

  // Medium 爬取 (透過 Google Search)
  if (sources.includes("medium")) {
    crawlPromises.push(
      (async () => {
        try {
          const mediumArticles = await searchMediumArticles(companyName, { limit });
          const mediumReviews = mediumArticles.map(mediumToReview);
          allReviews.push(...mediumReviews);
          sourceResults.medium = { success: true, count: mediumReviews.length };
        } catch (error) {
          sourceResults.medium = {
            success: false,
            count: 0,
            error: extractErrorInfo(error),
          };
        }
      })()
    );
  }

  // 等待所有爬取完成
  await Promise.all(crawlPromises);

  // 情緒分析
  let finalReviews = allReviews;
  if (analyzeSentiment && allReviews.length > 0) {
    finalReviews = await analyzeReviewsSentiment(allReviews);
  }

  return {
    reviews: finalReviews,
    sourceResults,
  };
}

// 將 Dcard 貼文轉換為評論格式
function postToReview(post: DcardPost): CompanyReview {
  return {
    id: `dcard-${post.id}`,
    source: "dcard",
    sourceUrl: post.url,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt || post.content.slice(0, 200),
    sentiment: null,
    sentimentScore: null,
    author: post.author,
    publishedAt: post.createdAt,
    scrapedAt: new Date().toISOString(),
  };
}

// 批次情緒分析
async function analyzeReviewsSentiment(
  reviews: CompanyReview[]
): Promise<CompanyReview[]> {
  const analyzedReviews = await Promise.all(
    reviews.map(async (review) => {
      try {
        const textToAnalyze = `${review.title}\n${review.excerpt}`;
        const result = await aiGateway("sentiment_analysis", textToAnalyze, {
          systemPrompt: `分析以下文字的情緒傾向，判斷對公司的評價是正面、中性還是負面。
返回 JSON 格式：{"sentiment": "positive" | "neutral" | "negative", "score": 0-100}
score 越高代表越正面，50 為中性。
只返回 JSON，不要其他文字。`,
          temperature: 0.3,
        });

        const parsed = JSON.parse(result.text);
        return {
          ...review,
          sentiment: parsed.sentiment as "positive" | "neutral" | "negative",
          sentimentScore: parsed.score,
        };
      } catch {
        return review;
      }
    })
  );

  return analyzedReviews;
}

// 計算公司平均評分
export function calculateCompanyRatings(reviews: CompanyReview[]): {
  avgSentiment: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  totalCount: number;
} {
  const validReviews = reviews.filter((r) => r.sentimentScore !== null);

  if (validReviews.length === 0) {
    return {
      avgSentiment: 50,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
      totalCount: 0,
    };
  }

  const avgSentiment =
    validReviews.reduce((sum, r) => sum + (r.sentimentScore ?? 50), 0) /
    validReviews.length;

  return {
    avgSentiment: Math.round(avgSentiment),
    positiveCount: reviews.filter((r) => r.sentiment === "positive").length,
    neutralCount: reviews.filter((r) => r.sentiment === "neutral").length,
    negativeCount: reviews.filter((r) => r.sentiment === "negative").length,
    totalCount: reviews.length,
  };
}

// 提取錯誤資訊
function extractErrorInfo(error: unknown): {
  code: CrawlerErrorCode;
  message: string;
} {
  if (error instanceof CrawlerError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    // Try to detect error type from message
    const message = error.message.toLowerCase();

    if (message.includes("timeout") || message.includes("abort")) {
      return { code: "TIMEOUT", message: error.message };
    }
    if (message.includes("econnreset") || message.includes("network")) {
      return { code: "NETWORK_ERROR", message: error.message };
    }
    if (message.includes("403") || message.includes("forbidden")) {
      return { code: "ACCESS_DENIED", message: error.message };
    }
    if (message.includes("429") || message.includes("rate")) {
      return { code: "RATE_LIMITED", message: error.message };
    }

    return { code: "UNKNOWN", message: error.message };
  }

  return { code: "UNKNOWN", message: "Unknown error" };
}

export { searchDcardPosts, type DcardPost };

// 面試經驗爬蟲
export {
  crawlInterviewExperiences,
  type InterviewCrawlResult,
} from "./interview";
