// 20 因素分數計算模組

import type { CompanyReview, ValueScore, JobValueScores, WeightedScoreResult } from '@/types';
import { FACTOR_ORDER, FACTORS_BY_SOURCE, VALUE_KEYWORD_MAP } from './factors-config';

// AI 分析 JD 的結果類型
export interface JDAnalysisResult {
  scores: Record<string, { score: number | null; confidence: string; evidence: string }>;
  extractedData: {
    salaryRange?: { min: number; max: number; currency: string; period: string };
    location?: { address: string; nearMrt?: string };
    benefitsList?: string[];
    remotePolicy?: string;
  };
}

// 評論分析結果
interface ReviewAnalysisResult {
  scores: Record<string, { score: number; confidence: 'high' | 'medium' | 'low' | 'none'; count: number }>;
}

/**
 * 從評論中分析價值觀分數
 */
export function analyzeReviewsForValues(reviews: CompanyReview[]): ReviewAnalysisResult {
  const result: ReviewAnalysisResult = { scores: {} };

  if (reviews.length === 0) {
    // 沒有評論，返回空結果
    FACTORS_BY_SOURCE.reviews.forEach((factorId) => {
      result.scores[factorId] = { score: 5, confidence: 'none', count: 0 };
    });
    return result;
  }

  // 分析每個因素
  FACTOR_ORDER.forEach((factorId) => {
    const keywords = VALUE_KEYWORD_MAP[factorId] || [];
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    reviews.forEach((review) => {
      const content = (review.content + ' ' + (review.title || '')).toLowerCase();
      const hasKeyword = keywords.some((k) => content.includes(k.toLowerCase()));

      if (hasKeyword) {
        if (review.sentiment === 'positive') {
          positiveCount++;
        } else if (review.sentiment === 'negative') {
          negativeCount++;
        } else {
          neutralCount++;
        }
      }
    });

    const totalMentions = positiveCount + negativeCount + neutralCount;

    if (totalMentions === 0) {
      result.scores[factorId] = { score: 5, confidence: 'none', count: 0 };
    } else {
      // 計算情緒加權分數 (0-10)
      const sentimentScore =
        (positiveCount * 10 + neutralCount * 5 + negativeCount * 0) / totalMentions;

      // 信心度基於提及次數
      const confidence: 'high' | 'medium' | 'low' =
        totalMentions >= 5 ? 'high' : totalMentions >= 2 ? 'medium' : 'low';

      result.scores[factorId] = {
        score: Math.round(sentimentScore * 10) / 10,
        confidence,
        count: totalMentions,
      };
    }
  });

  return result;
}

/**
 * 合併 JD 分析和評論分析的分數
 */
export function mergeScores(
  jdAnalysis: JDAnalysisResult | null,
  reviewAnalysis: ReviewAnalysisResult,
  userLocation?: { lat: number; lng: number },
  companyLocation?: { lat: number; lng: number }
): Record<string, ValueScore> {
  const merged: Record<string, ValueScore> = {};

  FACTOR_ORDER.forEach((factorId) => {
    const jdScore = jdAnalysis?.scores[factorId];
    const reviewScore = reviewAnalysis.scores[factorId];

    // 決定使用哪個來源
    if (factorId === 'location') {
      // 位置需要計算
      if (userLocation && companyLocation) {
        const distance = calculateDistance(userLocation, companyLocation);
        const score = distanceToScore(distance);
        merged[factorId] = {
          score,
          source: 'both',
          confidence: 'high',
          reasoning: `通勤距離約 ${distance.toFixed(1)} 公里`,
        };
      } else {
        merged[factorId] = {
          score: null,
          source: 'default',
          confidence: 'none',
          reasoning: '需要設定家庭地址',
        };
      }
    } else if ((FACTORS_BY_SOURCE.jd as readonly string[]).includes(factorId)) {
      // JD 優先的因素
      if (jdScore && jdScore.score !== null) {
        merged[factorId] = {
          score: jdScore.score,
          source: reviewScore && reviewScore.count > 0 ? 'both' : 'jd',
          confidence: jdScore.confidence as 'high' | 'medium' | 'low' | 'none',
          reasoning: jdScore.evidence,
        };
      } else if (reviewScore && reviewScore.count > 0) {
        merged[factorId] = {
          score: reviewScore.score,
          source: 'reviews',
          confidence: reviewScore.confidence,
        };
      } else {
        merged[factorId] = {
          score: null,
          source: 'default',
          confidence: 'none',
        };
      }
    } else if ((FACTORS_BY_SOURCE.reviews as readonly string[]).includes(factorId)) {
      // 評論優先的因素
      if (reviewScore && reviewScore.count > 0) {
        merged[factorId] = {
          score: reviewScore.score,
          source: jdScore && jdScore.score !== null ? 'both' : 'reviews',
          confidence: reviewScore.confidence,
        };
      } else if (jdScore && jdScore.score !== null) {
        merged[factorId] = {
          score: jdScore.score,
          source: 'jd',
          confidence: jdScore.confidence as 'high' | 'medium' | 'low' | 'none',
          reasoning: jdScore.evidence,
        };
      } else {
        merged[factorId] = {
          score: null,
          source: 'default',
          confidence: 'none',
        };
      }
    } else {
      // 其他因素
      merged[factorId] = {
        score: null,
        source: 'default',
        confidence: 'none',
      };
    }
  });

  return merged;
}

/**
 * 計算加權總分
 * 權重公式：(21 - rank) / 210
 */
export function calculateWeightedScore(
  scores: Record<string, ValueScore>,
  userRanking: string[]
): WeightedScoreResult {
  const TOTAL_FACTORS = 20;
  const WEIGHT_SUM = (TOTAL_FACTORS * (TOTAL_FACTORS + 1)) / 2; // = 210

  let weightedSum = 0;
  let totalWeight = 0;
  let calculatedCount = 0;
  let defaultedCount = 0;

  // 如果沒有用戶排序，使用預設順序
  const ranking = userRanking.length > 0 ? userRanking : FACTOR_ORDER;

  ranking.forEach((factorId, index) => {
    const rank = index + 1;
    const weight = (TOTAL_FACTORS + 1 - rank) / WEIGHT_SUM;
    const scoreData = scores[factorId];

    let factorScore: number;

    if (scoreData?.score !== null && scoreData?.score !== undefined) {
      factorScore = scoreData.score;
      calculatedCount++;
    } else {
      // 無法計算的因素使用 5 分（中間值）
      factorScore = 5;
      defaultedCount++;
    }

    weightedSum += factorScore * weight;
    totalWeight += weight;
  });

  // 計算最終分數（已經是 0-10 範圍）
  const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 5;

  return {
    score: Math.round(finalScore * 10) / 10,
    calculatedCount,
    defaultedCount,
  };
}

/**
 * 建立完整的 JobValueScores 對象
 */
export function buildJobValueScores(
  scores: Record<string, ValueScore>,
  userRanking: string[]
): JobValueScores {
  const weightedResult = calculateWeightedScore(scores, userRanking);

  return {
    status: 'calculated',
    calculatedAt: new Date().toISOString(),
    scores,
    weightedScore: weightedResult.score,
    rankingSnapshot: userRanking.length > 0 ? userRanking : null,
  };
}

/**
 * 建立初始狀態（計算中）
 */
export function buildCalculatingState(): JobValueScores {
  return {
    status: 'calculating',
    calculatedAt: null,
    scores: {},
    weightedScore: null,
    rankingSnapshot: null,
  };
}

/**
 * 建立失敗狀態
 */
export function buildFailedState(error?: string): JobValueScores {
  return {
    status: 'failed',
    calculatedAt: new Date().toISOString(),
    scores: {},
    weightedScore: null,
    rankingSnapshot: null,
  };
}

// ============================================
// 輔助函數
// ============================================

/**
 * 計算兩點之間的距離（公里）
 * 使用 Haversine 公式
 */
function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371; // 地球半徑（公里）
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * 將距離轉換為分數
 * 0-5km: 10分, 5-10km: 8分, 10-20km: 6分, 20-30km: 4分, >30km: 2分
 */
function distanceToScore(distance: number): number {
  if (distance <= 5) return 10;
  if (distance <= 10) return 8;
  if (distance <= 20) return 6;
  if (distance <= 30) return 4;
  return 2;
}

/**
 * 重新計算加權總分（用戶排序變更時）
 */
export function recalculateWeightedScore(
  existingScores: JobValueScores,
  newUserRanking: string[]
): JobValueScores {
  if (!existingScores.scores || Object.keys(existingScores.scores).length === 0) {
    return existingScores;
  }

  const weightedResult = calculateWeightedScore(existingScores.scores, newUserRanking);

  return {
    ...existingScores,
    weightedScore: weightedResult.score,
    rankingSnapshot: newUserRanking,
  };
}
