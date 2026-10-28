"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { ApplicationCard } from "./application-card";
import { cn } from "@/lib/utils";
import type { JobApplication, ApplicationStatus } from "@/types";
import { useI18n } from "@/contexts/i18n-context";

interface KanbanColumnProps {
  id: ApplicationStatus;
  title: string;
  applications: JobApplication[];
  selectedApplicationId?: string;
  showSummaries?: boolean;
  onViewDetail?: (application: JobApplication) => void;
  onApprove?: (application: JobApplication) => void;
  onAddClick?: () => void;
  isMobile?: boolean;
  topContent?: ReactNode;
}

export function KanbanColumn({ id, title, applications, selectedApplicationId, showSummaries = true, onViewDetail, onApprove, onAddClick, isMobile = false, topContent }: KanbanColumnProps) {
  const { locale } = useI18n();
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-0 bg-muted/50 rounded-lg p-3",
        isOver && "bg-muted",
        isMobile ? "w-full" : "flex-shrink-0 w-72"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm">{title}</h3>
          <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full">
            {applications.length}
          </span>
        </div>
        <button
          onClick={onAddClick}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={`${locale === "en" ? "Add to " : "新增到"}${title}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {topContent}

      <SortableContext
        items={applications.map((app) => app.id)}
        strategy={isMobile ? horizontalListSortingStrategy : verticalListSortingStrategy}
      >
        <div className={cn(
          isMobile
            ? "flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-3 px-3 scrollbar-hide"
            : "space-y-2 min-h-[200px]"
        )}>
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              isSelected={application.id === selectedApplicationId}
              showSummary={showSummaries}
              onViewDetail={() => onViewDetail?.(application)}
              onApprove={() => onApprove?.(application)}
              isMobile={isMobile}
            />
          ))}
          {applications.length === 0 && (
            <div className={cn(
              "flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg",
              isMobile ? "min-w-[200px] h-24 flex-shrink-0 snap-start" : "h-24"
            )}>
              <p className="text-xs text-muted-foreground">{locale === "en" ? "No applications yet" : "拖曳卡片至此"}</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
