import type { CompanyReview } from "@/types";
import { FACTOR_METADATA, FACTOR_ORDER, VALUE_KEYWORD_MAP } from "./factors-config";
import { VALUE_METADATA, SENTIMENT_WEIGHTS } from "./config";

export interface ScoreBreakdown {
  valueId: string;
  valueName: string;
  valueEmoji: string;
  userPriority: number;
  score: number;
  priorityBonus: number;
  isMatched: boolean;
  quality: "good" | "okay" | "bad" | "unknown";
  source: "jd" | "reviews" | "both" | "none";
}

export interface ValueMatchResult {
  matchScore: number;
  breakdown: ScoreBreakdown[];
  confidence: "high" | "medium" | "low";
}

export type ManualVerdicts = Partial<Record<string, "positive" | "negative" | "neutral" | "unknown">>;

/**
 * Calculate the overall match from available factors only. Higher-ranked
 * preferences have more weight; unknown factors are excluded from the
 * denominator so missing data cannot drag the score down.
 */
export function calculateWeightedMatchScore(
  breakdown: ScoreBreakdown[],
  manualVerdicts: ManualVerdicts = {}
) {
  const available = breakdown
    .map((item) => {
      const manual = manualVerdicts[item.valueId];
      if (manual === "unknown") return null;
      if (manual === "positive") return { item, value: 100 };
      if (manual === "neutral") return { item, value: 50 };
      if (manual === "negative") return { item, value: 0 };
      if (item.quality === "unknown") return null;
      return { item, value: item.isMatched ? 100 : 0 };
    })
    .filter((entry): entry is { item: ScoreBreakdown; value: number } => Boolean(entry));

  if (available.length === 0) return 0;
  const totalWeight = available.reduce((sum, { item }) => sum + Math.max(1, 21 - item.userPriority), 0);
  const weightedTotal = available.reduce(
    (sum, { item, value }) => sum + value * Math.max(1, 21 - item.userPriority),
    0,
  );
  return Math.round(weightedTotal / totalWeight);
}

interface ValueMention {
  count: number;
  positiveCount: number;
  negativeCount: number;
  sentimentScore: number;
  hasJdEvidence: boolean;
  hasReviewEvidence: boolean;
}

const VALUE_EMOJIS: Record<string, string> = {
  salary: "💰", benefits: "🎁", growth: "📈", learning: "📚", stability: "🏠",
  autonomy: "🎯", flexibility: "⏰", remote: "🏡", location: "📍", teamwork: "👥",
  colleagues: "🤝", manager: "🧑‍💼", achievement: "🏆", recognition: "⭐", impact: "🌍",
  challenge: "🔥", creativity: "💡", independence: "🧘", culture: "🏢", balance: "⚖️",
};

// Default card order from Values Explorer, used until a user saves a ranking.
const DEFAULT_VALUE_RANKING = [
  "salary", "balance", "growth", "stability", "learning", "autonomy", "flexibility", "remote",
  "teamwork", "colleagues", "manager", "achievement", "recognition", "impact", "challenge",
  "creativity", "culture", "independence", "benefits", "location",
];

/** Keep legacy or partial rankings usable while scoring all 20 factors. */
export function getCompleteValueRanking(ranking: string[]): string[] {
  const validIds = new Set<string>(FACTOR_ORDER);
  const ordered = ranking.filter((id, index) => validIds.has(id) && ranking.indexOf(id) === index);
  DEFAULT_VALUE_RANKING.forEach((id) => {
    if (!ordered.includes(id)) ordered.push(id);
  });
  return ordered;
}

function extractValueMentions(reviews: CompanyReview[], jdText = ""): Map<string, ValueMention> {
  const mentions = new Map<string, ValueMention>();
  FACTOR_ORDER.forEach((valueId) => {
    mentions.set(valueId, {
      count: 0,
      positiveCount: 0,
      negativeCount: 0,
      sentimentScore: 0,
      hasJdEvidence: false,
      hasReviewEvidence: false,
    });
  });

  const sources = [
    ...reviews.map((review) => ({ review, source: "reviews" as const })),
    ...(jdText.trim() ? [{
      review: { content: jdText, title: null, sentiment: "neutral" as const } as CompanyReview,
      source: "jd" as const,
    }] : []),
  ];

  sources.forEach(({ review, source }) => {
    const content = `${review.content || ""} ${review.title || ""}`.toLowerCase();
    Object.entries(VALUE_KEYWORD_MAP).forEach(([valueId, keywords]) => {
      const hasKeyword = keywords.some((keyword) => content.includes(keyword.toLowerCase()));
      if (!hasKeyword) return;

      const mention = mentions.get(valueId);
      if (!mention) return;
      mention.count++;
      if (source === "jd") mention.hasJdEvidence = true;
      else mention.hasReviewEvidence = true;

      const sentiment = review.sentiment || "neutral";
      if (sentiment === "positive") mention.positiveCount++;
      else if (sentiment === "negative") mention.negativeCount++;
    });
  });

  mentions.forEach((mention) => {
    if (mention.count === 0) return;
    const neutralCount = mention.count - mention.positiveCount - mention.negativeCount;
    mention.sentimentScore =
      (mention.positiveCount * SENTIMENT_WEIGHTS.positive +
        neutralCount * SENTIMENT_WEIGHTS.neutral +
        mention.negativeCount * SENTIMENT_WEIGHTS.negative) /
      mention.count;
  });

  return mentions;
}

/**
 * Score all ranked factors. The overall score is weighted by preference rank
 * and only uses factors with evidence; unknown factors remain visible but do
 * not affect the result.
 */
export function calculateValueMatch(
  userRanking: string[],
  reviews: CompanyReview[],
  jdText = "",
  manualVerdicts: ManualVerdicts = {}
): ValueMatchResult {
  const ranking = getCompleteValueRanking(userRanking);
  const valueMentions = extractValueMentions(reviews, jdText);
  const breakdown: ScoreBreakdown[] = [];

  ranking.forEach((valueId, index) => {
    const mention = valueMentions.get(valueId);
    if (!mention) return;

    const metadata = VALUE_METADATA[valueId];
    const factorMetadata = FACTOR_METADATA[valueId];
    const priorityBonus = 20 - index;
    const hasEvidence = mention.count > 0;
    const isMatched = mention.sentimentScore >= 0.5;
    const quality: ScoreBreakdown["quality"] = !hasEvidence
      ? "unknown"
      : mention.sentimentScore >= 0.75
        ? "good"
        : isMatched ? "okay" : "bad";
    const score = hasEvidence ? (isMatched ? 100 : 0) : 0;

    breakdown.push({
      valueId,
      valueName: metadata?.name || factorMetadata.name,
      valueEmoji: metadata?.emoji || VALUE_EMOJIS[valueId] || "📊",
      userPriority: index + 1,
      score,
      priorityBonus,
      isMatched,
      quality,
      source: !hasEvidence
        ? "none"
        : mention.hasJdEvidence && mention.hasReviewEvidence
          ? "both"
          : mention.hasJdEvidence ? "jd" : "reviews",
    });
  });

  const matchScore = calculateWeightedMatchScore(breakdown, manualVerdicts);
  const confidence: "high" | "medium" | "low" =
    reviews.length >= 10 ? "high" : reviews.length >= 5 ? "medium" : "low";

  return { matchScore, breakdown, confidence };
}
