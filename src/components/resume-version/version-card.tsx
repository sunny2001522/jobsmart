"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, MoreVertical, Pencil, Trash2, Briefcase, CheckCircle2 } from "lucide-react";
import type { ResumeVersion } from "@/types";

interface VersionCardProps {
  version: ResumeVersion & {
    job_count?: number;
    completed_count?: number;
  };
  onEdit?: () => void;
  onDelete?: () => void;
}

export function VersionCard({ version, onEdit, onDelete }: VersionCardProps) {
  const jobCount = version.job_count ?? 0;
  const completedCount = version.completed_count ?? 0;

  return (
    <Card className="group relative hover:shadow-md transition-shadow">
      <Link href={`/resume/${version.id}`} className="absolute inset-0 z-0" />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{version.name}</CardTitle>
              {version.target_role && (
                <CardDescription className="text-sm">
                  {version.target_role}
                </CardDescription>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                編輯名稱
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                刪除版本
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        {version.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {version.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-4 w-4" />
            <span>{jobCount} 個工作</span>
          </div>
          {jobCount > 0 && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{completedCount} 已生成</span>
            </div>
          )}
        </div>

        {version.base_ats_score !== null && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">基礎 ATS 分數</span>
              <span className="font-medium">{version.base_ats_score}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
