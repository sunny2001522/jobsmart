import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MessageSquare, Trophy } from "lucide-react";

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
              從題庫中選擇題目練習
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">瀏覽題庫</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Mic className="h-10 w-10 text-primary mb-2" />
            <CardTitle>錄音練習</CardTitle>
            <CardDescription>
              錄音回答，AI 即時評分
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">開始練習</Button>
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
            <p>還沒有任何練習記錄</p>
            <p className="text-sm mt-1">開始練習來追蹤你的進步！</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
