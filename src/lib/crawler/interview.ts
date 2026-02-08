/**
 * 面試經驗爬蟲模組
 * 從 Dcard、PTT、Qollie、Medium 搜尋面試經驗
 */

import { searchDcardPosts, type DcardPost } from "./dcard";
import { searchQollie, qollieToReview } from "./qollie";
import { searchPTTWithContent, pttToReview } from "./ptt";
import { searchMediumArticles, mediumToReview } from "./google-search";
import { extractInterviewData, type ExtractedInterviewData } from "../ai/gateway";
import { CrawlerError, type CrawlerErrorCode } from "./proxy-fetch";
import type {
  InterviewSource,
  InterviewExperience,
  InterviewStage,
  InterviewSourceResult,
  InterviewAggregated,
} from "@/types";

export interface InterviewCrawlResult {
  interviews: InterviewExperience[];
  sourceResults: Record<InterviewSource, InterviewSourceResult>;
  aggregated: InterviewAggregated;
}

// 面試搜尋關鍵字
const INTERVIEW_KEYWORDS = ["面試", "面試經驗", "interview"];

/**
 * 從多個來源爬取面試經驗
 */
export async function crawlInterviewExperiences(
  companyName: string,
  options?: {
    sources?: InterviewSource[];
    limit?: number;
    extractWithAI?: boolean;
  }
): Promise<InterviewCrawlResult> {
  const {
    sources = ["dcard", "ptt", "qollie", "medium"],
    limit = 10,
    extractWithAI = true,
  } = options ?? {};

  const allInterviews: InterviewExperience[] = [];
  const sourceResults: Record<InterviewSource, InterviewSourceResult> = {
    dcard: { success: false, count: 0 },
    qollie: { success: false, count: 0 },
    ptt: { success: false, count: 0 },
    medium: { success: false, count: 0 },
  };

  // 並行爬取所有來源
  const crawlPromises: Promise<void>[] = [];

  // 使用面試關鍵字搜尋
  const searchQuery = `${companyName} ${INTERVIEW_KEYWORDS[0]}`;

  // Dcard 爬取
  if (sources.includes("dcard")) {
    crawlPromises.push(
      (async () => {
        try {
          const dcardPosts = await searchDcardPosts(searchQuery, { limit });
          const interviews = dcardPosts.map((post) =>
            dcardPostToInterview(post, companyName)
          );
          allInterviews.push(...interviews);
          sourceResults.dcard = { success: true, count: interviews.length };
        } catch (error) {
          sourceResults.dcard = {
            success: false,
            count: 0,
            error: extractErrorMessage(error),
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
          // 過濾出面試相關的評論
          const interviewPosts = qolliePosts.filter(
            (post) =>
              post.content.includes("面試") ||
              post.title.includes("面試") ||
              post.pros?.some((p) => p.includes("面試")) ||
              post.cons?.some((c) => c.includes("面試"))
          );
          const interviews = interviewPosts.map((post) => {
            const review = qollieToReview(post);
            return reviewToInterview(review, "qollie", companyName);
          });
          allInterviews.push(...interviews);
          sourceResults.qollie = { success: true, count: interviews.length };
        } catch (error) {
          sourceResults.qollie = {
            success: false,
            count: 0,
            error: extractErrorMessage(error),
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
          const pttPosts = await searchPTTWithContent(searchQuery, {
            limit,
            fetchContent: true,
          });
          const interviews = pttPosts.map((post) => {
            const review = pttToReview(post);
            return reviewToInterview(review, "ptt", companyName);
          });
          allInterviews.push(...interviews);
          sourceResults.ptt = { success: true, count: interviews.length };
        } catch (error) {
          sourceResults.ptt = {
            success: false,
            count: 0,
            error: extractErrorMessage(error),
          };
        }
      })()
    );
  }

  // Medium 爬取
  if (sources.includes("medium")) {
    crawlPromises.push(
      (async () => {
        try {
          // 使用面試相關搜尋詞
          const mediumArticles = await searchMediumArticles(
            `${companyName} 面試經驗`,
            { limit }
          );
          const interviews = mediumArticles.map((article) => {
            const review = mediumToReview(article);
            return reviewToInterview(review, "medium", companyName);
          });
          allInterviews.push(...interviews);
          sourceResults.medium = { success: true, count: interviews.length };
        } catch (error) {
          sourceResults.medium = {
            success: false,
            count: 0,
            error: extractErrorMessage(error),
          };
        }
      })()
    );
  }

  // 等待所有爬取完成
  await Promise.all(crawlPromises);

  // AI 提取面試資料
  let finalInterviews = allInterviews;
  if (extractWithAI && allInterviews.length > 0) {
    finalInterviews = await extractInterviewDataBatch(allInterviews);
  }

  // 彙整資料
  const aggregated = aggregateInterviewData(finalInterviews);

  return {
    interviews: finalInterviews,
    sourceResults,
    aggregated,
  };
}

/**
 * 將 Dcard 貼文轉換為面試經驗格式
 */
function dcardPostToInterview(
  post: DcardPost,
  companyName: string
): InterviewExperience {
  return {
    id: `dcard-${post.id}`,
    company_id: null,
    company_name: companyName,
    source: "dcard",
    source_url: post.url,
    title: post.title,
    content: post.content,
    position: null,
    stages: [],
    questions: [],
    difficulty: null,
    outcome: null,
    tips: [],
    sentiment: null,
    sentiment_score: null,
    author: post.author,
    published_at: post.createdAt,
    scraped_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

/**
 * 將通用評論格式轉換為面試經驗格式
 */
function reviewToInterview(
  review: {
    id: string;
    source: string;
    sourceUrl: string;
    title: string;
    content: string;
    author: string;
    publishedAt: string;
  },
  source: InterviewSource,
  companyName: string
): InterviewExperience {
  return {
    id: review.id.startsWith(source) ? review.id : `${source}-${review.id}`,
    company_id: null,
    company_name: companyName,
    source,
    source_url: review.sourceUrl,
    title: review.title,
    content: review.content,
    position: null,
    stages: [],
    questions: [],
    difficulty: null,
    outcome: null,
    tips: [],
    sentiment: null,
    sentiment_score: null,
    author: review.author,
    published_at: review.publishedAt,
    scraped_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

/**
 * 批次 AI 提取面試資料
 */
async function extractInterviewDataBatch(
  interviews: InterviewExperience[]
): Promise<InterviewExperience[]> {
  const extractedInterviews = await Promise.all(
    interviews.map(async (interview) => {
      try {
        const textToAnalyze = `${interview.title}\n\n${interview.content}`;
        const extracted = await extractInterviewData(textToAnalyze);
        return applyExtractedData(interview, extracted);
      } catch {
        // 如果 AI 提取失敗，返回原始資料
        return interview;
      }
    })
  );

  return extractedInterviews;
}

/**
 * 將 AI 提取結果套用到面試經驗
 */
function applyExtractedData(
  interview: InterviewExperience,
  extracted: ExtractedInterviewData
): InterviewExperience {
  return {
    ...interview,
    stages: extracted.stages,
    questions: extracted.questions,
    difficulty: extracted.difficulty,
    outcome: extracted.outcome,
    tips: extracted.tips,
    sentiment: extracted.sentiment,
    sentiment_score: extracted.sentimentScore,
  };
}

/**
 * 彙整面試資料
 */
function aggregateInterviewData(
  interviews: InterviewExperience[]
): InterviewAggregated {
  // 彙整面試關卡（取最常見的）
  const stageMap = new Map<string, { stage: InterviewStage; count: number }>();
  interviews.forEach((interview) => {
    interview.stages.forEach((stage) => {
      const key = stage.name;
      const existing = stageMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        stageMap.set(key, { stage, count: 1 });
      }
    });
  });
  const commonStages = Array.from(stageMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(({ stage }, index) => ({ ...stage, order: index + 1 }));

  // 彙整面試題目（去重）
  const questionSet = new Set<string>();
  interviews.forEach((interview) => {
    interview.questions.forEach((q) => questionSet.add(q));
  });
  const commonQuestions = Array.from(questionSet).slice(0, 20);

  // 統計難度分佈
  const difficultyDistribution = {
    easy: 0,
    medium: 0,
    hard: 0,
  };
  interviews.forEach((interview) => {
    if (interview.difficulty) {
      difficultyDistribution[interview.difficulty]++;
    }
  });

  // 統計結果分佈
  const outcomeDistribution = {
    offer: 0,
    rejected: 0,
    ghosted: 0,
    unknown: 0,
  };
  interviews.forEach((interview) => {
    const outcome = interview.outcome || "unknown";
    outcomeDistribution[outcome]++;
  });

  return {
    commonStages,
    commonQuestions,
    difficultyDistribution,
    outcomeDistribution,
  };
}

/**
 * 提取錯誤訊息
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof CrawlerError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

export { type InterviewSource, type InterviewExperience };
