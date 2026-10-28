import type { CompanyReview } from "@/types";
import { VALUE_KEYWORD_MAP, VALUE_METADATA, SENTIMENT_WEIGHTS } from "./config";

export interface ScoreBreakdown {
  valueId: string;
  valueName: string;
  valueEmoji: string;
  userPriority: number;
  contributedScore: number;
  maxPossibleScore: number;
  isMatched: boolean;
}

export interface ValueMatchResult {
  matchScore: number;
  breakdown: ScoreBreakdown[];
  confidence: "high" | "medium" | "low";
}

interface ValueMention {
  valueId: string;
  count: number;
  positiveCount: number;
  negativeCount: number;
  sentimentScore: number;
}

/**
 * 從公司評論中提取價值觀提及
 */
function extractValueMentions(reviews: CompanyReview[], jdText = ""): Map<string, ValueMention> {
  const mentions = new Map<string, ValueMention>();

  // 初始化所有價值觀
  Object.keys(VALUE_KEYWORD_MAP).forEach((valueId) => {
    mentions.set(valueId, {
      valueId,
      count: 0,
      positiveCount: 0,
      negativeCount: 0,
      sentimentScore: 0,
    });
  });

  // 遍歷評論與 JD 提取關鍵詞；JD 本身視為中性證據，不會被當成正面評論。
  const sources = jdText.trim()
    ? [...reviews, { content: jdText, title: null, sentiment: "neutral" as const } as CompanyReview]
    : reviews;
  sources.forEach((review) => {
    const content = review.content.toLowerCase();
    const sentiment = review.sentiment || "neutral";

    Object.entries(VALUE_KEYWORD_MAP).forEach(([valueId, keywords]) => {
      const hasKeyword = keywords.some(
        (keyword) =>
          content.includes(keyword.toLowerCase()) ||
          (review.title && review.title.toLowerCase().includes(keyword.toLowerCase()))
      );

      if (hasKeyword) {
        const mention = mentions.get(valueId)!;
        mention.count++;

        if (sentiment === "positive") {
          mention.positiveCount++;
        } else if (sentiment === "negative") {
          mention.negativeCount++;
        }
      }
    });
  });

  // 計算每個價值觀的情緒分數
  mentions.forEach((mention) => {
    if (mention.count > 0) {
      // 情緒分數 = (正面評論數 * 1.0 + 中立評論數 * 0.5) / 總數
      const neutralCount = mention.count - mention.positiveCount - mention.negativeCount;
      mention.sentimentScore =
        (mention.positiveCount * SENTIMENT_WEIGHTS.positive +
          neutralCount * SENTIMENT_WEIGHTS.neutral +
          mention.negativeCount * SENTIMENT_WEIGHTS.negative) /
        mention.count;
    }
  });

  return mentions;
}

/**
 * 計算價值觀匹配分數
 */
export function calculateValueMatch(
  userTopValues: string[],
  reviews: CompanyReview[],
  jdText = ""
): ValueMatchResult {
  // 提取公司在評論中被提及的價值觀
  const valueMentions = extractValueMentions(reviews, jdText);

  // 計算每個用戶價值觀的匹配分數
  const breakdown: ScoreBreakdown[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;

  userTopValues.forEach((valueId, index) => {
    // 權重：第 1 名 = 100%, 第 2 名 = 80%, 第 3 名 = 60%, ...
    const priorityWeight = Math.max(0.2, 1 - index * 0.2);
    const mention = valueMentions.get(valueId);
    const metadata = VALUE_METADATA[valueId] || {
      name: valueId,
      emoji: "📊",
      description: "",
    };

    // 判斷是否匹配：有提及且情緒分數 >= 0.5
    const isMatched = mention ? mention.count > 0 && mention.sentimentScore >= 0.5 : false;

    // 計算貢獻分數
    let contributedScore = 0;
    if (mention && mention.count > 0) {
      // 基礎分數來自情緒分數 (0-100)
      contributedScore = mention.sentimentScore * 100;
    }

    const maxPossibleScore = priorityWeight * 100;
    const weightedScore = contributedScore * priorityWeight;

    totalWeightedScore += weightedScore;
    totalWeight += maxPossibleScore;

    breakdown.push({
      valueId,
      valueName: metadata.name,
      valueEmoji: metadata.emoji,
      userPriority: index + 1,
      contributedScore: contributedScore,
      maxPossibleScore: maxPossibleScore,
      isMatched,
    });
  });

  // 計算總分 (0-100)
  const matchScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight * 100) : 0;

  // 計算信心度：基於有多少評論
  const confidence: "high" | "medium" | "low" =
    reviews.length >= 10 ? "high" : reviews.length >= 5 ? "medium" : "low";

  return {
    matchScore,
    breakdown,
    confidence,
  };
}
