import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MessageSquare, Trophy, Brain, Target } from "lucide-react";

export default function InterviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">面試準備</h1>
        <p className="text-muted-foreground">
          練習面試題目，獲得 AI 評分和建議
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <MessageSquare className="h-10 w-10 text-primary mb-2" />
            <CardTitle>題庫練習</CardTitle>
            <CardDescription>
              從題庫中選擇題目練習，包含行為、技術、情境等類型
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link href="/interview/questions">瀏覽題庫</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Mic className="h-10 w-10 text-primary mb-2" />
            <CardTitle>錄音練習</CardTitle>
            <CardDescription>
              錄音回答，AI 自動轉譯並即時評分
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link href="/interview/practice">開始練習</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 功能說明 */}
      <Card>
        <CardHeader>
          <CardTitle>如何使用</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                1
              </div>
              <div>
                <p className="font-medium">選擇題目</p>
                <p className="text-sm text-muted-foreground">
                  從題庫選擇想練習的問題
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                2
              </div>
              <div>
                <p className="font-medium">錄音回答</p>
                <p className="text-sm text-muted-foreground">
                  按下錄音鍵，回答問題
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                3
              </div>
              <div>
                <p className="font-medium">獲得回饋</p>
                <p className="text-sm text-muted-foreground">
                  AI 評分並給予改進建議
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI 評分說明 */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Brain className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">AI 評分標準</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• 內容相關性和完整性</p>
            <p>• STAR 方法使用 (情境、任務、行動、結果)</p>
            <p>• 表達清晰度和邏輯性</p>
            <p>• 專業度和具體案例</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Target className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">練習建議</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• 每天練習 2-3 題</p>
            <p>• 每個回答控制在 1-2 分鐘</p>
            <p>• 使用具體數字和成果</p>
            <p>• 多次練習同一題，追蹤進步</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            練習記錄
          </CardTitle>
          <CardDescription>你的面試練習歷史</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mb-4 opacity-50" />
            <p>還沒有任何練習記錄</p>
            <p className="text-sm mt-1">開始練習來追蹤你的進步！</p>
            <Button className="mt-4" asChild>
              <Link href="/interview/practice">開始第一次練習</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
