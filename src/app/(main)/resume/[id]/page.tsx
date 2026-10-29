"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Pencil,
  Download,
  Plus,
  Briefcase,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { useResumeVersion, useJobApplications } from "@/hooks";
import { localizedToast as toast } from "@/lib/i18n/toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { GenerationStatus, JobApplication, VersionJobResume } from "@/types";

interface VersionWorkspacePageProps {
  params: Promise<{ id: string }>;
}

// 生成狀態圖標
function StatusIcon({ status }: { status: GenerationStatus }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "generating":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case "failed":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

// 工作卡片組件
function JobCard({
  vjr,
  versionId,
  onGenerate,
  onRemove,
}: {
  vjr: VersionJobResume & { job_application?: JobApplication };
  versionId: string;
  onGenerate: () => void;
  onRemove: () => void;
}) {
  const job = vjr.job_application;
  if (!job) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">找不到對應的追蹤職缺資料</p>
          <Button size="sm" variant="outline" onClick={onRemove}>移除此關聯</Button>
        </CardContent>
      </Card>
    );
  }
  const isCompleted = vjr.generation_status === "completed";
  const isGenerating = vjr.generation_status === "generating";

  return (
    <Card className="group relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{job.company_name}</CardTitle>
            <CardDescription>{job.position}</CardDescription>
          </div>
          <StatusIcon status={vjr.generation_status} />
        </div>
      </CardHeader>
      <CardContent>
        {job.jd_keywords?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {job.jd_keywords.slice(0, 3).map((keyword) => (
              <Badge key={keyword} variant="outline" className="text-xs">
                {keyword}
              </Badge>
            ))}
            {job.jd_keywords.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{job.jd_keywords.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {isCompleted ? (
            <>
              <Button size="sm" asChild>
                <Link href={`/resume/${versionId}/job/${job.id}`}>
                  查看客製化履歷
                </Link>
              </Button>
              <Button size="sm" variant="outline" onClick={onGenerate}>
                <Sparkles className="h-3 w-3 mr-1" />
                重新生成
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={onGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  生成客製化履歷
                </>
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto opacity-0 group-hover:opacity-100"
            onClick={onRemove}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {vjr.ats_score !== null && (
          <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
            <span className="text-muted-foreground">ATS 分數</span>
            <span className="font-medium">{vjr.ats_score}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 工作選擇器
function JobSelector({
  onSelect,
  linkedJobIds,
}: {
  onSelect: (jobId: string) => void;
  linkedJobIds: Set<string>;
}) {
  const { applications, isLoading } = useJobApplications();

  const availableJobs = applications.filter(
    (job) => !linkedJobIds.has(job.id)
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (availableJobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>沒有可用的工作</p>
        <p className="text-sm mt-1">
          {applications.length === 0
            ? "請先在求職追蹤中新增工作"
            : "所有工作都已加入此版本"}
        </p>
        {applications.length === 0 && (
          <Button asChild className="mt-4" variant="outline">
            <Link href="/applications">
              前往求職追蹤
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {availableJobs.map((job) => (
        <Card
          key={job.id}
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onSelect(job.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{job.company_name}</p>
                <p className="text-sm text-muted-foreground">{job.position}</p>
              </div>
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function VersionWorkspacePage({ params }: VersionWorkspacePageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { version, isLoading, error, linkJob, unlinkJob, updateJobResume, refresh } =
    useResumeVersion(id);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [removeJobId, setRemoveJobId] = useState<string | null>(null);
  const [generatingJobId, setGeneratingJobId] = useState<string | null>(null);

  const handleAddJob = async (jobId: string) => {
    const result = await linkJob(jobId);
    if (result) {
      toast.success("工作已加入版本");
      setIsSheetOpen(false);
    } else {
      toast.error("加入失敗，該工作可能已存在");
    }
  };

  const handleRemoveJob = async () => {
    if (!removeJobId) return;

    const success = await unlinkJob(removeJobId);
    if (success) {
      toast.success("已移除工作");
    } else {
      toast.error("移除失敗");
    }
    setRemoveJobId(null);
  };

  const handleGenerate = async (jobId: string) => {
    setGeneratingJobId(jobId);

    try {
      const response = await fetch("/api/resume/customize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: id,
          jobApplicationId: jobId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("客製化履歷已生成");
        refresh();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失敗，請稍後再試");
    } finally {
      setGeneratingJobId(null);
    }
  };

  const handleExportPDF = async () => {
    if (!version) return;

    try {
      const response = await fetch("/api/resume/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: version.base_content,
          title: version.name,
        }),
      });

      if (!response.ok) throw new Error("匯出失敗");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${version.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF 已下載");
    } catch {
      toast.error("PDF 匯出失敗");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
          <Skeleton className="h-[500px]" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !version) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">載入失敗</p>
        <p className="text-muted-foreground mt-2">{error || "找不到此履歷版本"}</p>
        <Button className="mt-4" onClick={() => router.push("/resume")}>
          返回履歷列表
        </Button>
      </div>
    );
  }

  const linkedJobIds = new Set(
    version.version_job_resumes.map((vjr) => vjr.job_application_id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/resume")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{version.name}</h1>
            {version.target_role && (
              <p className="text-muted-foreground">{version.target_role}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/resume/${id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              編輯基礎履歷
            </Link>
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            匯出 PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        {/* 左側：基礎履歷預覽 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">基礎履歷預覽</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-[1/1.4] bg-muted rounded-lg overflow-hidden border">
                <div className="p-4 text-xs leading-relaxed overflow-hidden max-h-full">
                  {version.base_plain_text ? (
                    <pre className="whitespace-pre-wrap font-sans">
                      {version.base_plain_text.slice(0, 500)}
                      {version.base_plain_text.length > 500 && "..."}
                    </pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <p>尚未編輯履歷內容</p>
                      <Button size="sm" className="mt-2" asChild>
                        <Link href={`/resume/${id}/edit`}>開始編輯</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {version.base_ats_score !== null && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ATS 分數</span>
                  <span className="font-medium">{version.base_ats_score}</span>
                </div>
              )}

              {version.base_keywords.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">關鍵字</p>
                  <div className="flex flex-wrap gap-1">
                    {version.base_keywords.slice(0, 5).map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右側：關聯的工作 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">關聯的工作</h2>
              <p className="text-sm text-muted-foreground">
                {version.job_count} 個工作，{version.completed_count} 個已生成客製化履歷
              </p>
            </div>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  新增工作
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>選擇工作</SheetTitle>
                  <SheetDescription>
                    從求職追蹤中選擇工作，加入此履歷版本
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <JobSelector
                    onSelect={handleAddJob}
                    linkedJobIds={linkedJobIds}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {version.version_job_resumes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="font-medium">尚未加入任何工作</p>
                <p className="text-sm text-muted-foreground mt-1">
                  從求職追蹤中選擇工作，自動生成客製化履歷
                </p>
                <Button className="mt-4" onClick={() => setIsSheetOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  新增工作
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {version.version_job_resumes.map((vjr) => (
                <JobCard
                  key={vjr.id}
                  vjr={vjr}
                  versionId={id}
                  onGenerate={() => handleGenerate(vjr.job_application_id)}
                  onRemove={() => setRemoveJobId(vjr.job_application_id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 移除工作確認對話框 */}
      <AlertDialog
        open={!!removeJobId}
        onOpenChange={(open) => !open && setRemoveJobId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要移除這個工作嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              移除後，該工作的客製化履歷也會被刪除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveJob}>移除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
