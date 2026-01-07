"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ApplicationCard } from "./application-card";
import { cn } from "@/lib/utils";
import type { JobApplication, ApplicationStatus } from "@/types";

interface KanbanColumnProps {
  id: ApplicationStatus;
  title: string;
  applications: JobApplication[];
}

export function KanbanColumn({ id, title, applications }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-72 bg-muted/50 rounded-lg p-3",
        isOver && "bg-muted"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full">
          {applications.length}
        </span>
      </div>

      <SortableContext
        items={applications.map((app) => app.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[200px]">
          {applications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
          {applications.length === 0 && (
            <div className="flex items-center justify-center h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <p className="text-xs text-muted-foreground">拖曳卡片至此</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
