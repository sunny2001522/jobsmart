"use client";

import { useState, use, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ResumeEditor } from "@/components/resume-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Download, Sparkles, FileText, Loader2 } from "lucide-react";
import { useResumeVersion } from "@/hooks";
import { toast } from "sonner";

interface ResumeEditPageProps {
  params: Promise<{ id: string }>;
}

export default function ResumeEditPage({ params }: ResumeEditPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { version, isLoading, updateVersion } = useResumeVersion(id);

  const [name, setName] = useState("");
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const contentRef = useRef<Record<string, unknown>>({});

  // 載入版本數據
  useEffect(() => {
    if (version) {
      setName(version.name);
      setContent(version.base_content);
      contentRef.current = version.base_content;
      setAtsScore(version.base_ats_score);
      setKeywords(version.base_keywords);
    }
  }, [version]);

  const handleContentChange = useCallback((newContent: Record<string, unknown>) => {
    setContent(newContent);
    contentRef.current = newContent;
  }, []);

  // 將 TipTap JSON 轉換為純文字
  const extractText = (node: Record<string, unknown>): string => {
    if (node.text) return node.text as string;
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractText).join("");
    }
    return "";
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const exportContent = Object.keys(contentRef.current).length > 0
        ? contentRef.current
        : content;

      const plainText = extractText(exportContent);

      const updated = await updateVersion({
        name,
        base_content: exportContent,
        base_plain_text: plainText,
        base_ats_score: atsScore,
        base_keywords: keywords,
      });

      if (updated) {
        toast.success("履歷已儲存");
      } else {
        toast.error("儲存失敗");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const exportContent = Object.keys(contentRef.current).length > 0
        ? contentRef.current
        : content;

      const response = await fetch("/api/resume/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: exportContent,
          title: name,
        }),
      });

      if (!response.ok) {
        throw new Error("匯出失敗");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF 已下載");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("PDF 匯出失敗，請稍後再試");
    } finally {
      setIsExporting(false);
    }
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const exportContent = Object.keys(contentRef.current).length > 0
        ? contentRef.current
        : content;

      const plainText = extractText(exportContent);

      const response = await fetch("/api/resume/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: plainText,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAtsScore(data.data.atsScore);
        setKeywords(data.data.keywords);
        toast.success("AI 分析完成");
        if (data.data.suggestions?.length > 0) {
          toast.info(`優化建議：${data.data.suggestions[0]}`);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Optimize error:", error);
      toast.error("AI 優化失敗，請稍後再試");
    } finally {
      setIsOptimizing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <Skeleton className="h-[600px]" />
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-24" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!version) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">找不到此履歷版本</p>
        <Button className="mt-4" onClick={() => router.push("/resume")}>
          返回履歷列表
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/resume/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回工作區
          </Button>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-xl font-bold border-none shadow-none focus-visible:ring-0 w-auto"
            placeholder="版本名稱"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleOptimize} disabled={isOptimizing}>
            {isOptimizing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {isOptimizing ? "分析中..." : "AI 優化"}
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? "匯出中..." : "匯出 PDF"}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "儲存中..." : "儲存"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Editor */}
        <ResumeEditor content={content} onChange={handleContentChange} />

        {/* Sidebar */}
        <div className="space-y-4">
          {/* ATS Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                ATS 分數
              </CardTitle>
            </CardHeader>
            <CardContent>
              {atsScore !== null ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">{atsScore}</span>
                    <span className="text-sm text-muted-foreground">/ 100</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${atsScore}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {atsScore >= 80
                      ? "很好！你的履歷對 ATS 很友善"
                      : atsScore >= 60
                      ? "還不錯，但還有改善空間"
                      : "建議使用 AI 優化來提高分數"}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  點擊「AI 優化」分析 ATS 分數
                </p>
              )}
            </CardContent>
          </Card>

          {/* Keywords */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">關鍵字</CardTitle>
            </CardHeader>
            <CardContent>
              {keywords.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  尚未偵測到關鍵字
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">寫履歷小技巧</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>使用強動詞開頭（領導、開發、優化...）</p>
              <p>量化成果（提升 30% 效率）</p>
              <p>針對目標職位調整關鍵字</p>
              <p>保持格式簡潔，避免花俏設計</p>
              <p>一頁最佳，最多兩頁</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
