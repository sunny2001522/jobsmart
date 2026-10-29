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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  InterviewExperience,
  InterviewSource,
  InterviewSourceResult,
  InterviewAggregated,
} from "@/types";
import { useI18n } from "@/contexts/i18n-context";
import { containsCjk, isTextInInterviewLocale } from "@/lib/interview/question-utils";

const ALL_SOURCES: InterviewSource[] = ["dcard", "ptt", "qollie", "medium"];

interface InterviewSectionProps {
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
  position,
  interviews = [],
  aggregated,
  isLoading,
  isSearching,
  sourceResults,
  lastSearchedAt,
  onSearchInterviews,
}: InterviewSectionProps) {
  const { locale } = useI18n();
  const isEnglish = locale === "en";
  const [activeSource, setActiveSource] = useState<"all" | InterviewSource>("all");
  const [showAllQuestions, setShowAllQuestions] = useState(false);

  // 過濾面試經驗
  const filteredInterviews =
    activeSource === "all"
      ? interviews
      : interviews.filter((i) => i.source === activeSource);
  const resumeQuestions = [
    isEnglish
      ? "Which achievement from your experience is most relevant to this role?"
      : `請說明你過去最符合「${position}」職務的一項成果。`,
    isEnglish
      ? "Which experience on your resume best shows that you can solve a core problem in this role?"
      : "履歷中的哪段經驗最能證明你能解決這個職位的核心問題？",
    isEnglish
      ? "Walk me through one experience on your resume: the context, your actions, and the measurable result."
      : "請說明履歷中的一段經歷，包括背景、你的行動，以及可量化的結果。",
  ];

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
  const visibleCommonQuestions = (aggregated?.commonQuestions ?? []).filter((question) => !isEnglish || !containsCjk(question));

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      dcard: "Dcard",
      medium: "Medium",
      qollie: "Qollie",
      ptt: "PTT",
      all: isEnglish ? "All" : "全部",
    };
    return labels[source] || source;
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
              {isSearching ? (isEnglish ? "Searching..." : "搜尋中...") : (isEnglish ? "Search interview reviews" : "搜尋面試經驗")}
            </Button>
          )}
        </div>
        {lastSearchedAt && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {isEnglish ? "Updated " : "更新於 "}
              {new Date(lastSearchedAt).toLocaleDateString(isEnglish ? "en-US" : "zh-TW", {
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
          <p className="text-sm font-medium">{isEnglish ? "Searching interview reviews..." : "正在搜尋面試經驗..."}</p>
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
                    <span className="text-muted-foreground">({result.count} {isEnglish ? "reviews" : "則"})</span>
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
            {isEnglish ? "All" : "全部"} ({interviews.length})
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
          <p className="text-sm">{isEnglish ? "No interview reviews yet" : "尚無面試經驗資料"}</p>
          <p className="text-xs">{isEnglish ? "Select Search interview reviews to get started." : "點擊「搜尋面試經驗」按鈕開始搜尋"}</p>
        </div>
      )}

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <h4 className="text-sm font-medium">{isEnglish ? "Prepare questions from the company and your resume" : "根據公司與你的履歷準備問題"}</h4>
            <p className="mt-1 text-xs text-muted-foreground">{isEnglish ? "Company interview questions and resume follow-ups are collected in the Question bank." : "公司面試經驗與履歷追問會一起整理到面試題庫。"}</p>
          </div>
          <ul className="space-y-2">
            {resumeQuestions.map((question, index) => (
              <li key={question} className="flex gap-2 text-sm">
                <span className="text-muted-foreground">{index + 1}.</span>
                <span>{question}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 彙整資訊 */}
      {aggregated && interviews.length > 0 && (
        <div className="space-y-4">
          {/* 面試流程概覽 */}
          {aggregated.commonStages.length > 0 && (
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4" />
                {isEnglish ? "Common interview stages" : "常見面試流程"}
              </h4>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {aggregated.commonStages.filter((stage) => !isEnglish || !containsCjk(stage.name)).map((stage, index, stages) => (
                  <div key={stage.order} className="flex items-center">
                    <div className="flex flex-col items-center min-w-[70px]">
                      <Badge variant="secondary" className="text-xs whitespace-nowrap">
                        {stage.name}
                      </Badge>
                      {stage.description && (!isEnglish || !containsCjk(stage.description)) && (
                        <span className="text-[10px] text-muted-foreground text-center mt-0.5 line-clamp-1">
                          {stage.description}
                        </span>
                      )}
                    </div>
                    {index < stages.length - 1 && (
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
              <span className="text-muted-foreground">{isEnglish ? "offers" : "錄取"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Ban className="h-4 w-4 text-red-500" />
              <span className="font-medium">{aggregated.outcomeDistribution.rejected}</span>
              <span className="text-muted-foreground">{isEnglish ? "rejections" : "被拒"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              {isEnglish ? "Difficulty: " : "難度："}
              <span className="font-medium text-foreground">
                {isEnglish ? "Easy" : "簡單"} {aggregated.difficultyDistribution.easy} /
                {isEnglish ? "Medium" : "中等"} {aggregated.difficultyDistribution.medium} /
                {isEnglish ? "Hard" : "困難"} {aggregated.difficultyDistribution.hard}
              </span>
            </div>
          </div>

          {/* 常見面試題目 */}
          {visibleCommonQuestions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                <MessageCircle className="h-4 w-4" />
                {isEnglish ? "Common interview questions" : "常見面試題目"} ({visibleCommonQuestions.length})
              </h4>
              <ul className="space-y-1.5">
                {(showAllQuestions
                  ? visibleCommonQuestions
                  : visibleCommonQuestions.slice(0, 5)
                ).map((q, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
              {visibleCommonQuestions.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => setShowAllQuestions(!showAllQuestions)}
                >
                  {showAllQuestions ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      {isEnglish ? "Show less" : "收起"}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      {isEnglish ? "Show more" : "顯示更多"} ({visibleCommonQuestions.length - 5})
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
          <h4 className="text-sm font-medium">{isEnglish ? "Interview experiences" : "面試經驗分享"} ({filteredInterviews.length})</h4>
          {filteredInterviews.map((interview) => (
            <InterviewCard key={interview.id} interview={interview} isEnglish={isEnglish} />
          ))}
        </div>
      )}
    </div>
  );
}

// 面試經驗卡片
function InterviewCard({ interview, isEnglish }: { interview: InterviewExperience; isEnglish: boolean }) {
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
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] h-5">{isEnglish ? "Easy" : "簡單"}</Badge>;
      case "medium":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px] h-5">{isEnglish ? "Medium" : "中等"}</Badge>;
      case "hard":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] h-5">{isEnglish ? "Hard" : "困難"}</Badge>;
      default:
        return null;
    }
  };

  const getOutcomeBadge = (outcome: string | null) => {
    switch (outcome) {
      case "offer":
        return <Badge className="bg-green-100 text-green-700 text-[10px] h-5">{isEnglish ? "Offer" : "錄取"}</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700 text-[10px] h-5">{isEnglish ? "Rejected" : "被拒"}</Badge>;
      case "ghosted":
        return <Badge variant="secondary" className="text-[10px] h-5">{isEnglish ? "No response" : "無聲卡"}</Badge>;
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
            {(interview.title || isEnglish) && (
              <span className="text-sm font-medium line-clamp-1">
                {isEnglish && containsCjk(interview.title || "") ? "Interview experience" : interview.title || "Interview experience"}
              </span>
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
          {interview.position && (!isEnglish || !containsCjk(interview.position)) && (
            <Badge variant="secondary" className="text-[10px] h-5">{interview.position}</Badge>
          )}
        </div>

        {/* 面試關卡 */}
        {interview.stages.filter((stage) => !isEnglish || !containsCjk(stage.name)).length > 0 && (
          <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground overflow-x-auto">
            {interview.stages.filter((stage) => !isEnglish || !containsCjk(stage.name)).map((stage, i, stages) => (
              <span key={stage.order} className="flex items-center">
                <span className="whitespace-nowrap">{stage.name}</span>
                {i < stages.length - 1 && (
                  <ChevronRight className="h-3 w-3 mx-0.5" />
                )}
              </span>
            ))}
          </div>
        )}

        {/* 內容摘要 */}
        <p className={`text-sm text-muted-foreground ${expanded ? "" : "line-clamp-2"}`}>
          {isEnglish && containsCjk(interview.content)
            ? "This source review is in another language. Open the original source to read it."
            : interview.content}
        </p>

        {/* 面試題目 */}
        {interview.questions.filter((question) => !isEnglish || isTextInInterviewLocale(question, "en")).length > 0 && expanded && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs font-medium mb-1">{isEnglish ? "Interview questions:" : "面試題目："}</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {interview.questions.filter((question) => !isEnglish || isTextInInterviewLocale(question, "en")).slice(0, 5).map((q, i) => (
                <li key={i}>• {q}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 面試建議 */}
        {interview.tips.filter((tip) => !isEnglish || isTextInInterviewLocale(tip, "en")).length > 0 && expanded && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs font-medium mb-1">{isEnglish ? "Interview tips:" : "面試建議："}</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {interview.tips.filter((tip) => !isEnglish || isTextInInterviewLocale(tip, "en")).map((tip, i) => (
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
            {expanded ? (isEnglish ? "Show less" : "收起") : (isEnglish ? "View details" : "展開詳情")}
          </Button>
          {interview.published_at && (
            <p className="text-xs text-muted-foreground">
              {new Date(interview.published_at).toLocaleDateString(isEnglish ? "en-US" : "zh-TW")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
