"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Loader2,
  ExternalLink,
  Clock,
  MessageCircle,
  ChevronRight,
  CheckCircle,
  XCircle,
  Trophy,
  Ban,
  Ghost,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  InterviewExperience,
  InterviewSource,
  InterviewSourceResult,
  InterviewAggregated,
  InterviewStage,
} from "@/types";

const ALL_SOURCES: InterviewSource[] = ["dcard", "ptt", "qollie", "medium"];

interface InterviewSectionProps {
  companyName: string;
  position: string;
  interviews?: InterviewExperience[];
  aggregated?: InterviewAggregated;
  isLoading?: boolean;
  isSearching?: boolean;
  sourceResults?: Record<InterviewSource, InterviewSourceResult>;
  lastSearchedAt?: string;
  onSearchInterviews?: () => Promise<void>;
}

export function InterviewSection({
  companyName,
  position,
  interviews = [],
  aggregated,
  isLoading,
  isSearching,
  sourceResults,
  lastSearchedAt,
  onSearchInterviews,
}: InterviewSectionProps) {
  const [activeSource, setActiveSource] = useState<"all" | InterviewSource>("all");
  const [showAllQuestions, setShowAllQuestions] = useState(false);

  // 過濾面試經驗
  const filteredInterviews =
    activeSource === "all"
      ? interviews
      : interviews.filter((i) => i.source === activeSource);

  // 計算每個來源的數量
  const sourceCounts = interviews.reduce(
    (acc, interview) => {
      const source = interview.source as InterviewSource;
      if (ALL_SOURCES.includes(source)) {
        acc[source] = (acc[source] || 0) + 1;
      }
      return acc;
    },
    {} as Record<InterviewSource, number>
  );

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      dcard: "Dcard",
      medium: "Medium",
      qollie: "Qollie",
      ptt: "PTT",
      all: "全部",
    };
    return labels[source] || source;
  };

  const getDifficultyBadge = (difficulty: string | null) => {
    switch (difficulty) {
      case "easy":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">簡單</Badge>;
      case "medium":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">中等</Badge>;
      case "hard":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">困難</Badge>;
      default:
        return null;
    }
  };

  const getOutcomeIcon = (outcome: string | null) => {
    switch (outcome) {
      case "offer":
        return <Trophy className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <Ban className="h-4 w-4 text-red-500" />;
      case "ghosted":
        return <Ghost className="h-4 w-4 text-gray-400" />;
      default:
        return <HelpCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getOutcomeLabel = (outcome: string | null) => {
    switch (outcome) {
      case "offer":
        return "錄取";
      case "rejected":
        return "被拒";
      case "ghosted":
        return "無聲卡";
      default:
        return "未知";
    }
  };

  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive":
        return <ThumbsUp className="h-3.5 w-3.5 text-green-500" />;
      case "negative":
        return <ThumbsDown className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Minus className="h-3.5 w-3.5 text-yellow-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 搜尋按鈕與最後更新時間 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onSearchInterviews && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSearchInterviews}
              disabled={isSearching}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {isSearching ? "搜尋中..." : "搜尋面試經驗"}
            </Button>
          )}
        </div>
        {lastSearchedAt && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              更新於{" "}
              {new Date(lastSearchedAt).toLocaleDateString("zh-TW", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>

      {/* 搜尋進度 */}
      {isSearching && sourceResults && (
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <p className="text-sm font-medium">正在搜尋面試經驗...</p>
          <div className="grid grid-cols-2 gap-2">
            {ALL_SOURCES.map((source) => {
              const result = sourceResults[source];
              return (
                <div key={source} className="flex items-center gap-2 text-xs">
                  {!result ? (
                    <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30" />
                  ) : result.success ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span>{getSourceLabel(source)}</span>
                  {result && (
                    <span className="text-muted-foreground">({result.count} 則)</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 來源篩選 Tags */}
      {interviews.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <Button
            variant={activeSource === "all" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActiveSource("all")}
          >
            全部 ({interviews.length})
          </Button>
          {ALL_SOURCES.map((source) => {
            const count = sourceCounts[source] || 0;
            if (count === 0) return null;
            return (
              <Button
                key={source}
                variant={activeSource === source ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActiveSource(source)}
              >
                {getSourceLabel(source)} ({count})
              </Button>
            );
          })}
        </div>
      )}

      {/* 空狀態 */}
      {(!interviews || interviews.length === 0) && !isSearching && (
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <MessageCircle className="h-8 w-8 mb-2" />
          <p className="text-sm">尚無面試經驗資料</p>
          <p className="text-xs">點擊「搜尋面試經驗」按鈕開始搜尋</p>
        </div>
      )}

      {/* 彙整資訊 */}
      {aggregated && interviews.length > 0 && (
        <div className="space-y-4">
          {/* 面試流程概覽 */}
          {aggregated.commonStages.length > 0 && (
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4" />
                常見面試流程
              </h4>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {aggregated.commonStages.map((stage, index) => (
                  <div key={stage.order} className="flex items-center">
                    <div className="flex flex-col items-center min-w-[70px]">
                      <Badge variant="secondary" className="text-xs whitespace-nowrap">
                        {stage.name}
                      </Badge>
                      {stage.description && (
                        <span className="text-[10px] text-muted-foreground text-center mt-0.5 line-clamp-1">
                          {stage.description}
                        </span>
                      )}
                    </div>
                    {index < aggregated.commonStages.length - 1 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mx-0.5" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 統計資訊 */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg text-xs">
            <div className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-green-500" />
              <span className="font-medium">{aggregated.outcomeDistribution.offer}</span>
              <span className="text-muted-foreground">錄取</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Ban className="h-4 w-4 text-red-500" />
              <span className="font-medium">{aggregated.outcomeDistribution.rejected}</span>
              <span className="text-muted-foreground">被拒</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              難度：
              <span className="font-medium text-foreground">
                簡單 {aggregated.difficultyDistribution.easy} /
                中等 {aggregated.difficultyDistribution.medium} /
                困難 {aggregated.difficultyDistribution.hard}
              </span>
            </div>
          </div>

          {/* 常見面試題目 */}
          {aggregated.commonQuestions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                <MessageCircle className="h-4 w-4" />
                常見面試題目 ({aggregated.commonQuestions.length})
              </h4>
              <ul className="space-y-1.5">
                {(showAllQuestions
                  ? aggregated.commonQuestions
                  : aggregated.commonQuestions.slice(0, 5)
                ).map((q, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
              {aggregated.commonQuestions.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => setShowAllQuestions(!showAllQuestions)}
                >
                  {showAllQuestions ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      收起
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      顯示更多 ({aggregated.commonQuestions.length - 5})
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 面試經驗列表 */}
      {filteredInterviews.length > 0 && (
        <div className="space-y-3 mt-4">
          <h4 className="text-sm font-medium">面試經驗分享 ({filteredInterviews.length})</h4>
          {filteredInterviews.map((interview) => (
            <InterviewCard key={interview.id} interview={interview} />
          ))}
        </div>
      )}
    </div>
  );
}

// 面試經驗卡片
function InterviewCard({ interview }: { interview: InterviewExperience }) {
  const [expanded, setExpanded] = useState(false);

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      dcard: "Dcard",
      medium: "Medium",
      qollie: "Qollie",
      ptt: "PTT",
    };
    return labels[source] || source;
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive":
        return "border-l-green-500";
      case "negative":
        return "border-l-red-500";
      default:
        return "border-l-yellow-500";
    }
  };

  const getDifficultyBadge = (difficulty: string | null) => {
    switch (difficulty) {
      case "easy":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] h-5">簡單</Badge>;
      case "medium":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px] h-5">中等</Badge>;
      case "hard":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] h-5">困難</Badge>;
      default:
        return null;
    }
  };

  const getOutcomeBadge = (outcome: string | null) => {
    switch (outcome) {
      case "offer":
        return <Badge className="bg-green-100 text-green-700 text-[10px] h-5">錄取</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700 text-[10px] h-5">被拒</Badge>;
      case "ghosted":
        return <Badge variant="secondary" className="text-[10px] h-5">無聲卡</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className={`border-l-4 ${getSentimentColor(interview.sentiment)}`}>
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {interview.title && (
              <span className="text-sm font-medium line-clamp-1">{interview.title}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className="text-xs">
              {getSourceLabel(interview.source)}
            </Badge>
            {interview.source_url && (
              <a
                href={interview.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 mb-2">
          {getDifficultyBadge(interview.difficulty)}
          {getOutcomeBadge(interview.outcome)}
          {interview.position && (
            <Badge variant="secondary" className="text-[10px] h-5">{interview.position}</Badge>
          )}
        </div>

        {/* 面試關卡 */}
        {interview.stages.length > 0 && (
          <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground overflow-x-auto">
            {interview.stages.map((stage, i) => (
              <span key={stage.order} className="flex items-center">
                <span className="whitespace-nowrap">{stage.name}</span>
                {i < interview.stages.length - 1 && (
                  <ChevronRight className="h-3 w-3 mx-0.5" />
                )}
              </span>
            ))}
          </div>
        )}

        {/* 內容摘要 */}
        <p className={`text-sm text-muted-foreground ${expanded ? "" : "line-clamp-2"}`}>
          {interview.content}
        </p>

        {/* 面試題目 */}
        {interview.questions.length > 0 && expanded && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs font-medium mb-1">面試題目：</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {interview.questions.slice(0, 5).map((q, i) => (
                <li key={i}>• {q}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 面試建議 */}
        {interview.tips.length > 0 && expanded && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs font-medium mb-1">面試建議：</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {interview.tips.map((tip, i) => (
                <li key={i}>• {tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 展開/收起 & 日期 */}
        <div className="flex items-center justify-between mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "收起" : "展開詳情"}
          </Button>
          {interview.published_at && (
            <p className="text-xs text-muted-foreground">
              {new Date(interview.published_at).toLocaleDateString("zh-TW")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
