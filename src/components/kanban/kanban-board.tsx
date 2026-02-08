"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { KanbanColumn } from "./kanban-column";
import { ApplicationDetailDrawer } from "./application-detail-drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import type { JobApplication, ApplicationStatus } from "@/types";
import { KANBAN_COLUMNS, APPLICATION_STATUS_LABELS } from "@/types";

interface KanbanBoardProps {
  applications: JobApplication[];
  showSummaries?: boolean;
  onApplicationUpdate?: (updatedApplication: JobApplication) => void;
  onAddClick?: (status: ApplicationStatus) => void;
}

export function KanbanBoard({ applications, showSummaries = true, onApplicationUpdate, onAddClick }: KanbanBoardProps) {
  const isMobile = useIsMobile();
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
        "h-[calc(100vh-220px)]",
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
              title={APPLICATION_STATUS_LABELS[status]}
              applications={applicationsByStatus[status]}
              selectedApplicationId={selectedApplication?.id}
              showSummaries={showSummaries}
              onViewDetail={handleViewDetail}
              onAddClick={() => onAddClick?.(status)}
              isMobile={isMobile}
            />
          ))}
        </div>

        {/* Desktop: inline panel / Mobile: drawer */}
        {!isMobile && (
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
