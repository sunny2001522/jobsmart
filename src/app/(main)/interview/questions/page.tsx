"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { Plus, Search, Play, Bookmark } from "lucide-react";
import { getInterviewQuestions } from "@/lib/turso/db";
import { useI18n } from "@/contexts/i18n-context";

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
}

const categoryLabels: Record<QuestionCategory, { zh: string; en: string }> = {
  behavioral: { zh: "行為問題", en: "Behavioral" },
  technical: { zh: "技術問題", en: "Technical" },
  situational: { zh: "情境問題", en: "Situational" },
  self_introduction: { zh: "自我介紹", en: "Self introduction" },
  other: { zh: "其他", en: "Other" },
};

const difficultyLabels = { easy: { zh: "簡單", en: "Easy" }, medium: { zh: "中等", en: "Medium" }, hard: { zh: "困難", en: "Hard" } };

// 預設題庫
const defaultQuestions: InterviewQuestion[] = [
  {
    id: "1",
    question: "請簡單自我介紹",
    category: "self_introduction",
    difficulty: "easy",
    isBookmarked: false,
  },
  {
    id: "2",
    question: "為什麼想加入我們公司？",
    category: "behavioral",
    difficulty: "easy",
    isBookmarked: false,
  },
  {
    id: "3",
    question: "描述一個你克服困難的經歷",
    category: "behavioral",
    difficulty: "medium",
    isBookmarked: false,
  },
  {
    id: "4",
    question: "你的優點和缺點是什麼？",
    category: "behavioral",
    difficulty: "easy",
    isBookmarked: false,
  },
  {
    id: "5",
    question: "描述一個你與團隊成員意見不合的情況，你如何處理？",
    category: "situational",
    difficulty: "medium",
    isBookmarked: false,
  },
  {
    id: "6",
    question: "你如何處理工作壓力？",
    category: "behavioral",
    difficulty: "easy",
    isBookmarked: false,
  },
  {
    id: "7",
    question: "描述一個你領導專案的經驗",
    category: "behavioral",
    difficulty: "hard",
    isBookmarked: false,
  },
  {
    id: "8",
    question: "你未來五年的職涯規劃是什麼？",
    category: "behavioral",
    difficulty: "medium",
    isBookmarked: false,
  },
  {
    id: "9",
    question: "如果主管給你一個不合理的截止日期，你會怎麼做？",
    category: "situational",
    difficulty: "hard",
    isBookmarked: false,
  },
  {
    id: "10",
    question: "描述一個你失敗的經驗，你從中學到什麼？",
    category: "behavioral",
    difficulty: "medium",
    isBookmarked: false,
  },
];

const englishQuestions = [
  "Tell me about yourself.",
  "Why do you want to join our company?",
  "Describe a time you overcame a challenge.",
  "What are your strengths and weaknesses?",
  "Describe a disagreement with a teammate and how you handled it.",
  "How do you handle work-related stress?",
  "Describe a project you led.",
  "Where do you see your career in five years?",
  "What would you do if your manager gave you an unrealistic deadline?",
  "Describe a failure and what you learned from it.",
];

export default function QuestionsPage() {
  const { locale } = useI18n();
  const en = locale === "en";
  const [questions, setQuestions] = useState<InterviewQuestion[]>(defaultQuestions);
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
    getInterviewQuestions().then((stored) => {
      if (!active || !stored?.length) return;
      const imported = stored.map((item) => ({
        id: item.id,
        question: item.question,
        category: (["behavioral", "technical", "situational", "self_introduction", "other"] as string[]).includes(item.category || "")
          ? item.category as QuestionCategory
          : "other" as QuestionCategory,
        difficulty: (item.difficulty === "easy" || item.difficulty === "hard" ? item.difficulty : "medium") as "easy" | "medium" | "hard",
        isBookmarked: false,
      }));
      setQuestions((current) => {
        const existing = new Set(current.map((question) => question.question));
        return [...imported.filter((question) => !existing.has(question.question)), ...current];
      });
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || q.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddQuestion = () => {
    if (!newQuestion.question.trim()) return;

    const question: InterviewQuestion = {
      id: crypto.randomUUID(),
      question: newQuestion.question,
      category: newQuestion.category,
      difficulty: newQuestion.difficulty,
      isBookmarked: false,
    };

    setQuestions([question, ...questions]);
    setNewQuestion({ question: "", category: "behavioral", difficulty: "medium" });
    setIsAddDialogOpen(false);
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
        <TabsList>
          <TabsTrigger value="all">{en ? "All" : "全部"} ({questions.length})</TabsTrigger>
          <TabsTrigger value="bookmarked">
            {en ? "Bookmarked" : "已收藏"} ({questions.filter((q) => q.isBookmarked).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="space-y-3">
            {filteredQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={locale === "en" && /^([1-9]|10)$/.test(question.id) ? { ...question, question: englishQuestions[Number(question.id) - 1] } : question}
                onToggleBookmark={toggleBookmark}
                locale={locale}
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
                  question={locale === "en" && /^([1-9]|10)$/.test(question.id) ? { ...question, question: englishQuestions[Number(question.id) - 1] } : question}
                  onToggleBookmark={toggleBookmark}
                  locale={locale}
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
}: {
  question: InterviewQuestion;
  onToggleBookmark: (id: string) => void;
  locale: "en" | "zh-TW";
}) {
  const en = locale === "en";
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
            <Button asChild size="sm">
              <Link href={`/interview/practice?q=${question.id}`}>
                <Play className="h-4 w-4 mr-2" />
                {en ? "Practice" : "練習"}
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
