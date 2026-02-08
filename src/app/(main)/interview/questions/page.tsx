"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const categoryLabels: Record<QuestionCategory, string> = {
  behavioral: "行為問題",
  technical: "技術問題",
  situational: "情境問題",
  self_introduction: "自我介紹",
  other: "其他",
};

const difficultyLabels = {
  easy: "簡單",
  medium: "中等",
  hard: "困難",
};

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

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<InterviewQuestion[]>(defaultQuestions);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    category: "behavioral" as QuestionCategory,
    difficulty: "medium" as "easy" | "medium" | "hard",
  });

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
          <h1 className="text-2xl font-bold">面試題庫</h1>
          <p className="text-muted-foreground">瀏覽和練習常見面試題目</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新增題目
        </Button>
      </div>

      {/* 搜尋和篩選 */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋題目..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="選擇類別" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部類別</SelectItem>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 題目列表 */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">全部 ({questions.length})</TabsTrigger>
          <TabsTrigger value="bookmarked">
            已收藏 ({questions.filter((q) => q.isBookmarked).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="space-y-3">
            {filteredQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onToggleBookmark={toggleBookmark}
              />
            ))}
            {filteredQuestions.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <p>找不到符合條件的題目</p>
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
                />
              ))}
            {questions.filter((q) => q.isBookmarked).length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <p>還沒有收藏任何題目</p>
                  <p className="text-sm mt-1">點擊書籤圖示收藏題目</p>
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
            <DialogTitle>新增面試題目</DialogTitle>
            <DialogDescription>新增一個自訂的面試題目到題庫</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question">題目內容</Label>
              <Textarea
                id="question"
                placeholder="輸入面試題目..."
                value={newQuestion.question}
                onChange={(e) =>
                  setNewQuestion({ ...newQuestion, question: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>類別</Label>
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
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>難度</Label>
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
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddQuestion}>新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuestionCard({
  question,
  onToggleBookmark,
}: {
  question: InterviewQuestion;
  onToggleBookmark: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="font-medium">{question.question}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">{categoryLabels[question.category]}</Badge>
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
                {difficultyLabels[question.difficulty]}
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
                練習
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
