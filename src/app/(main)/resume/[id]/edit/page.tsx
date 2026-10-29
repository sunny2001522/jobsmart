"use client";

import { useState, use, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ResumeEditor } from "@/components/resume-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Download, Sparkles, FileText, Loader2, Languages } from "lucide-react";
import { useResumeVersion } from "@/hooks";
import { localizedToast as toast } from "@/lib/i18n/toast";
import { resumeTextToDocument, tipTapToResumeText } from "@/lib/resume/ats-format";
import { getResumeLanguageLabel, inferResumeLanguageCode, RESUME_LANGUAGES } from "@/lib/resume/languages";
import type { ResumeLanguageVariant } from "@/lib/turso/types";

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
  const [baseLanguage, setBaseLanguage] = useState("zh-TW");
  const [activeLanguage, setActiveLanguage] = useState("zh-TW");
  const [languageVariants, setLanguageVariants] = useState<ResumeLanguageVariant[]>([]);
  const [newLanguage, setNewLanguage] = useState("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const contentRef = useRef<Record<string, unknown>>({});

  // 載入版本數據
  useEffect(() => {
    if (version) {
      setName(version.name);
      const primaryLanguage = version.base_language || inferResumeLanguageCode(version.base_plain_text);
      const selectedLanguage = version.active_language || primaryLanguage;
      const variants = version.language_variants || [];
      const selectedVariant = variants.find((variant) => variant.language_code === selectedLanguage);
      const initialContent = selectedLanguage === primaryLanguage
        ? version.base_content
        : selectedVariant?.content || version.base_content;
      setBaseLanguage(primaryLanguage);
      setActiveLanguage(selectedLanguage);
      setLanguageVariants(variants);
      setContent(initialContent);
      contentRef.current = initialContent;
      setAtsScore(version.base_ats_score);
      setKeywords(version.base_keywords);
    }
  }, [version]);

  const handleContentChange = useCallback((newContent: Record<string, unknown>) => {
    setContent(newContent);
    contentRef.current = newContent;
  }, []);

  const persistCurrentLanguage = async (nextActiveLanguage = activeLanguage, nextVariants = languageVariants) => {
    const exportContent = Object.keys(contentRef.current).length > 0 ? contentRef.current : content;
    const plainText = tipTapToResumeText(exportContent);
    const updatedVariants = nextActiveLanguage === baseLanguage
      ? nextVariants
      : [
          ...nextVariants.filter((variant) => variant.language_code !== nextActiveLanguage),
          { language_code: nextActiveLanguage, content: exportContent, plain_text: plainText, updated_at: new Date().toISOString() },
        ];
    const updates: Record<string, unknown> = {
      name,
      active_language: nextActiveLanguage,
      language_variants: updatedVariants,
      base_ats_score: atsScore,
      base_keywords: keywords,
    };
    if (nextActiveLanguage === baseLanguage) {
      updates.base_content = exportContent;
      updates.base_plain_text = plainText;
    }
    const updated = await updateVersion(updates as Parameters<typeof updateVersion>[0]);
    if (updated) setLanguageVariants(updatedVariants);
    return { updated, updatedVariants, exportContent, plainText };
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { updated } = await persistCurrentLanguage();
      if (updated) toast.success("履歷已儲存");
      else toast.error("儲存失敗");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === activeLanguage || !version) return;
    setIsSaving(true);
    try {
      const { updated, updatedVariants, exportContent } = await persistCurrentLanguage();
      if (!updated) {
        toast.error("儲存目前語言版本失敗");
        return;
      }
      const switched = await updateVersion({ active_language: languageCode });
      if (!switched) {
        toast.error("切換語言版本失敗");
        return;
      }
      const selectedContent = languageCode === baseLanguage
        ? (activeLanguage === baseLanguage ? exportContent : version.base_content)
        : updatedVariants.find((variant) => variant.language_code === languageCode)?.content;
      if (!selectedContent) return;
      setActiveLanguage(languageCode);
      setContent(selectedContent);
      contentRef.current = selectedContent;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLanguage = async () => {
    const targetLanguage = addableLanguages.find((language) => language.code === newLanguage)?.code ?? addableLanguages[0]?.code;
    if (!targetLanguage || !version) return;
    const existing = languageVariants.find((variant) => variant.language_code === targetLanguage);
    if (existing) {
      await handleLanguageChange(targetLanguage);
      return;
    }
    setIsTranslating(true);
    try {
      const currentContent = Object.keys(contentRef.current).length > 0 ? contentRef.current : content;
      const currentText = tipTapToResumeText(currentContent);
      const response = await fetch("/api/resume/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: currentText, targetLanguage }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "履歷翻譯失敗");
      const translatedText = String(result.data.text || "");
      const translatedContent = resumeTextToDocument(translatedText);
      const currentVariant: ResumeLanguageVariant = {
        language_code: activeLanguage,
        content: currentContent,
        plain_text: currentText,
        updated_at: new Date().toISOString(),
      };
      const translatedVariant: ResumeLanguageVariant = {
        language_code: targetLanguage,
        content: translatedContent,
        plain_text: translatedText,
        updated_at: new Date().toISOString(),
      };
      const nextVariants = [
        ...languageVariants.filter((variant) => variant.language_code !== activeLanguage && variant.language_code !== targetLanguage),
        ...(activeLanguage === baseLanguage ? [] : [currentVariant]),
        translatedVariant,
      ];
      const updates: Record<string, unknown> = {
        name,
        active_language: targetLanguage,
        language_variants: nextVariants,
        base_ats_score: atsScore,
        base_keywords: keywords,
      };
      if (activeLanguage === baseLanguage) {
        updates.base_content = currentContent;
        updates.base_plain_text = currentText;
      }
      const updated = await updateVersion(updates as Parameters<typeof updateVersion>[0]);
      if (!updated) throw new Error("無法儲存新語言版本");
      setLanguageVariants(nextVariants);
      setActiveLanguage(targetLanguage);
      setContent(translatedContent);
      contentRef.current = translatedContent;
      toast.success(`已新增${getResumeLanguageLabel(targetLanguage)}版本`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "履歷翻譯失敗");
    } finally {
      setIsTranslating(false);
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
          title: `${name} - ${getResumeLanguageLabel(activeLanguage)}`,
        }),
      });

      if (!response.ok) {
        throw new Error("匯出失敗");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}_${activeLanguage}.pdf`;
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

      const plainText = tipTapToResumeText(exportContent);

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

  const availableLanguages = [
    { code: baseLanguage, label: getResumeLanguageLabel(baseLanguage) },
    ...languageVariants.map((variant) => ({ code: variant.language_code, label: getResumeLanguageLabel(variant.language_code) })),
  ];
  const addableLanguages = RESUME_LANGUAGES.filter((language) =>
    !availableLanguages.some((available) => available.code === language.code)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
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
          <select
            aria-label="履歷語言版本"
            value={activeLanguage}
            onChange={(event) => void handleLanguageChange(event.target.value)}
            disabled={isSaving || isTranslating}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {availableLanguages.map((language) => (
              <option key={language.code} value={language.code}>{language.label}</option>
            ))}
          </select>
          {addableLanguages.length > 0 && (
            <div className="flex items-center gap-1">
              <select
                aria-label="新增語言"
                value={addableLanguages.some((language) => language.code === newLanguage) ? newLanguage : addableLanguages[0].code}
                onChange={(event) => setNewLanguage(event.target.value)}
                disabled={isSaving || isTranslating}
                className="h-9 max-w-32 rounded-md border bg-background px-2 text-sm"
              >
                {addableLanguages.map((language) => (
                  <option key={language.code} value={language.code}>{language.label}</option>
                ))}
              </select>
              <Button type="button" variant="outline" size="sm" onClick={handleAddLanguage} disabled={isSaving || isTranslating}>
                {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                <span className="ml-1">新增語言</span>
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleOptimize} disabled={isOptimizing || isTranslating || isSaving}>
            {isOptimizing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {isOptimizing ? "分析中..." : "AI 優化"}
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={isExporting || isTranslating || isSaving}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? "匯出中..." : "匯出 PDF"}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isTranslating}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "儲存中..." : "儲存"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Editor */}
        <ResumeEditor key={activeLanguage} content={content} onChange={handleContentChange} />

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
