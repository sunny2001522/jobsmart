"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, ExternalLink, Star, Heart, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobApplication } from "@/types";
import { useI18n } from "@/contexts/i18n-context";

interface ApplicationCardProps {
  application: JobApplication;
  isDragging?: boolean;
  isSelected?: boolean;
  showSummary?: boolean;
  onViewDetail?: () => void;
  onApprove?: () => void;
  isMobile?: boolean;
}

export function ApplicationCard({
  application,
  isDragging,
  isSelected,
  showSummary = true,
  onViewDetail,
  onApprove,
  isMobile = false,
}: ApplicationCardProps) {
  const { locale } = useI18n();
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
  const rawValueScore = application.value_scores?.weightedScore;
  const valueScore = rawValueScore == null
    ? null
    : Math.round(rawValueScore <= 10 ? rawValueScore * 10 : rawValueScore);
  const companyScore = application.rating_happiness;
  const scoreTone = companyScore == null ? "text-muted-foreground" : companyScore >= 7 ? "text-emerald-600" : companyScore >= 5 ? "text-amber-600" : "text-red-600";

  const legacyLinkedInTitle = application.position.match(/^(.+?)\s+at\s+(.+?)(?:\s+[—|-].*)?$/i);
  const displayPosition = legacyLinkedInTitle && /linkedin\.com/i.test(application.company_name)
    ? legacyLinkedInTitle[1].trim()
    : application.position;
  const displayCompany = legacyLinkedInTitle && /linkedin\.com/i.test(application.company_name)
    ? legacyLinkedInTitle[2].trim()
    : (/linkedin\.com/i.test(application.company_name) ? (locale === "en" ? "LinkedIn job" : "LinkedIn 職缺") : application.company_name);

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
                <h4 className="font-medium text-sm text-muted-foreground break-words">
                  {displayPosition}
                </h4>
                <p className="text-xs text-muted-foreground break-words">
                  {displayCompany}
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

                {/* 星星 = AI 公司評價；愛心 = 個人價值觀匹配 */}
                <div className="flex items-center gap-3">
                  <Star className={cn("h-3 w-3 fill-current", scoreTone)} />
                  <span className={cn("text-xs", scoreTone)}>
                    {companyScore == null ? "—" : `${companyScore}/10`}
                  </span>
                  <Heart className="h-3 w-3 fill-rose-400 text-rose-400" />
                  <span className="text-xs text-muted-foreground">{valueScore == null ? "—" : `${valueScore}/100`}</span>
                </div>
              </div>
            )}

            {application.status === "wishlist" && onApprove && (
              <button
                type="button"
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                onClick={(event) => { event.stopPropagation(); onApprove(); }}
              >
                <Check className="h-3.5 w-3.5" />
                {locale === "en" ? "Prepare resume" : "OK — 準備履歷"}
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
