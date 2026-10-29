"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { KanbanColumn } from "./kanban-column";
import { ApplicationDetailDrawer } from "./application-detail-drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import type { JobApplication, ApplicationStatus } from "@/types";
import { KANBAN_COLUMNS, APPLICATION_STATUS_LABELS } from "@/types";
import { useI18n } from "@/contexts/i18n-context";

interface KanbanBoardProps {
  applications: JobApplication[];
  showSummaries?: boolean;
  onApplicationUpdate?: (updatedApplication: JobApplication) => void;
  onAddClick?: (status: ApplicationStatus) => void;
  onApproveApplication?: (application: JobApplication) => void;
  firstColumnContent?: ReactNode;
}

export function KanbanBoard({ applications, showSummaries = true, onApplicationUpdate, onAddClick, onApproveApplication, firstColumnContent }: KanbanBoardProps) {
  const isMobile = useIsMobile();
  const { locale } = useI18n();
  const englishStatusLabels: Record<ApplicationStatus, string> = {
    wishlist: "Saved",
    editing: "Preparing",
    applied: "Applied",
    interview_1: "Round 1",
    interview_2: "Round 2",
    interview_3: "Round 3",
    interview_4: "Round 4",
    interview_5: "Round 5",
    interview_6: "Round 6",
    interview_7: "Round 7",
    interview_8: "Round 8",
    verbal_offer: "Verbal offer",
    written_offer: "Written offer",
    rejected: "Rejected",
    ghosted: "No response",
  };
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (isMobile || !selectedApplication) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-application-detail-panel]")) return;
      setSelectedApplication(null);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isMobile, selectedApplication]);

  const handleViewDetail = (application: JobApplication) => {
    setSelectedApplication(application);
    // On mobile, open drawer; on desktop, just select (panel is always visible)
    if (isMobile) {
      setIsDrawerOpen(true);
    }
  };

  // Group applications by status
  const applicationsByStatus = KANBAN_COLUMNS.reduce((acc, status) => {
    acc[status] = applications.filter((app) => app.status === status);
    return acc;
  }, {} as Record<ApplicationStatus, JobApplication[]>);

  return (
    <>
      <div className={cn(
        "w-full min-w-0 max-w-full min-h-0 h-[calc(100vh-220px)] overflow-x-hidden",
        isMobile ? "flex flex-col overflow-y-auto" : "flex gap-4"
      )}>
        {/* Kanban columns */}
        <div className={cn(
          isMobile
            ? "flex flex-col gap-4 pb-4 px-1"
            : "flex gap-4 overflow-x-auto pb-4 flex-1 min-w-0"
        )}>
          {KANBAN_COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              id={status}
              title={locale === "en" ? englishStatusLabels[status] : APPLICATION_STATUS_LABELS[status]}
              applications={applicationsByStatus[status]}
              selectedApplicationId={selectedApplication?.id}
              showSummaries={showSummaries}
              onViewDetail={handleViewDetail}
              onApprove={onApproveApplication}
              onAddClick={() => onAddClick?.(status)}
              isMobile={isMobile}
              topContent={status === KANBAN_COLUMNS[0] ? firstColumnContent : undefined}
            />
          ))}
        </div>

        {/* Desktop: inline panel / Mobile: drawer */}
        {!isMobile && selectedApplication && (
          <ApplicationDetailDrawer
            application={selectedApplication}
            open={true}
            onOpenChange={() => setSelectedApplication(null)}
            onApplicationUpdate={onApplicationUpdate}
          />
        )}
      </div>

      {/* Mobile drawer */}
      {isMobile && (
        <ApplicationDetailDrawer
          application={selectedApplication}
          open={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
          onApplicationUpdate={onApplicationUpdate}
        />
      )}
    </>
  );
}
