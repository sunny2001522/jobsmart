"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  XCircle,
  Info,
  DollarSign,
  Scale,
  TrendingUp,
  Building,
  BookOpen,
  Target,
  Clock,
  Home,
  Users,
  UserPlus,
  Briefcase,
  Trophy,
  Star,
  Globe,
  Flame,
  Lightbulb,
  Theater,
  User,
  Gift,
  MapPin,
  Settings,
  Heart,
  type LucideIcon,
} from "lucide-react";
import type { ValueRanking, JobApplication, CompanyReview } from "@/types";
import { useI18n } from "@/contexts/i18n-context";

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

// All 20 value factors
const ALL_VALUES = [
  { id: "salary", name: "薪資待遇" },
  { id: "balance", name: "工作生活平衡" },
  { id: "growth", name: "職涯發展" },
  { id: "stability", name: "穩定性" },
  { id: "learning", name: "學習成長" },
  { id: "autonomy", name: "自主性" },
  { id: "flexibility", name: "彈性工時" },
  { id: "remote", name: "遠端工作" },
  { id: "teamwork", name: "團隊合作" },
  { id: "colleagues", name: "同事關係" },
  { id: "manager", name: "主管支持" },
  { id: "achievement", name: "成就感" },
  { id: "recognition", name: "專業認可" },
  { id: "impact", name: "社會影響力" },
  { id: "challenge", name: "挑戰性" },
  { id: "creativity", name: "創意發揮" },
  { id: "culture", name: "公司文化" },
  { id: "independence", name: "獨立工作" },
  { id: "benefits", name: "福利制度" },
  { id: "location", name: "地理位置" },
];

// Lucide icons for each value
const VALUE_ICONS: Record<string, LucideIcon> = {
  salary: DollarSign,
  balance: Scale,
  growth: TrendingUp,
  stability: Building,
  learning: BookOpen,
  autonomy: Target,
  flexibility: Clock,
  remote: Home,
  teamwork: Users,
  colleagues: UserPlus,
  manager: Briefcase,
  achievement: Trophy,
  recognition: Star,
  impact: Globe,
  challenge: Flame,
  creativity: Lightbulb,
  culture: Theater,
  independence: User,
  benefits: Gift,
  location: MapPin,
};

interface ScoreSectionProps {
  matchResult: ValueMatchResult | null;
  userRanking: ValueRanking | null;
  application: JobApplication;
  reviews: CompanyReview[];
  isLoading?: boolean;
  onRefreshScore?: () => Promise<void>;
  isRefreshingScore?: boolean;
}

// Get description from JD/application data for each value
const getValueDescription = (
  valueId: string,
  application: JobApplication
): string | null => {
  const jd = application.jd_content as Record<string, unknown> | null;
  const jdZh = application.jd_content_zh;
  const keywords = application.jd_keywords || [];

  switch (valueId) {
    case "salary":
      if (jd?.salary_range) return String(jd.salary_range);
      if (application.salary_min && application.salary_max) {
        return `${application.salary_min.toLocaleString()} - ${application.salary_max.toLocaleString()} ${
          application.salary_currency || "TWD"
        }`;
      }
      if (application.salary_min) {
        return `${application.salary_min.toLocaleString()}+ ${
          application.salary_currency || "TWD"
        }`;
      }
      return null;

    case "location":
      return (jd?.location as string) || application.work_location || null;

    case "benefits": {
      const benefits = (jdZh?.benefits || jd?.benefits) as string[] | null;
      return benefits?.slice(0, 3).join("、") || null;
    }

    case "remote":
      if (keywords.some((k) => /遠端|remote|wfh|居家/i.test(k)))
        return "支援遠端工作";
      return null;

    case "flexibility":
      if (keywords.some((k) => /彈性|flexible/i.test(k))) return "彈性工時";
      return null;

    case "growth": {
      const growth = jd?.career_growth as string[] | undefined;
      if (Array.isArray(growth) && growth.length > 0) {
        return growth.slice(0, 2).join("、");
      }
      return null;
    }

    case "learning": {
      const learning = jd?.learning as string[] | undefined;
      if (Array.isArray(learning) && learning.length > 0) {
        return learning.slice(0, 2).join("、");
      }
      return null;
    }

    default:
      return null;
  }
};

// Sort values by user's ranking order
const getSortedValues = (userRanking: ValueRanking | null) => {
  if (!userRanking?.full_ranking?.length) {
    return ALL_VALUES;
  }

  return [...ALL_VALUES].sort((a, b) => {
    const aIndex = userRanking.full_ranking!.indexOf(a.id);
    const bIndex = userRanking.full_ranking!.indexOf(b.id);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
};

export function ScoreSection({
  matchResult,
  userRanking,
  application,
  reviews,
  isLoading,
  onRefreshScore,
  isRefreshingScore = false,
}: ScoreSectionProps) {
  const { locale } = useI18n();
  const isEnglish = locale === "en";
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  const hasRanking =
    userRanking && userRanking.top_values && userRanking.top_values.length > 0;
  const hasMatchResult = matchResult && matchResult.breakdown.length > 0;
  const companyRating = reviews.length > 0
    ? Math.max(1, Math.min(10, Math.round(reviews.reduce((total, review) => total + (review.sentiment_score ?? (review.sentiment === "positive" ? 85 : review.sentiment === "negative" ? 25 : 55)), 0) / reviews.length / 10)))
    : null;

  // Check if value is in top 3 priority
  const isTopPriority = (index: number): boolean => index < 3;

  // Get score for a value from matchResult
  const getValueScore = (
    valueId: string
  ): { score: number | null; isMatched: boolean } => {
    if (!matchResult) return { score: null, isMatched: false };
    const breakdown = matchResult.breakdown.find((b) => b.valueId === valueId);
    if (!breakdown) return { score: null, isMatched: false };
    return {
      score: breakdown.contributedScore,
      isMatched: breakdown.isMatched,
    };
  };

  // Get user priority for a value
  const getUserPriority = (valueId: string): number | null => {
    if (!userRanking?.top_values) return null;
    const index = userRanking.top_values.indexOf(valueId);
    return index >= 0 ? index + 1 : null;
  };

  return (
    <div className="space-y-4 overflow-hidden w-full">
      {onRefreshScore && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
          <p className="min-w-0 text-xs text-muted-foreground">
            {isEnglish ? "Use company JD and reviews to calculate scores" : "使用公司 JD 與評論重新計算分數"}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5"
            onClick={() => void onRefreshScore()}
            disabled={isRefreshingScore}
          >
            {isRefreshingScore ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
            {isRefreshingScore ? (isEnglish ? "Calculating..." : "計算中...") : (isEnglish ? "Search & score" : "查詢並算分")}
          </Button>
        </div>
      )}
      <div className="grid gap-3 border-b pb-4 sm:grid-cols-2">
        <div className="flex items-center gap-3">
          <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
          <div><p className="text-xs text-muted-foreground">{isEnglish ? "AI company rating (1–10)" : "AI 公司評價（1–10）"}</p><p className="text-3xl font-bold">{companyRating ?? "--"}<span className="text-sm font-normal text-muted-foreground"> / 10</span></p></div>
        </div>
        {hasRanking ? <div className="flex items-center gap-3">
          <Heart className="h-6 w-6 fill-rose-400 text-rose-400" />
          <div><p className="text-xs text-muted-foreground">{isEnglish ? "Values match" : "價值觀匹配度"}</p><p className="text-3xl font-bold text-primary">{hasMatchResult ? matchResult.matchScore : "--"}<span className="text-sm font-normal text-muted-foreground"> / 100</span></p></div>
        </div> : <Link href="/values" className="flex items-center gap-2 rounded-lg border border-dashed p-2 text-xs text-muted-foreground hover:border-primary hover:text-primary"><Heart className="h-4 w-4" />{isEnglish ? "Complete the values cards to calculate your match" : "完成價值觀卡牌後計算個人匹配度"}</Link>}
      </div>

      {/* 價值觀列表 */}
      <div className="space-y-0.5">
        {getSortedValues(userRanking).map((value, index) => {
          const Icon = VALUE_ICONS[value.id];
          const { score, isMatched } = getValueScore(value.id);
          const displayScore = score !== null ? Math.round(score) : null;
          const breakdown = matchResult?.breakdown.find((item) => item.valueId === value.id);
          const weight = breakdown ? Math.round(breakdown.maxPossibleScore) : null;
          const description = getValueDescription(value.id, application);
          const isTop = isTopPriority(index);

          return (
            <div
              key={value.id}
              className={`py-1.5 min-w-0 ${
                isTop ? "border-l-2 border-primary pl-2 -ml-2" : ""
              }`}
            >
              <div className="flex items-center justify-between text-sm min-w-0">
                <span className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className={`truncate ${isTop ? "font-medium" : ""}`}>
                    {value.name}
                  </span>
                  {isMatched && (
                    <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                  )}
                  {displayScore !== null && !isMatched && (
                    <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                  )}
                </span>
                <span className="text-muted-foreground flex items-center gap-1 shrink-0 ml-2 text-xs">
                  {displayScore !== null ? (
                    <span>{displayScore} pts{weight !== null ? ` · ${weight}%` : ""}</span>
                  ) : (
                    <>
                      <span>?</span>
                      <Link href="/values" className="hover:text-primary">
                        <Settings className="h-3 w-3" />
                      </Link>
                    </>
                  )}
                </span>
              </div>
              {description && (
                <p className="text-xs text-muted-foreground pl-5 truncate mt-0.5">
                  {description}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* 底部提示 */}
      {!hasRanking && (
        <Link
          href="/values"
          className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
        >
          <Info className="h-3 w-3" />
          <span>{isEnglish ? "Complete values ranking for personalized analysis →" : "完成價值觀排序以獲得個人化分析 →"}</span>
        </Link>
      )}
    </div>
  );
}
