"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GripVertical, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobApplication } from "@/types";

interface ApplicationCardProps {
  application: JobApplication;
  isDragging?: boolean;
}

export function ApplicationCard({ application, isDragging }: ApplicationCardProps) {
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

  const companyInitial = application.company_name?.[0] || "?";

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        (isDragging || isSortableDragging) && "opacity-50 shadow-lg"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 mt-1 text-muted-foreground hover:text-foreground cursor-grab"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={application.company?.logo_url || undefined} />
            <AvatarFallback className="text-xs font-medium">
              {companyInitial}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-medium text-sm truncate">
                  {application.company_name}
                </h4>
                <p className="text-xs text-muted-foreground truncate">
                  {application.position}
                </p>
              </div>
              {application.jd_url && (
                <a
                  href={application.jd_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
