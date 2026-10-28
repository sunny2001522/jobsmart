"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Mic,
  Square,
  Pause,
  Play,
  RotateCcw,
  Send,
  Loader2,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import { useAudioRecorder, formatRecordingTime } from "@/hooks/use-audio-recorder";
import { useI18n } from "@/contexts/i18n-context";

// 預設問題
const defaultQuestions = [
  { id: "1", question: "請簡單自我介紹" },
  { id: "2", question: "為什麼想加入我們公司？" },
  { id: "3", question: "描述一個你克服困難的經歷" },
];
const englishQuestions = [
  { id: "1", question: "Tell me about yourself." },
  { id: "2", question: "Why do you want to join our company?" },
  { id: "3", question: "Describe a time you overcame a challenge." },
];

interface EvaluationResult {
  score: number;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
}

function PracticeContent() {
  const { locale } = useI18n();
  const en = locale === "en";
  const searchParams = useSearchParams();
  const questionId = searchParams.get("q");

  // 找到對應的問題
  const currentQuestion = questionId
    ? defaultQuestions.find((q) => q.id === questionId)
    : defaultQuestions[0];
  const displayedQuestion = en
    ? englishQuestions.find((question) => question.id === (currentQuestion?.id || "1")) || currentQuestion
    : currentQuestion;

  const {
    isRecording,
    isPaused,
    recordingTime,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    error: recordingError,
  } = useAudioRecorder();

  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"record" | "text">("record");

  const handleStopRecording = async () => {
    const audioBlob = await stopRecording();
    if (!audioBlob) return;

    setIsTranscribing(true);
    setError(null);

    try {
      // 上傳音訊並轉譯
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch("/api/interview/transcribe", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      setTranscript(result.data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : en ? "Transcription failed. Please try again." : "轉譯失敗");
    } finally {
      setIsTranscribing(false);
    }
  };

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
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      setEvaluation(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : en ? "Scoring failed. Please try again." : "評分失敗");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleReset = () => {
    cancelRecording();
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
          <Link href="/interview/questions">
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
        </CardContent>
      </Card>

      {/* 錄音/輸入區 */}
      <Card>
        <CardHeader>
          <CardTitle>{en ? "Your answer" : "你的回答"}</CardTitle>
          <CardDescription>
            {en ? "Record your answer or enter it as text." : "使用錄音或直接輸入文字回答"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 模式切換 */}
          <div className="flex gap-2">
            <Button
              variant={mode === "record" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("record")}
            >
              <Mic className="h-4 w-4 mr-2" />
              {en ? "Record" : "錄音模式"}
            </Button>
            <Button
              variant={mode === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("text")}
            >
              {en ? "Text" : "文字模式"}
            </Button>
          </div>

          {mode === "record" ? (
            <div className="space-y-4">
              {/* 錄音控制 */}
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                {isRecording && (
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold mb-2">
                      {formatRecordingTime(recordingTime)}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {isPaused ? (en ? "Paused" : "已暫停") : (en ? "Recording" : "錄音中")}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {!isRecording ? (
                    <Button
                      size="lg"
                      onClick={startRecording}
                      disabled={isTranscribing}
                      className="rounded-full h-16 w-16"
                    >
                      <Mic className="h-6 w-6" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={isPaused ? resumeRecording : pauseRecording}
                      >
                        {isPaused ? (
                          <Play className="h-4 w-4" />
                        ) : (
                          <Pause className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="lg"
                        variant="destructive"
                        onClick={handleStopRecording}
                        className="rounded-full h-16 w-16"
                      >
                        <Square className="h-6 w-6" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={cancelRecording}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                {recordingError && (
                  <p className="text-sm text-destructive">{recordingError}</p>
                )}

                {isTranscribing && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{en ? "Transcribing audio..." : "正在轉換語音..."}</span>
                  </div>
                )}
              </div>

              {/* 轉譯結果 */}
              {transcript && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{en ? "Transcript" : "轉譯結果"}</label>
                  <Textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={6}
                    placeholder={en ? "Your transcript will appear here..." : "轉譯的文字會顯示在這裡..."}
                  />
                </div>
              )}
            </div>
          ) : (
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              placeholder={en ? "Type your answer..." : "直接輸入你的回答..."}
            />
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* 操作按鈕 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {en ? "Start over" : "重新開始"}
            </Button>
            <Button
              onClick={handleEvaluate}
              disabled={!transcript.trim() || isEvaluating}
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
