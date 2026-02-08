"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MessageSquare,
  ThumbsUp,
  Minus,
  ThumbsDown,
  Search,
  Loader2,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import type { CompanyReview } from "@/types";

type ReviewSource = "dcard" | "qollie" | "ptt" | "medium";

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
}

const ALL_SOURCES: ReviewSource[] = ["qollie", "dcard", "ptt", "medium"];

export function ReviewsSection({
  reviews,
  isLoading,
  companyName,
  sourceResults,
  lastSearchedAt,
  onSearchReviews,
  isSearching,
}: ReviewsSectionProps) {
  const [activeSource, setActiveSource] = useState<"all" | ReviewSource>("all");

  // 過濾評論
  const filteredReviews =
    activeSource === "all"
      ? reviews
      : reviews.filter((r) => r.source === activeSource);

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
  const sourceCounts = reviews.reduce(
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
      qollie: "求職天眼通",
      ptt: "PTT",
      manual: "手動添加",
    };
    return labels[source] || source;
  };

  const getSourceShortLabel = (source: string) => {
    const labels: Record<string, string> = {
      dcard: "Dcard",
      medium: "Medium",
      qollie: "Qollie",
      ptt: "PTT",
      all: "全部",
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
          {onSearchReviews && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSearchReviews}
              disabled={isSearching}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {isSearching ? "搜尋中..." : "搜尋公司評論"}
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
          <p className="text-sm font-medium">正在搜尋評論...</p>
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
                      ({result.count} 則)
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 來源篩選 */}
      {reviews.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <Button
            variant={activeSource === "all" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActiveSource("all")}
          >
            全部 ({reviews.length})
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
      {(!reviews || reviews.length === 0) && !isSearching && (
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mb-2" />
          <p className="text-sm">尚無公司評論</p>
          <p className="text-xs">點擊「搜尋公司評論」按鈕開始搜尋</p>
        </div>
      )}

      {/* 統計概覽 */}
      {filteredReviews.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-1.5">
            <ThumbsUp className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">{stats.positive}</span>
            <span className="text-xs text-muted-foreground">正面</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Minus className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">{stats.neutral}</span>
            <span className="text-xs text-muted-foreground">中性</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ThumbsDown className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">{stats.negative}</span>
            <span className="text-xs text-muted-foreground">負面</span>
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
                    {review.title && (
                      <span className="text-sm font-medium line-clamp-1">
                        {review.title}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {getSourceShortLabel(review.source)}
                    </Badge>
                    {review.source_url && (
                      <a
                        href={review.source_url}
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
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {review.content}
                </p>
                {review.published_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(review.published_at).toLocaleDateString("zh-TW")}
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
