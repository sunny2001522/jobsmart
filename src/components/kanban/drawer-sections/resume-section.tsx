"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { CoverLetterDraft, JobApplication, ResumeVersion, VersionJobResume } from "@/types";
import { useI18n } from "@/contexts/i18n-context";

interface ResumeSectionProps {
  application: JobApplication;
  resumeVersionId: string;
  sourceResume: ResumeVersion | null;
  sourceResumeName: string | null;
  tailoredResume: VersionJobResume | null;
  tailoredText: string;
  savingTailoredResume: boolean;
  onTailoredTextChange: (value: string) => void;
  onSaveTailoredResume: () => Promise<void>;
  onStrengthenResume: (answer: string) => Promise<void>;
  coverLetter?: CoverLetterDraft | null;
  isGeneratingTailored?: boolean;
}

function HighlightedResume({ baseText, tailoredText }: { baseText: string; tailoredText: string }) {
  const baseCounts = new Map<string, number>();
  for (const token of baseText.split(/\s+/).filter(Boolean)) {
    const key = token.toLocaleLowerCase();
    baseCounts.set(key, (baseCounts.get(key) || 0) + 1);
  }

  return (
    <div className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border bg-muted/20 p-3 text-xs leading-5">
      {tailoredText.split(/(\s+)/).map((token, index) => {
        if (!token.trim()) return <span key={index}>{token}</span>;
        const key = token.toLocaleLowerCase();
        const remaining = baseCounts.get(key) || 0;
        baseCounts.set(key, Math.max(0, remaining - 1));
        return remaining > 0
          ? <span key={index}>{token}</span>
          : <mark key={index} className="rounded-sm bg-amber-200/80 px-0.5 dark:bg-amber-500/30">{token}</mark>;
      })}
    </div>
  );
}

export function ResumeSection({
  application,
  resumeVersionId,
  sourceResume,
  sourceResumeName,
  tailoredResume,
  tailoredText,
  savingTailoredResume,
  onTailoredTextChange,
  onSaveTailoredResume,
  onStrengthenResume,
  coverLetter,
  isGeneratingTailored = false,
}: ResumeSectionProps) {
  const { locale } = useI18n();
  const isEnglish = locale === "en";
  const text = (zh: string, en: string) => isEnglish ? en : zh;
  const [answers, setAnswers] = useState(["", "", ""]);
  const [isStrengthening, setIsStrengthening] = useState(false);

  const beforeScore = sourceResume?.base_ats_score ?? null;
  const afterScore = tailoredResume?.ats_score ?? null;
  const previewText = tailoredText || sourceResume?.base_plain_text || "尚未有可預覽的履歷內容。";

  const handleStrengthen = async () => {
    const combinedAnswer = answers.map((answer, index) => answer.trim() ? `問題 ${index + 1}：${answer.trim()}` : "").filter(Boolean).join("\n\n");
    if (!combinedAnswer) return;
    setIsStrengthening(true);
    try {
      await onStrengthenResume(combinedAnswer);
      setAnswers(["", "", ""]);
    } finally {
      setIsStrengthening(false);
    }
  };

  if (!resumeVersionId) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
        {text("尚未選擇履歷版本，請先到 Resume 建立或選擇履歷。", "No resume version is selected. Create or choose one in Resume first.")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardHeader className="p-3 pb-1"><CardTitle className="text-xs font-normal text-muted-foreground">{text("修改前適配分數", "Before tailoring")}</CardTitle></CardHeader>
          <CardContent className="p-3 pt-1"><p className="text-2xl font-semibold">{isGeneratingTailored && beforeScore == null ? <Loader2 className="inline h-5 w-5 animate-spin" /> : beforeScore ?? "—"}<span className="text-sm font-normal text-muted-foreground"> / 100</span></p></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1"><CardTitle className="text-xs font-normal text-muted-foreground">{text("修改後適配分數", "After tailoring")}</CardTitle></CardHeader>
          <CardContent className="p-3 pt-1"><p className="text-2xl font-semibold text-primary">{isGeneratingTailored ? <Loader2 className="inline h-5 w-5 animate-spin" /> : afterScore ?? "—"}<span className="text-sm font-normal text-muted-foreground"> / 100</span></p></CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{sourceResumeName || "客製履歷"}</p>
          <p className="text-xs text-muted-foreground">{text("根據這份職缺的 JD 產生修改版本", "Tailored to this job description")}</p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/resume/${resumeVersionId}/job/${application.id}`}>
            <FileText className="mr-2 h-4 w-4" />{text("查看修改後履歷", "View tailored resume")}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="p-3 pb-2"><CardTitle className="text-sm">{text("履歷預覽與 JD 修改標記", "Resume preview and JD changes")}</CardTitle></CardHeader>
        <CardContent className="p-3 pt-0">
          {tailoredText && sourceResume?.base_plain_text && (
            <>
              <p className="mb-2 text-[11px] text-muted-foreground">{text("黃色底色＝根據 JD 新增或調整的文字", "Yellow highlight = text added or adjusted for this JD")}</p>
              <HighlightedResume baseText={sourceResume.base_plain_text} tailoredText={tailoredText} />
            </>
          )}
          <Textarea aria-label={text("可編輯客製履歷", "Editable tailored resume")} value={previewText} onChange={(event) => onTailoredTextChange(event.target.value)} rows={12} className="mt-3 resize-y text-xs leading-5" />
        </CardContent>
      </Card>

      {tailoredResume?.missing_keywords?.length ? (
        <p className="text-xs text-muted-foreground">{text("尚未涵蓋的 JD 關鍵字：", "Missing JD keywords: ")}{tailoredResume.missing_keywords.join(", ")}</p>
      ) : null}

      {coverLetter ? (
        <Card>
          <CardHeader className="p-3 pb-2"><CardTitle className="text-sm">{text("Cover letter", "Cover letter")}</CardTitle></CardHeader>
          <CardContent className="space-y-2 p-3 pt-0">
            <p className="text-xs text-muted-foreground">{coverLetter.subject}</p>
            <Textarea aria-label="Cover letter" value={coverLetter.body} readOnly rows={9} className="resize-y text-xs leading-5" />
            <p className="text-xs text-muted-foreground">{coverLetter.attachmentNote}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="p-3 pb-2"><CardTitle className="text-sm">{text("延伸問題：補充真實經驗", "Follow-up questions")}</CardTitle></CardHeader>
        <CardContent className="space-y-3 p-3 pt-0">
          {["你有哪些與這份 JD 最相關的成果？", "你是否使用過 JD 提到的工具或方法？請描述實際情境。", "還有哪項經驗可以證明你適合這個職位？"].map((question, index) => (
            <div key={question} className="space-y-1.5">
              <label className="text-xs font-medium">{text(question, ["What result from your experience is most relevant to this JD?", "Have you used any tools or methods mentioned in the JD? Describe the real context.", "What other experience proves you are a fit for this role?"][index])}</label>
              <Textarea value={answers[index]} onChange={(event) => setAnswers((current) => current.map((answer, answerIndex) => answerIndex === index ? event.target.value : answer))} rows={3} placeholder={text("請只填寫真實經驗與可佐證的成果", "Only include real, verifiable experience")} />
            </div>
          ))}
          <Button variant="secondary" className="w-full" disabled={!answers.some((answer) => answer.trim()) || isStrengthening} onClick={() => void handleStrengthen()}>
            {isStrengthening ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isStrengthening ? text("重新生成中", "Regenerating") : text("提交回答並重新生成履歷", "Submit answers and regenerate")}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" disabled={!tailoredResume || savingTailoredResume || tailoredText === tailoredResume?.customized_plain_text} onClick={onSaveTailoredResume}>
          {savingTailoredResume ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {savingTailoredResume ? text("儲存中", "Saving") : text("儲存履歷修改", "Save resume edits")}
        </Button>
      </div>

    </div>
  );
}
