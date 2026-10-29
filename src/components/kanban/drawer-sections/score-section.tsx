"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Info,
  Settings,
  Heart,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ValueRanking, ValueVerdict } from "@/types";
import { useI18n } from "@/contexts/i18n-context";
import { getCompleteValueRanking } from "@/lib/values/matcher";
import { calculateWeightedMatchScore } from "@/lib/values/matcher";
import { formatCompanyTier, getCompanyTier } from "@/lib/company-tier";
import type { ValueMatchResult } from "@/lib/values/matcher";
export type { ValueMatchResult };

// All 20 value factors
const ALL_VALUES = [
  { id: "salary", name: "薪資待遇", nameEn: "Salary" },
  { id: "balance", name: "工作生活平衡", nameEn: "Work-life balance" },
  { id: "growth", name: "職涯發展", nameEn: "Career growth" },
  { id: "stability", name: "穩定性", nameEn: "Job stability" },
  { id: "learning", name: "學習成長", nameEn: "Learning & development" },
  { id: "autonomy", name: "自主性", nameEn: "Autonomy" },
  { id: "flexibility", name: "彈性工時", nameEn: "Flexible hours" },
  { id: "remote", name: "遠端工作", nameEn: "Remote work" },
  { id: "teamwork", name: "團隊合作", nameEn: "Teamwork" },
  { id: "colleagues", name: "同事關係", nameEn: "Coworker relationships" },
  { id: "manager", name: "主管支持", nameEn: "Manager support" },
  { id: "achievement", name: "成就感", nameEn: "Sense of accomplishment" },
  { id: "recognition", name: "專業認可", nameEn: "Professional recognition" },
  { id: "impact", name: "社會影響力", nameEn: "Social impact" },
  { id: "challenge", name: "挑戰性", nameEn: "Challenge" },
  { id: "creativity", name: "創意發揮", nameEn: "Creativity" },
  { id: "culture", name: "公司文化", nameEn: "Company culture" },
  { id: "independence", name: "獨立工作", nameEn: "Independent work" },
  { id: "benefits", name: "福利制度", nameEn: "Benefits" },
  { id: "location", name: "地理位置", nameEn: "Location" },
];

interface ScoreSectionProps {
  companyName: string;
  matchResult: ValueMatchResult | null;
  userRanking: ValueRanking | null;
  isLoading?: boolean;
  onRefreshScore?: () => Promise<void>;
  isRefreshingScore?: boolean;
  manualVerdicts?: Partial<Record<string, ValueVerdict>>;
  onVerdictChange?: (valueId: string, verdict: ValueVerdict) => void;
}

// Sort values by user's ranking order
const getSortedValues = (userRanking: ValueRanking | null) => {
  const savedRanking = userRanking?.full_ranking?.length
    ? userRanking.full_ranking
    : userRanking?.top_values || [];
  if (savedRanking.length === 0) {
    return ALL_VALUES;
  }

  const fullRanking = getCompleteValueRanking(savedRanking);
  return [...ALL_VALUES].sort((a, b) => {
    return fullRanking.indexOf(a.id) - fullRanking.indexOf(b.id);
  });
};

export function ScoreSection({
  companyName,
  matchResult,
  userRanking,
  isLoading,
  onRefreshScore,
  isRefreshingScore = false,
  manualVerdicts = {},
  onVerdictChange,
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

  const hasRanking = Boolean(userRanking?.full_ranking?.length || userRanking?.top_values?.length);
  const hasMatchResult = Boolean(matchResult?.breakdown.some((item) =>
    item.quality !== "unknown" || (manualVerdicts[item.valueId] && manualVerdicts[item.valueId] !== "unknown")
  ));
  const companyTier = getCompanyTier(companyName);
  const displayMatchScore = matchResult
    ? calculateWeightedMatchScore(matchResult.breakdown, manualVerdicts)
    : 0;
  const heartCount = hasMatchResult ? Math.max(1, Math.ceil(displayMatchScore / 20)) : 0;
  // Get score for a value from matchResult
  const getValueBreakdown = (valueId: string) => {
    return matchResult?.breakdown.find((item) => item.valueId === valueId);
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
            {isRefreshingScore ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <span className="text-xs">↓</span>}
            {isRefreshingScore ? (isEnglish ? "Calculating..." : "計算中...") : (isEnglish ? "Search & score" : "查詢並算分")}
          </Button>
        </div>
      )}
      <div className="grid gap-3 border-b pb-4 sm:grid-cols-2">
        <div className="flex items-center gap-3">
          <div className="rounded-md border bg-muted px-2 py-1 text-sm font-semibold">{formatCompanyTier(companyTier.tier)}</div>
        </div>
        {hasRanking ? <div className="flex items-center gap-3">
          <Heart className="h-6 w-6 fill-rose-400 text-rose-400" />
          <div>
            <p className="text-xs text-muted-foreground">{isEnglish ? "Values match" : "價值觀匹配度"}</p>
            <div className="flex items-center gap-0.5" aria-label={hasMatchResult ? `${heartCount} / 5` : undefined}>
              {Array.from({ length: 5 }, (_, index) => (
                <Heart key={index} className={`h-6 w-6 ${index < heartCount ? "fill-rose-400 text-rose-400" : "text-muted-foreground/30"}`} />
              ))}
            </div>
          </div>
        </div> : <Link href="/values" className="flex items-center gap-2 rounded-lg border border-dashed p-2 text-xs text-muted-foreground hover:border-primary hover:text-primary"><Heart className="h-4 w-4" />{isEnglish ? "Complete the values cards for a personalized match score" : "完成價值觀卡牌以取得個人化匹配分數"}</Link>}
      </div>

      {/* Compact, editable verdicts. Scores remain available for the overall match only. */}
      <div className="flex items-center justify-between gap-3 text-[11px] leading-4 text-muted-foreground">
        <p>{isEnglish ? "Choose a verdict for each value. Your selection overrides the AI suggestion." : "每項可直接調整：你的選擇會覆寫 AI 建議。"}</p>
        <Link href="/values" className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline">
          <Settings className="h-3 w-3" />
          {isEnglish ? "Adjust preferences" : "調整偏好"}
        </Link>
      </div>
      <div className="space-y-0.5">
        {getSortedValues(userRanking).map((value) => {
          const breakdown = getValueBreakdown(value.id);
          const detectedStatus = breakdown?.quality || "unknown";
          const verdict = manualVerdicts[value.id] ?? (value.id === "salary" && companyTier.tier === 1
            ? "positive"
            : detectedStatus === "good" ? "positive" : detectedStatus === "bad" ? "negative" : detectedStatus === "okay" ? "neutral" : "unknown");

          return (
            <div
              key={value.id}
              className="min-w-0 py-1.5"
            >
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">
                    {isEnglish ? value.nameEn : value.name}
                  </span>
                </span>
                <Select value={verdict} onValueChange={(next) => onVerdictChange?.(value.id, next as ValueVerdict)}>
                  <SelectTrigger
                    className="h-7 w-full gap-1 border-0 bg-transparent px-1 text-xs shadow-none hover:bg-muted"
                    aria-label={`${isEnglish ? value.nameEn : value.name}: ${isEnglish ? "verdict" : "評價"}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="positive" aria-label={isEnglish ? "Yes" : "符合"}>✓</SelectItem>
                    <SelectItem value="negative" aria-label={isEnglish ? "No" : "不符合"}>✕</SelectItem>
                    <SelectItem value="neutral" aria-label={isEnglish ? "Neutral" : "沒意見"}>—</SelectItem>
                    <SelectItem value="unknown" aria-label={isEnglish ? "Unknown" : "不知道"}>?</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
