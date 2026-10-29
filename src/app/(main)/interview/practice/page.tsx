"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { RotateCcw, Send, Loader2, ArrowLeft, CheckCircle, AlertCircle, Lightbulb } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";
import { getInterviewQuestions } from "@/lib/turso/db";
import { getDefaultInterviewQuestions, isTextInInterviewLocale, type InterviewLocale } from "@/lib/interview/question-utils";

interface EvaluationResult {
  score: number;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  saved: boolean;
}

function PracticeContent() {
  const { locale } = useI18n();
  const en = locale === "en";
  const searchParams = useSearchParams();
  const questionLocale: InterviewLocale = en ? "en" : "zh-TW";
  const questionId = searchParams.get("q") || "1";
  const defaultQuestions = getDefaultInterviewQuestions(questionLocale);
  const [storedQuestion, setStoredQuestion] = useState<{ id: string; question: string } | null>(null);
  const [questionLoadError, setQuestionLoadError] = useState<string | null>(null);
  const displayedQuestion = defaultQuestions.find((question) => question.id === questionId) || storedQuestion;

  useEffect(() => {
    let active = true;
    setStoredQuestion(null);
    setQuestionLoadError(null);
    if (/^(10|[1-9])$/.test(questionId)) return () => { active = false; };
    getInterviewQuestions({ locale: questionLocale }).then((questions) => {
      if (!active) return;
      const question = questions.find((item) => item.id === questionId && isTextInInterviewLocale(item.question, questionLocale));
      if (question) setStoredQuestion({ id: question.id, question: question.question });
      else setQuestionLoadError(en ? "This question is not available in your question bank." : "題庫中找不到這個語言的題目");
    }).catch(() => {
      if (active) setQuestionLoadError(en ? "Could not load this question." : "無法載入這個題目");
    });
    return () => { active = false; };
  }, [questionId, questionLocale, en]);

  const [transcript, setTranscript] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEvaluate = async () => {
    if (!transcript.trim()) {
      setError(en ? "Record or enter an answer first." : "請先錄音或輸入回答內容");
      return;
    }

    setIsEvaluating(true);
    setError(null);

    try {
      const response = await fetch("/api/interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: displayedQuestion?.question || "",
          answer: transcript,
          questionId,
          locale: questionLocale,
          durationSeconds: null,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(en ? "Could not evaluate and save your answer. Please try again." : result.error);
      }

      setEvaluation(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : en ? "Scoring failed. Please try again." : "評分失敗");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleReset = () => {
    setTranscript("");
    setEvaluation(null);
    setError(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/interview">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {en ? "Back to question bank" : "返回題庫"}
          </Link>
        </Button>
      </div>

      {/* 問題卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>{en ? "Interview question" : "面試問題"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium">
            {displayedQuestion?.question || (en ? "Choose a question from the question bank." : "請從題庫選擇一個問題")}
          </p>
          {questionLoadError && <p className="mt-2 text-sm text-destructive">{questionLoadError}</p>}
        </CardContent>
      </Card>

      {/* 純文字回答區 */}
      <Card>
        <CardHeader>
          <CardTitle>{en ? "Your answer" : "你的回答"}</CardTitle>
          <CardDescription>{en ? "Write your answer in plain text." : "請使用純文字輸入回答"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={10}
            placeholder={en ? "Type your answer in plain text..." : "請以純文字輸入你的回答..."}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* 操作按鈕 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {en ? "Start over" : "重新開始"}
            </Button>
            <Button
              onClick={handleEvaluate}
              disabled={!transcript.trim() || !displayedQuestion || isEvaluating}
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {en ? "Scoring..." : "評分中..."}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {en ? "Get AI feedback" : "AI 評分"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 評分結果 */}
      {evaluation && (
        <Card>
          <CardHeader>
            <CardTitle>{en ? "AI feedback" : "AI 評分結果"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {evaluation.saved && (
              <p className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                {en ? "Answer saved to your question bank." : "回答已儲存到面試題庫。"}
              </p>
            )}
            {/* 分數 */}
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(evaluation.score)}`}>
                {evaluation.score}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{en ? "/ 100" : "/ 100 分"}</p>
              <Progress value={evaluation.score} className="mt-4" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* 優點 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">{en ? "Strengths" : "優點"}</span>
                </div>
                <ul className="space-y-1">
                  {evaluation.strengths.map((item, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 改進空間 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">{en ? "Areas to improve" : "改進空間"}</span>
                </div>
                <ul className="space-y-1">
                  {evaluation.improvements.map((item, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 建議 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600">
                  <Lightbulb className="h-4 w-4" />
                  <span className="font-medium">{en ? "Suggestions" : "建議"}</span>
                </div>
                <ul className="space-y-1">
                  {evaluation.suggestions.map((item, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <PracticeContent />
    </Suspense>
  );
}
