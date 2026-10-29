"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  ThumbsUp,
  Minus,
  ThumbsDown,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
} from "lucide-react";
import type { CompanyReview } from "@/types";
import { useI18n } from "@/contexts/i18n-context";

type ReviewSource = "dcard" | "qollie" | "ptt" | "medium" | "glassdoor" | "indeed" | "comparably";

interface SourceResult {
  success: boolean;
  count: number;
  error?: string;
}

interface ReviewsSectionProps {
  reviews: CompanyReview[];
  isLoading?: boolean;
  companyName?: string;
  sourceResults?: Record<ReviewSource, SourceResult>;
  lastSearchedAt?: string;
  onSearchReviews?: () => Promise<void>;
  isSearching?: boolean;
  onAddReview?: (review: { title: string; content: string; sentiment: "positive" | "neutral" | "negative" }) => Promise<void>;
}

const ALL_SOURCES: ReviewSource[] = ["glassdoor", "indeed", "comparably", "qollie", "dcard", "ptt", "medium"];

function cleanReviewContent(content: string): string {
  return content.replace(/https?:\/\/\S+|www\.\S+/gi, "").replace(/employee reviews at .*?\.(?=\s|$)/gi, "").replace(/like\.\s*\d+\s*[·•-]?\s*avatar/gi, "").replace(/\s+/g, " ").trim();
}

function shouldShowReviewTitle(title: string | null | undefined): boolean {
  return Boolean(title && !/working at .*glassdoor|^glassdoor$/i.test(title.trim()));
}

type ReviewSummary = { positive: string[]; negative: string[]; neutral: string[] };

function buildReviewSummary(reviews: CompanyReview[]): ReviewSummary {
  const noise = /employee reviews|newsweek|avatar|www\.|linkedin|likes?|reactions?|followers?|funny picture|教育背景|零工作經驗|大學生|posted on/i;
  const summary: ReviewSummary = { positive: [], negative: [], neutral: [] };
  for (const review of reviews) {
    const bucket = review.sentiment === "positive" ? "positive" : review.sentiment === "negative" ? "negative" : "neutral";
    const sentence = cleanReviewContent(review.content)
      .split(/(?<=[.!?。！？])\s+/)
      .map((item) => item.trim())
      .find((item) => item.length >= 24 && !noise.test(item));
    if (sentence && summary[bucket].length < 2) summary[bucket].push(sentence);
  }
  return summary;
}

export function ReviewsSection({
  reviews,
  isLoading,
  companyName,
  sourceResults,
  lastSearchedAt,
  onSearchReviews,
  isSearching,
  onAddReview,
}: ReviewsSectionProps) {
  const { locale } = useI18n();
  const isEnglish = locale === "en";
  const companyToken = (companyName || "").replace(/linkedin\s*(job|職缺)/gi, "").trim().split(/\s+/)[0].toLowerCase();
  const matchingReviews = companyToken ? reviews.filter((review) => `${review.title || ""} ${review.content}`.toLowerCase().includes(companyToken)) : reviews;
  const visibleReviews = matchingReviews.length > 0 ? matchingReviews : reviews;
  const [activeSource, setActiveSource] = useState<"all" | ReviewSource>("all");
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [manualSentiment, setManualSentiment] = useState<"positive" | "neutral" | "negative">("neutral");
  const [isSavingReview, setIsSavingReview] = useState(false);

  const submitManualReview = async () => {
    if (!onAddReview || !manualContent.trim()) return;
    setIsSavingReview(true);
    try {
      await onAddReview({ title: manualTitle.trim(), content: manualContent.trim(), sentiment: manualSentiment });
      setManualTitle("");
      setManualContent("");
      setManualSentiment("neutral");
      setIsAddingReview(false);
    } finally {
      setIsSavingReview(false);
    }
  };

  // 過濾評論
  const filteredReviews =
    activeSource === "all"
      ? visibleReviews
      : visibleReviews.filter((r) => r.source === activeSource);

  // 統計評論情緒
  const stats = filteredReviews.reduce(
    (acc, review) => {
      if (review.sentiment === "positive") acc.positive++;
      else if (review.sentiment === "negative") acc.negative++;
      else acc.neutral++;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 }
  );

  // 計算每個來源的評論數
  const sourceCounts = visibleReviews.reduce(
    (acc, review) => {
      const source = review.source as ReviewSource;
      if (ALL_SOURCES.includes(source)) {
        acc[source] = (acc[source] || 0) + 1;
      }
      return acc;
    },
    {} as Record<ReviewSource, number>
  );

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

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      dcard: "Dcard",
      medium: "Medium",
      qollie: isEnglish ? "Qollie" : "求職天眼通",
      ptt: "PTT",
      manual: isEnglish ? "Manual" : "手動添加",
      glassdoor: "Glassdoor",
      indeed: "Indeed",
      comparably: "Comparably",
    };
    return labels[source] || source;
  };

  const getSourceShortLabel = (source: string) => {
    const labels: Record<string, string> = {
      dcard: "Dcard",
      medium: "Medium",
      qollie: "Qollie",
      ptt: "PTT",
      glassdoor: "Glassdoor",
      indeed: "Indeed",
      comparably: "Comparably",
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
      <div className="min-w-0 space-y-2">
        {onSearchReviews && (
          <Button
            variant="outline"
            size="sm"
            className="w-full min-w-0 justify-start"
            onClick={onSearchReviews}
            disabled={isSearching}
          >
            {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            <span className="truncate">{isSearching ? (isEnglish ? "Searching..." : "搜尋中...") : (isEnglish ? "Search company reviews" : "搜尋公司評論")}</span>
          </Button>
        )}
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          {lastSearchedAt && (
            <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {isEnglish ? "Updated " : "更新於 "}
                {new Date(lastSearchedAt).toLocaleDateString(isEnglish ? "en-US" : "zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}
          {onAddReview && (
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => setIsAddingReview((value) => !value)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {isEnglish ? "Add review" : "手動新增評論"}
            </Button>
          )}
        </div>
      </div>

      {isAddingReview && onAddReview && (
        <Card>
          <CardContent className="space-y-2 p-3">
            <input
              value={manualTitle}
              onChange={(event) => setManualTitle(event.target.value)}
              placeholder={isEnglish ? "Title (optional)" : "標題（選填）"}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
            <Textarea
              value={manualContent}
              onChange={(event) => setManualContent(event.target.value)}
              placeholder={isEnglish ? "Paste or write a company review..." : "貼上或輸入公司評論..."}
              rows={4}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <select value={manualSentiment} onChange={(event) => setManualSentiment(event.target.value as typeof manualSentiment)} className="h-8 rounded-md border bg-background px-2 text-xs">
                <option value="positive">{isEnglish ? "Positive" : "正面"}</option>
                <option value="neutral">{isEnglish ? "Neutral" : "中性"}</option>
                <option value="negative">{isEnglish ? "Negative" : "負面"}</option>
              </select>
              <Button size="sm" onClick={() => void submitManualReview()} disabled={!manualContent.trim() || isSavingReview}>
                {isSavingReview ? (isEnglish ? "Saving..." : "儲存中...") : (isEnglish ? "Save and score" : "儲存並算分")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 搜尋進度 */}
      {isSearching && sourceResults && (
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <p className="text-sm font-medium">{isEnglish ? "Searching reviews..." : "正在搜尋評論..."}</p>
          <div className="grid grid-cols-2 gap-2">
            {ALL_SOURCES.map((source) => {
              const result = sourceResults[source];
              return (
                <div
                  key={source}
                  className="flex items-center gap-2 text-xs"
                >
                  {!result ? (
                    <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30" />
                  ) : result.success ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span>{getSourceLabel(source)}</span>
                  {result && (
                    <span className="text-muted-foreground">
                      ({result.count} {isEnglish ? "reviews" : "則"})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 來源篩選 */}
      {visibleReviews.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <Button
            variant={activeSource === "all" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActiveSource("all")}
          >
            {getSourceShortLabel("all")} ({visibleReviews.length})
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
                {getSourceShortLabel(source)} ({count})
              </Button>
            );
          })}
        </div>
      )}

      {/* 空狀態 */}
      {(!visibleReviews || visibleReviews.length === 0) && !isSearching && (
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mb-2" />
          <p className="text-sm">{isEnglish ? "No company reviews yet" : "尚無公司評論"}</p>
          <p className="text-xs">{isEnglish ? "Click Search company reviews to begin" : "點擊「搜尋公司評論」按鈕開始搜尋"}</p>
        </div>
      )}

      {visibleReviews.length > 0 && (
        <Card className="bg-muted/40">
          <CardContent className="p-3">
            <p className="mb-1 text-xs font-semibold">{isEnglish ? "AI review summary" : "AI 評論摘要"}</p>
            {(() => {
              const summary = buildReviewSummary(visibleReviews);
              const groups = [
                { label: isEnglish ? "Pros" : "優點", items: summary.positive, tone: "text-emerald-700 dark:text-emerald-400" },
                { label: isEnglish ? "Cons" : "缺點", items: summary.negative, tone: "text-rose-700 dark:text-rose-400" },
                { label: isEnglish ? "Other observations" : "其他觀察", items: summary.neutral, tone: "text-muted-foreground" },
              ].filter((group) => group.items.length > 0);
              return groups.length ? (
                <div className="space-y-2 text-sm leading-6">
                  {groups.map((group) => <div key={group.label}><p className={`text-xs font-medium ${group.tone}`}>{group.label}</p><ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">{group.items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}
                </div>
              ) : <p className="text-sm leading-6 text-muted-foreground">{isEnglish ? "No reliable review evidence is available yet." : "目前沒有足夠可靠的評論證據可整理。"}</p>;
            })()}
          </CardContent>
        </Card>
      )}

      {/* 統計概覽 */}
      {filteredReviews.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-1.5">
            <ThumbsUp className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">{stats.positive}</span>
            <span className="text-xs text-muted-foreground">{isEnglish ? "Positive" : "正面"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Minus className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">{stats.neutral}</span>
            <span className="text-xs text-muted-foreground">{isEnglish ? "Neutral" : "中性"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ThumbsDown className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">{stats.negative}</span>
            <span className="text-xs text-muted-foreground">{isEnglish ? "Negative" : "負面"}</span>
          </div>
        </div>
      )}

      {/* 評論列表 */}
      {filteredReviews.length > 0 && (
        <div className="space-y-3">
          {filteredReviews.map((review) => (
            <Card
              key={review.id}
              className={`border-l-4 ${getSentimentColor(review.sentiment)}`}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getSentimentIcon(review.sentiment)}
                    {shouldShowReviewTitle(review.title) && (
                      <span className="text-sm font-medium line-clamp-1">
                        {review.title}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {getSourceShortLabel(review.source)}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground break-words">
                  {cleanReviewContent(review.content)}
                </p>
                {review.published_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(review.published_at).toLocaleDateString(isEnglish ? "en-US" : "zh-TW")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
