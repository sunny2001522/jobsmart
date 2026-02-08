"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, ExternalLink, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobApplication } from "@/types";

interface ApplicationCardProps {
  application: JobApplication;
  isDragging?: boolean;
  isSelected?: boolean;
  showSummary?: boolean;
  onViewDetail?: () => void;
  isMobile?: boolean;
}

export function ApplicationCard({
  application,
  isDragging,
  isSelected,
  showSummary = true,
  onViewDetail,
  isMobile = false,
}: ApplicationCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: application.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // 標籤來源邏輯（向後兼容）
  const displayTags =
    application.jd_content_zh?.summary_tags &&
    application.jd_content_zh.summary_tags.length > 0
      ? application.jd_content_zh.summary_tags
      : application.jd_content_zh?.keywords_zh?.slice(0, 4) || [];

  // 分數來源邏輯
  const score = application.value_scores?.weightedScore
    ? Math.round(application.value_scores.weightedScore)
    : 5;

  const handleCardClick = (e: React.MouseEvent) => {
    // 避免在拖曳時觸發
    if (isDragging || isSortableDragging) return;
    onViewDetail?.();
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      onClick={handleCardClick}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        (isDragging || isSortableDragging) && "opacity-50 shadow-lg cursor-grabbing",
        isSelected && "ring-2 ring-primary bg-primary/5",
        isMobile && "flex-shrink-0 w-64 snap-start"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 mt-1 text-muted-foreground hover:text-foreground cursor-grab"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-sm break-words">
                  {application.company_name}
                </h4>
                <p className="text-xs text-muted-foreground break-words">
                  {application.position}
                </p>
              </div>
              {application.jd_url && (
                <a
                  href={application.jd_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="查看 JD"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {application.company?.industry && (
              <Badge variant="secondary" className="mt-2 text-xs">
                {application.company.industry}
              </Badge>
            )}

            {/* 摘要內容 - 由全域開關控制 */}
            {showSummary && (
              <div className="mt-2 pt-2 border-t space-y-2">
                {/* 工作標籤 */}
                {displayTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {displayTags.slice(0, 4).map((tag, index) => (
                      <Badge
                        key={`${tag}-${index}`}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 bg-primary/5"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {displayTags.length > 4 && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-5"
                      >
                        +{displayTags.length - 4}
                      </Badge>
                    )}
                  </div>
                )}

                {/* 公司評論分數 */}
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs text-muted-foreground">
                    {score}/10
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
