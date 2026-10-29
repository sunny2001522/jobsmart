"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useResumeVersions } from "@/hooks";
import { FileUp, Link2, Loader2, PenLine, Upload } from "lucide-react";
import { localizedToast as toast } from "@/lib/i18n/toast";
import { useI18n } from "@/contexts/i18n-context";

interface AddVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 預設的空白履歷模板
const DEFAULT_RESUME_TEMPLATE = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1, textAlign: "center" },
      content: [{ type: "text", text: "你的名字" }],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [{ type: "text", text: "email@example.com | 0912-345-678 | 台北市" }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "個人簡介" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "在此撰寫 2-3 句話的專業摘要，強調你的核心能力和職涯目標。",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "工作經歷" }],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "職位名稱 | 公司名稱" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "2022/01 - 至今 | 台北" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "描述你的工作內容和成就，使用數據量化成果" }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "使用強動詞開頭：領導、開發、優化、提升..." }],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "學歷" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "學校名稱 | 科系 | 2018-2022" }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "技能" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "程式語言：JavaScript, TypeScript, Python" }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "框架：React, Next.js, Node.js" }],
            },
          ],
        },
      ],
    },
  ],
};

export function AddVersionDialog({ open, onOpenChange }: AddVersionDialogProps) {
  const router = useRouter();
  const { addVersion } = useResumeVersions();
  const { locale } = useI18n();
  const isEnglish = locale === "en";

  const copy = isEnglish
    ? {
        title: "Add or import resume",
        description: "Paste, upload, or provide a URL. JobSmart preserves the resume's original language and applies a clean ATS layout.",
        name: "Version name (optional)",
        namePlaceholder: "e.g. Frontend Engineer version",
        source: "Resume source",
        paste: "Paste text",
        file: "PDF / text file",
        url: "Resume URL",
        blank: "Blank template",
        textPlaceholder: "Paste your resume text. AI will organize it in the same language using a standard ATS layout...",
        fileHint: "PDF, TXT, and Markdown are supported. The file is only used for parsing.",
        role: "Target role",
        rolePlaceholder: "e.g. Frontend Engineer",
        descriptionLabel: "Description",
        descriptionPlaceholder: "Briefly describe this version's purpose...",
        cancel: "Cancel",
        submit: "Create and edit",
        importError: "Resume import failed",
      }
    : {
        title: "新增或匯入履歷",
        description: "貼上、上傳或提供連結，JobSmart 會保留原語言並整理成標準 ATS 單欄履歷",
        name: "版本名稱（可自動命名）",
        namePlaceholder: "例如：前端工程師版、設計師版",
        source: "履歷來源",
        paste: "貼上文字",
        file: "PDF／文字檔",
        url: "履歷連結",
        blank: "空白模板",
        textPlaceholder: "貼上履歷文字，AI 會保留原語言並整理成標準 ATS 排版...",
        fileHint: "支援 PDF、TXT、Markdown，檔案只用於解析",
        role: "目標職位",
        rolePlaceholder: "例如：Frontend Engineer",
        descriptionLabel: "描述",
        descriptionPlaceholder: "簡短描述這個版本的用途...",
        cancel: "取消",
        submit: "建立並編輯",
        importError: "履歷匯入失敗",
      };

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [source, setSource] = useState<"blank" | "url" | "text" | "file">("text");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() && source === "blank") return;

    setIsSubmitting(true);
    try {
      let imported = { name: "", plainText: "", languageCode: "zh-TW", content: DEFAULT_RESUME_TEMPLATE };
      if (source !== "blank") {
        const form = new FormData();
        form.set("source", source === "url" ? "url" : source === "file" ? "file" : "text");
        if (source === "url") {
          const normalizedUrl = /^https?:\/\//i.test(sourceUrl.trim()) ? sourceUrl.trim() : `https://${sourceUrl.trim()}`;
          form.set("url", normalizedUrl);
        }
        if (source === "text") form.set("text", sourceText);
        if (source === "file" && sourceFile) form.set("file", sourceFile);
        const response = await fetch("/api/resume/import", { method: "POST", body: form });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "履歷解析失敗");
        imported = result.data;
      }
      const newVersion = await addVersion({
        name: name.trim() || imported.name || "我的履歷",
        description: description.trim() || null,
        target_role: targetRole.trim() || null,
        base_content: imported.content,
        base_plain_text: imported.plainText || null,
        base_language: imported.languageCode,
        active_language: imported.languageCode,
        language_variants: [],
        base_ats_score: null,
        base_keywords: [],
        is_active: true,
        display_order: 0,
        category_id: null,
      });

      if (newVersion) {
        onOpenChange(false);
        // 重置表單
        setName("");
        setDescription("");
        setTargetRole("");
        setSource("text");
        setSourceUrl("");
        setSourceText("");
        setSourceFile(null);
        // 導航到編輯頁面
        router.push(`/resume/${newVersion.id}/edit`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "";
      const localizedError = isEnglish
        ? ({
            "請輸入有效的公開履歷連結": "Enter a valid public resume URL",
            "無法讀取這個連結，請確認它是公開頁面或改用貼上文字": "We couldn't read this URL. Make sure it is public or paste the resume text instead.",
            "請選擇 PDF、TXT 或 Markdown 檔案": "Choose a PDF, TXT, or Markdown file",
            "找不到足夠的履歷文字，請改用公開連結、PDF 或貼上完整內容": "Not enough resume text was found. Use a public URL, PDF, or paste the complete content.",
          } as Record<string, string>)[errorMessage] || errorMessage
        : errorMessage;
      toast.error(localizedError || copy.importError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{copy.name}</Label>
              <Input
                id="name"
                placeholder={copy.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>{copy.source}</Label>
              <div className="grid min-w-0 grid-cols-1 gap-2 min-[480px]:grid-cols-2">
                {([["text", copy.paste, PenLine], ["file", copy.file, Upload], ["url", copy.url, Link2], ["blank", copy.blank, FileUp]] as const).map(([value, label, Icon]) => (
                  <Button key={value} type="button" variant={source === value ? "default" : "outline"} className="h-auto min-h-9 min-w-0 justify-start whitespace-normal break-words px-3 py-2 text-left text-xs" onClick={() => setSource(value)}>
                    <Icon className="mr-1.5 h-3.5 w-3.5 shrink-0" />{label}
                  </Button>
                ))}
              </div>
            </div>

            {source === "url" && (
              <Input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                onBlur={() => {
                  const value = sourceUrl.trim();
                  if (value && !/^https?:\/\//i.test(value)) setSourceUrl(`https://${value}`);
                }}
                placeholder="https://www.linkedin.com/in/your-name"
                type="text"
                inputMode="url"
                autoComplete="url"
              />
            )}
            {source === "text" && <Textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder={copy.textPlaceholder} rows={6} />}
            {source === "file" && <div className="rounded-lg border border-dashed p-4 text-center"><Input type="file" accept=".pdf,.txt,.md,text/plain,application/pdf" onChange={(e) => setSourceFile(e.target.files?.[0] || null)} /><p className="mt-2 text-xs text-muted-foreground">{copy.fileHint}</p></div>}

            <div className="grid gap-2">
              <Label htmlFor="targetRole">{copy.role}</Label>
              <Input
                id="targetRole"
                placeholder={copy.rolePlaceholder}
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{copy.descriptionLabel}</Label>
              <Textarea
                id="description"
                placeholder={copy.descriptionPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {copy.cancel}
            </Button>
            <Button type="submit" disabled={(!name.trim() && source === "blank") || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {copy.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
