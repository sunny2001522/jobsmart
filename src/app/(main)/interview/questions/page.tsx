"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Bookmark, ChevronDown, MessageSquareText } from "lucide-react";
import { createInterviewQuestion, getInterviewAnswers, getInterviewQuestions } from "@/lib/turso/db";
import type { InterviewAnswer } from "@/lib/turso/types";
import { useI18n } from "@/contexts/i18n-context";
import { localizedToast as toast } from "@/lib/i18n/toast";
import { containsCjk, getDefaultInterviewQuestions, isTextInInterviewLocale, type InterviewLocale } from "@/lib/interview/question-utils";

type QuestionCategory =
  | "behavioral"
  | "technical"
  | "situational"
  | "self_introduction"
  | "other";

interface InterviewQuestion {
  id: string;
  question: string;
  category: QuestionCategory;
  difficulty: "easy" | "medium" | "hard";
  isBookmarked: boolean;
  company_name?: string | null;
  origin?: "company_review" | "resume_followup" | "custom" | "default";
  evidence?: Array<{ reviewId: string; quote: string }>;
  source_urls?: string[];
}

const categoryLabels: Record<QuestionCategory, { zh: string; en: string }> = {
  behavioral: { zh: "行為問題", en: "Behavioral" },
  technical: { zh: "技術問題", en: "Technical" },
  situational: { zh: "情境問題", en: "Situational" },
  self_introduction: { zh: "自我介紹", en: "Self introduction" },
  other: { zh: "其他", en: "Other" },
};

const difficultyLabels = { easy: { zh: "簡單", en: "Easy" }, medium: { zh: "中等", en: "Medium" }, hard: { zh: "困難", en: "Hard" } };

export default function QuestionsPage() {
  const { locale } = useI18n();
  const en = locale === "en";
  const questionLocale = (en ? "en" : "zh-TW") as InterviewLocale;
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [answersByQuestion, setAnswersByQuestion] = useState<Record<string, InterviewAnswer | null>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    category: "behavioral" as QuestionCategory,
    difficulty: "medium" as "easy" | "medium" | "hard",
  });

  useEffect(() => {
    let active = true;
    const defaults: InterviewQuestion[] = getDefaultInterviewQuestions(questionLocale).map((item) => ({
      ...item,
      isBookmarked: false,
    }));
    setQuestions(defaults);
    getInterviewQuestions({ locale: questionLocale }).then((stored) => {
      if (!active) return;
      const imported = (stored ?? []).filter((item) => isTextInInterviewLocale(item.question, questionLocale)).map((item) => ({
        id: item.id,
        question: item.question,
        category: (["behavioral", "technical", "situational", "self_introduction", "other"] as string[]).includes(item.category || "")
          ? item.category as QuestionCategory
          : "other" as QuestionCategory,
        difficulty: (item.difficulty === "easy" || item.difficulty === "hard" ? item.difficulty : "medium") as "easy" | "medium" | "hard",
        isBookmarked: false,
        company_name: item.company_name,
        origin: item.origin,
        evidence: item.evidence,
        source_urls: item.source_urls,
      }));
      setQuestions((current) => {
        const existing = new Set(current.map((question) => question.question.trim().toLocaleLowerCase()));
        const importedUnique = imported.filter((question) => {
          const key = question.question.trim().toLocaleLowerCase();
          if (existing.has(key)) return false;
          existing.add(key);
          return true;
        });
        return [...importedUnique, ...current];
      });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [questionLocale]);

  useEffect(() => {
    let active = true;
    getInterviewAnswers()
      .then((answers) => {
        if (!active) return;
        const latestByQuestion: Record<string, InterviewAnswer> = {};
        for (const answer of answers ?? []) {
          if (en && containsCjk(answer.transcript)) continue;
          const current = latestByQuestion[answer.question_id];
          if (!current || new Date(answer.created_at).getTime() > new Date(current.created_at).getTime()) {
            latestByQuestion[answer.question_id] = answer;
          }
        }
        setAnswersByQuestion(latestByQuestion);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [en]);

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || q.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddQuestion = async () => {
    const questionText = newQuestion.question.trim();
    if (!questionText) return;
    if (!isTextInInterviewLocale(questionText, questionLocale)) {
      toast.error(en ? "Enter the question in English to match the current language." : "請使用目前介面語言輸入題目");
      return;
    }
    try {
      const saved = await createInterviewQuestion({
        question: questionText,
        category: newQuestion.category,
        difficulty: newQuestion.difficulty,
        company_id: null,
        is_public: false,
        locale: questionLocale,
        origin: "custom",
      });
      if (!saved) throw new Error("Question was not saved");
      setQuestions((current) => [{
        id: saved.id,
        question: saved.question,
        category: (saved.category || "other") as QuestionCategory,
        difficulty: (saved.difficulty || "medium") as "easy" | "medium" | "hard",
        isBookmarked: false,
        company_name: saved.company_name,
        origin: saved.origin,
        evidence: saved.evidence,
        source_urls: saved.source_urls,
      }, ...current]);
      setNewQuestion({ question: "", category: "behavioral", difficulty: "medium" });
      setIsAddDialogOpen(false);
    } catch {
      toast.error(en ? "Could not save the question. Please try again." : "題目儲存失敗，請稍後再試");
    }
  };

  const toggleBookmark = (id: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === id ? { ...q, isBookmarked: !q.isBookmarked } : q
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{en ? "Question bank" : "面試題庫"}</h1>
          <p className="text-muted-foreground">{en ? "Browse and practice common interview questions" : "瀏覽和練習常見面試題目"}</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {en ? "Add question" : "新增題目"}
        </Button>
      </div>

      {/* 搜尋和篩選 */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={en ? "Search questions..." : "搜尋題目..."}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={en ? "Choose a category" : "選擇類別"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{en ? "All categories" : "全部類別"}</SelectItem>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label[en ? "en" : "zh"]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 題目列表 */}
      <Tabs defaultValue="all">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="all" className="min-w-0 flex-1 px-3 sm:flex-none sm:px-4">{en ? "All" : "全部"} ({questions.length})</TabsTrigger>
          <TabsTrigger value="bookmarked" className="min-w-0 flex-1 px-3 sm:flex-none sm:px-4">
            {en ? "Bookmarked" : "已收藏"} ({questions.filter((q) => q.isBookmarked).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="space-y-3">
            {filteredQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onToggleBookmark={toggleBookmark}
                locale={locale}
                savedAnswer={answersByQuestion[question.id] ?? null}
                onAnswerSaved={(answer) => setAnswersByQuestion((current) => ({ ...current, [question.id]: answer }))}
              />
            ))}
            {filteredQuestions.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <p>{en ? "No questions match your filters" : "找不到符合條件的題目"}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="bookmarked" className="mt-4">
          <div className="space-y-3">
            {questions
              .filter((q) => q.isBookmarked)
              .map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  onToggleBookmark={toggleBookmark}
                  locale={locale}
                  savedAnswer={answersByQuestion[question.id] ?? null}
                  onAnswerSaved={(answer) => setAnswersByQuestion((current) => ({ ...current, [question.id]: answer }))}
                />
              ))}
            {questions.filter((q) => q.isBookmarked).length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <p>{en ? "No bookmarked questions yet" : "還沒有收藏任何題目"}</p>
                  <p className="text-sm mt-1">{en ? "Select the bookmark icon to save a question" : "點擊書籤圖示收藏題目"}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 新增題目對話框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{en ? "Add interview question" : "新增面試題目"}</DialogTitle>
            <DialogDescription>{en ? "Add a custom question to your question bank" : "新增一個自訂的面試題目到題庫"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question">{en ? "Question" : "題目內容"}</Label>
              <Textarea
                id="question"
                placeholder={en ? "Enter an interview question..." : "輸入面試題目..."}
                value={newQuestion.question}
                onChange={(e) =>
                  setNewQuestion({ ...newQuestion, question: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{en ? "Category" : "類別"}</Label>
                <Select
                  value={newQuestion.category}
                  onValueChange={(value) =>
                    setNewQuestion({
                      ...newQuestion,
                      category: value as QuestionCategory,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label[en ? "en" : "zh"]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{en ? "Difficulty" : "難度"}</Label>
                <Select
                  value={newQuestion.difficulty}
                  onValueChange={(value) =>
                    setNewQuestion({
                      ...newQuestion,
                      difficulty: value as "easy" | "medium" | "hard",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(difficultyLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label[en ? "en" : "zh"]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {en ? "Cancel" : "取消"}
            </Button>
            <Button onClick={handleAddQuestion}>{en ? "Add" : "新增"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuestionCard({
  question,
  onToggleBookmark,
  locale,
  savedAnswer,
  onAnswerSaved,
}: {
  question: InterviewQuestion;
  onToggleBookmark: (id: string) => void;
  locale: "en" | "zh-TW";
  savedAnswer: InterviewAnswer | null;
  onAnswerSaved: (answer: InterviewAnswer) => void;
}) {
  const en = locale === "en";
  const [isExpanded, setIsExpanded] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);

  const saveAnswer = async () => {
    if (answerText.trim().length < 20) {
      setAnswerError(en ? "Please write at least 20 characters." : "請至少輸入 20 個字元。" );
      return;
    }
    setIsSavingAnswer(true);
    setAnswerError(null);
    try {
      const response = await fetch("/api/interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.question,
          answer: answerText,
          questionId: question.id,
          locale,
          durationSeconds: null,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || (en ? "Could not save your answer." : "回答儲存失敗"));
      const answers = await getInterviewAnswers(question.id);
      const latest = answers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      if (latest) onAnswerSaved(latest);
    } catch (error) {
      setAnswerError(error instanceof Error ? error.message : (en ? "Could not save your answer." : "回答儲存失敗"));
    } finally {
      setIsSavingAnswer(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="font-medium">{question.question}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">{categoryLabels[question.category][en ? "en" : "zh"]}</Badge>
              <Badge
                variant="outline"
                className={
                  question.difficulty === "easy"
                    ? "text-green-600"
                    : question.difficulty === "medium"
                    ? "text-yellow-600"
                    : "text-red-600"
                }
              >
                {difficultyLabels[question.difficulty][en ? "en" : "zh"]}
              </Badge>
              {question.company_name && <Badge variant="outline">{en && containsCjk(question.company_name) ? ("Company interview" as const) : question.company_name}</Badge>}
              {question.origin === "company_review" && <Badge variant="outline">{en ? "From interview reviews" : "來自面試評論"}</Badge>}
              {question.origin === "resume_followup" && <Badge variant="outline">{en ? "Resume follow-up" : "履歷追問"}</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleBookmark(question.id)}
            >
              <Bookmark
                className={`h-4 w-4 ${
                  question.isBookmarked ? "fill-primary text-primary" : ""
                }`}
              />
            </Button>
          </div>
        </div>
        <button
          type="button"
          className="mt-4 flex w-full items-center justify-between border-t pt-3 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          <span className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4" />
            {savedAnswer
              ? (en ? "View saved answer" : "查看已儲存回答")
              : (en ? "View answer area" : "查看回答區")}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </button>
        {isExpanded && question.evidence?.length ? (
          <div className="mt-3 space-y-2 border-t pt-3">
            <p className="text-sm font-medium">{en ? "Review evidence" : "評論依據"}</p>
            {question.evidence.map((item, index) => (
              <blockquote key={`${item.reviewId}-${index}`} className="border-l-2 pl-3 text-sm text-muted-foreground">
                {en && containsCjk(item.quote)
                  ? "The source quote is in its original language. Use the source link below to review it."
                  : `“${item.quote}”`}
              </blockquote>
            ))}
            {question.source_urls?.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="block break-all text-xs text-primary underline">
                {url}
              </a>
            ))}
          </div>
        ) : null}
        {isExpanded && (
          <div className="mt-3 rounded-md bg-muted/50 p-4">
            {savedAnswer ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{en ? "Your saved answer" : "你的已儲存回答"}</p>
                  {savedAnswer.ai_score !== null && (
                    <Badge variant="outline">
                      {en ? "Score" : "分數"}: {savedAnswer.ai_score}/100
                    </Badge>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6">{savedAnswer.transcript}</p>
                <p className="text-xs text-muted-foreground">
                  {en ? "Saved " : "儲存於 "}{new Date(savedAnswer.created_at).toLocaleString(en ? "en-US" : "zh-TW")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {en ? "You have not saved an answer for this question yet." : "這題目前還沒有儲存的回答。"}
                </p>
                <Textarea
                  value={answerText}
                  onChange={(event) => setAnswerText(event.target.value)}
                  rows={7}
                  placeholder={en ? "Type your answer in plain text..." : "請以純文字輸入你的回答..."}
                />
                {answerError && <p className="text-sm text-destructive">{answerError}</p>}
                <div className="flex justify-end">
                  <Button type="button" onClick={saveAnswer} disabled={isSavingAnswer || !answerText.trim()}>
                    {isSavingAnswer ? (en ? "Saving and scoring..." : "儲存並評分中...") : (en ? "Save and get AI feedback" : "儲存並取得 AI 評分")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
