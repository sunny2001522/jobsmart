"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText, Loader2, MessageCircleQuestion, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { JobApplication, ResumeVersion, VersionJobResume } from "@/types";
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
}: ResumeSectionProps) {
  const { locale } = useI18n();
  const isEnglish = locale === "en";
  const text = (zh: string, en: string) => isEnglish ? en : zh;
  const [questionOpen, setQuestionOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [isStrengthening, setIsStrengthening] = useState(false);

  const beforeScore = sourceResume?.base_ats_score ?? null;
  const afterScore = tailoredResume?.ats_score ?? null;
  const previewText = tailoredText || sourceResume?.base_plain_text || "尚未有可預覽的履歷內容。";

  const handleStrengthen = async () => {
    if (!answer.trim()) return;
    setIsStrengthening(true);
    try {
      await onStrengthenResume(answer.trim());
      setAnswer("");
      setQuestionOpen(false);
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
          <CardContent className="p-3 pt-1"><p className="text-2xl font-semibold">{beforeScore ?? "—"}<span className="text-sm font-normal text-muted-foreground"> / 100</span></p></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1"><CardTitle className="text-xs font-normal text-muted-foreground">{text("修改後適配分數", "After tailoring")}</CardTitle></CardHeader>
          <CardContent className="p-3 pt-1"><p className="text-2xl font-semibold text-primary">{afterScore ?? "—"}<span className="text-sm font-normal text-muted-foreground"> / 100</span></p></CardContent>
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
        <CardHeader className="p-3 pb-2"><CardTitle className="text-sm">{text("履歷預覽", "Resume preview")}</CardTitle></CardHeader>
        <CardContent className="p-3 pt-0">
          <Textarea aria-label={text("履歷預覽", "Resume preview")} value={previewText} onChange={(event) => onTailoredTextChange(event.target.value)} rows={12} className="resize-y text-xs leading-5" />
        </CardContent>
      </Card>

      {tailoredResume?.missing_keywords?.length ? (
        <p className="text-xs text-muted-foreground">{text("尚未涵蓋的 JD 關鍵字：", "Missing JD keywords: ")}{tailoredResume.missing_keywords.join(", ")}</p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" onClick={() => setQuestionOpen(true)}>
          <MessageCircleQuestion className="mr-2 h-4 w-4" />{text("回答問題來加強履歷", "Answer questions to improve resume")}
        </Button>
        <Button variant="outline" disabled={!tailoredResume || savingTailoredResume || tailoredText === tailoredResume?.customized_plain_text} onClick={onSaveTailoredResume}>
          {savingTailoredResume ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {savingTailoredResume ? text("儲存中", "Saving") : text("儲存履歷修改", "Save resume edits")}
        </Button>
      </div>

      <Dialog open={questionOpen} onOpenChange={setQuestionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{text("回答問題來加強履歷", "Answer questions to improve your resume")}</DialogTitle>
            <DialogDescription>{text("補充與這份職缺相關、但目前履歷沒有寫清楚的實際經驗。回答後會重新產生客製履歷與適配分數。", "Add real experience related to this role that your resume does not explain clearly. Your tailored resume and fit score will be regenerated.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">{text(`你是否有能證明自己符合「${application.position}」需求的具體成果或案例？`, `What specific result or example proves you can meet the needs of “${application.position}”?`)}</p>
            <Textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={7} placeholder={text("例如：你做了什麼、使用哪些工具、產生什麼可量化結果？", "For example: what did you do, which tools did you use, and what measurable result did you achieve?")} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionOpen(false)}>{text("取消", "Cancel")}</Button>
            <Button disabled={!answer.trim() || isStrengthening} onClick={handleStrengthen}>
              {isStrengthening && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isStrengthening ? text("重新整理中", "Regenerating") : text("更新履歷", "Update resume")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
