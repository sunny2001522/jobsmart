"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { ResumeEditor } from "@/components/resume-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Download, Sparkles, FileText } from "lucide-react";

interface ResumeEditPageProps {
  params: Promise<{ id: string }>;
}

export default function ResumeEditPage({ params }: ResumeEditPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "new";

  const [title, setTitle] = useState(isNew ? "我的履歷" : "軟體工程師履歷");
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [atsScore] = useState<number | null>(isNew ? null : 78);
  const [keywords] = useState<string[]>(
    isNew ? [] : ["React", "TypeScript", "Next.js", "Node.js"]
  );

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Save to Supabase
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export using Puppeteer
    alert("PDF 匯出功能開發中...");
  };

  const handleOptimize = () => {
    // TODO: Call AI optimization API
    alert("AI 優化功能開發中...");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/resume")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-bold border-none shadow-none focus-visible:ring-0 w-auto"
            placeholder="履歷標題"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleOptimize}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI 優化
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            匯出 PDF
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "儲存中..." : "儲存"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Editor */}
        <ResumeEditor content={content} onChange={setContent} />

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
                  儲存後將自動分析 ATS 分數
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
              <p>✅ 使用強動詞開頭（領導、開發、優化...）</p>
              <p>✅ 量化成果（提升 30% 效率）</p>
              <p>✅ 針對目標職位調整關鍵字</p>
              <p>✅ 保持格式簡潔，避免花俏設計</p>
              <p>✅ 一頁最佳，最多兩頁</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
