"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Sparkles,
  Download,
  RefreshCw,
  FileText,
  Building2,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useResumeVersion, useVersionJobs } from "@/hooks";
import { localizedToast as toast } from "@/lib/i18n/toast";
import type { VersionJobResumeWithDetails } from "@/types";

interface ComparePageProps {
  params: Promise<{ id: string; jobId: string }>;
}

export default function ComparePage({ params }: ComparePageProps) {
  const { id: versionId, jobId } = use(params);
  const router = useRouter();

  const { version, isLoading: versionLoading } = useResumeVersion(versionId);
  const { jobs, isLoading: jobsLoading, refresh: refreshJobs } = useVersionJobs(versionId);

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<VersionJobResumeWithDetails | null>(null);

  // 找出當前工作
  useEffect(() => {
    if (jobs.length > 0) {
      const job = jobs.find((j) => j.job_application_id === jobId);
      if (job) {
        setCurrentJob(job);
      }
    }
  }, [jobs, jobId]);

  const isLoading = versionLoading || jobsLoading;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/resume/customize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId,
          jobApplicationId: jobId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("履歷客製化完成！");
        refreshJobs();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Generate error:", error);
      toast.error(error instanceof Error ? error.message : "生成失敗，請稍後再試");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!currentJob?.customized_plain_text) {
      toast.error("尚未生成客製化履歷");
      return;
    }

    try {
      const response = await fetch("/api/resume/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: currentJob.customized_plain_text,
          title: `${version?.name} - ${currentJob.job_application?.company_name}`,
        }),
      });

      if (!response.ok) throw new Error("匯出失敗");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${version?.name}_${currentJob.job_application?.company_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF 已下載");
    } catch (error) {
      console.error("PDF export error:", error);
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
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  if (!version || !currentJob) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">找不到資料</p>
        <Button className="mt-4" onClick={() => router.push(`/resume/${versionId}`)}>
          返回工作區
        </Button>
      </div>
    );
  }

  const jobApp = currentJob.job_application;
  const hasCustomized = !!currentJob.customized_plain_text;
  const generationStatus = currentJob.generation_status;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/resume/${versionId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {jobApp?.company_name} - {jobApp?.position}
            </h1>
            <p className="text-sm text-muted-foreground">
              基於「{version.name}」版本
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={isGenerating || generationStatus === "generating"}
          >
            {isGenerating || generationStatus === "generating" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : hasCustomized ? (
              <RefreshCw className="h-4 w-4 mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {isGenerating || generationStatus === "generating"
              ? "生成中..."
              : hasCustomized
              ? "重新生成"
              : "AI 客製化"}
          </Button>
          {hasCustomized && (
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              匯出 PDF
            </Button>
          )}
        </div>
      </div>

      {/* ATS Score Comparison */}
      {hasCustomized && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">ATS 分數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{currentJob.ats_score ?? "-"}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${currentJob.ats_score ?? 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                匹配關鍵字
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {currentJob.matched_keywords?.slice(0, 8).map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
                {(currentJob.matched_keywords?.length ?? 0) > 8 && (
                  <Badge variant="outline" className="text-xs">
                    +{(currentJob.matched_keywords?.length ?? 0) - 8}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                建議補充
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {currentJob.missing_keywords?.slice(0, 8).map((keyword) => (
                  <Badge key={keyword} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
                {(currentJob.missing_keywords?.length ?? 0) > 8 && (
                  <Badge variant="outline" className="text-xs">
                    +{(currentJob.missing_keywords?.length ?? 0) - 8}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dual Column Comparison */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Base Resume */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              基礎履歷
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <ScrollArea className="h-[500px] pr-4">
              {version.base_plain_text ? (
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {version.base_plain_text}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4 opacity-50" />
                  <p>尚未編輯基礎履歷</p>
                  <Button
                    variant="link"
                    onClick={() => router.push(`/resume/${versionId}/edit`)}
                  >
                    前往編輯
                  </Button>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: Customized Resume */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              客製化履歷
              {generationStatus === "completed" && (
                <Badge variant="secondary" className="ml-auto">
                  已生成
                </Badge>
              )}
              {generationStatus === "generating" && (
                <Badge variant="outline" className="ml-auto">
                  生成中...
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <ScrollArea className="h-[500px] pr-4">
              {currentJob.customized_plain_text ? (
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {currentJob.customized_plain_text}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <Sparkles className="h-12 w-12 mb-4 opacity-50" />
                  <p>尚未生成客製化履歷</p>
                  <p className="text-xs mt-1">
                    點擊「AI 客製化」根據職缺 JD 自動調整履歷
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* AI Suggestions */}
      {currentJob.ai_suggestions?.suggestions && currentJob.ai_suggestions.suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">AI 建議</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {currentJob.ai_suggestions.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-primary">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
