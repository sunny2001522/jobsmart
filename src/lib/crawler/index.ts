import { searchDcardPosts, type DcardPost } from "./dcard";
import { aiGateway } from "../ai/gateway";

export interface CompanyReview {
  id: string;
  source: "dcard" | "medium" | "qollie" | "manual";
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

// 從多個來源爬取公司評論
export async function crawlCompanyReviews(
  companyName: string,
  options?: {
    sources?: Array<"dcard" | "medium" | "qollie">;
    limit?: number;
    analyzeSentiment?: boolean;
  }
): Promise<CompanyReview[]> {
  const {
    sources = ["dcard"],
    limit = 10,
    analyzeSentiment = true,
  } = options ?? {};

  const allReviews: CompanyReview[] = [];

  // Dcard 爬取
  if (sources.includes("dcard")) {
    const dcardPosts = await searchDcardPosts(companyName, { limit });
    const dcardReviews = dcardPosts.map(postToReview);
    allReviews.push(...dcardReviews);
  }

  // 情緒分析
  if (analyzeSentiment && allReviews.length > 0) {
    const analyzedReviews = await analyzeReviewsSentiment(allReviews);
    return analyzedReviews;
  }

  return allReviews;
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

export { searchDcardPosts, type DcardPost };
