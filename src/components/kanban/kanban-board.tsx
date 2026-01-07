"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./kanban-column";
import { ApplicationCard } from "./application-card";
import type { JobApplication, ApplicationStatus } from "@/types";
import { KANBAN_COLUMNS, APPLICATION_STATUS_LABELS } from "@/types";

interface KanbanBoardProps {
  applications: JobApplication[];
  onStatusChange: (applicationId: string, newStatus: ApplicationStatus) => void;
}

export function KanbanBoard({ applications, onStatusChange }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeApplication = activeId
    ? applications.find((app) => app.id === activeId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const overColumn = over.id as ApplicationStatus;

      // Check if over is a column
      if (KANBAN_COLUMNS.includes(overColumn)) {
        onStatusChange(active.id as string, overColumn);
      }
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Group applications by status
  const applicationsByStatus = KANBAN_COLUMNS.reduce((acc, status) => {
    acc[status] = applications.filter((app) => app.status === status);
    return acc;
  }, {} as Record<ApplicationStatus, JobApplication[]>);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            id={status}
            title={APPLICATION_STATUS_LABELS[status]}
            applications={applicationsByStatus[status]}
          />
        ))}
      </div>

      <DragOverlay>
        {activeApplication ? (
          <ApplicationCard application={activeApplication} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
