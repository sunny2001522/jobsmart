"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, FileText, Loader2, ExternalLink, Search } from "lucide-react";
import type { JobApplication, CompanyReview } from "@/types";

interface CardExpandedContentProps {
  application: JobApplication;
  reviews: CompanyReview[];
  isLoading: boolean;
  onViewFullDetail: () => void;
  onSearchReviews?: () => Promise<void>;
  isSearching?: boolean;
}

export function CardExpandedContent({
  application,
  reviews,
  isLoading,
  onViewFullDetail,
  onSearchReviews,
  isSearching,
}: CardExpandedContentProps) {
  const jdContent = application.jd_content as {
    description?: string;
  } | null;

  // 分類評論
  const positiveReviews = reviews
    .filter((r) => r.sentiment === "positive")
    .slice(0, 3);
  const negativeReviews = reviews
    .filter((r) => r.sentiment === "negative")
    .slice(0, 3);

  // 計算來源統計
  const sourceCounts = reviews.reduce(
    (acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      dcard: "Dcard",
      medium: "Medium",
      qollie: "Qollie",
      ptt: "PTT",
    };
    return labels[source] || source;
  };

  return (
    <div className="mt-3 pt-3 border-t space-y-3">
      {/* JD 描述 - 3行 */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">職缺描述</span>
        </div>
        {jdContent?.description ? (
          <p className="text-xs text-muted-foreground line-clamp-3">
            {jdContent.description}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic">尚無職缺描述</p>
        )}
      </div>

      <Separator />

      {/* 評論區塊標題與搜尋按鈕 */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">公司評論</span>
        {onSearchReviews && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={(e) => {
              e.stopPropagation();
              onSearchReviews();
            }}
            disabled={isSearching}
          >
            {isSearching ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Search className="h-3 w-3 mr-1" />
            )}
            {isSearching ? "搜尋中" : "搜尋評論"}
          </Button>
        )}
      </div>

      {/* 評論區塊 */}
      {isLoading || isSearching ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-2">
          點擊「搜尋評論」取得公司評論
        </p>
      ) : (
        <div className="space-y-3">
          {/* 正面評論 */}
          {positiveReviews.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <ThumbsUp className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs font-medium text-green-600">
                  正面評論 ({positiveReviews.length})
                </span>
              </div>
              <ul className="space-y-1">
                {positiveReviews.map((review) => (
                  <li
                    key={review.id}
                    className="text-xs text-muted-foreground line-clamp-1 pl-5"
                  >
                    • {review.content}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 負面評論 */}
          {negativeReviews.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                <span className="text-xs font-medium text-red-600">
                  負面評論 ({negativeReviews.length})
                </span>
              </div>
              <ul className="space-y-1">
                {negativeReviews.map((review) => (
                  <li
                    key={review.id}
                    className="text-xs text-muted-foreground line-clamp-1 pl-5"
                  >
                    • {review.content}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 來源 badges */}
          {Object.keys(sourceCounts).length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {Object.entries(sourceCounts).map(([source, count]) => (
                <Badge
                  key={source}
                  variant="secondary"
                  className="text-[10px] h-5 px-1.5"
                >
                  {getSourceLabel(source)} ({count})
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <Separator />

      {/* 查看完整詳情按鈕 */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs h-7"
        onClick={(e) => {
          e.stopPropagation();
          onViewFullDetail();
        }}
      >
        <ExternalLink className="h-3 w-3 mr-1.5" />
        查看完整詳情
      </Button>
    </div>
  );
}
