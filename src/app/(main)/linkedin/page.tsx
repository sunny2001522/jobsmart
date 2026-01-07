import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Linkedin, Sparkles, BarChart3 } from "lucide-react";

export default function LinkedInPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">LinkedIn 優化</h1>
        <p className="text-muted-foreground">
          生成專業的 LinkedIn 內容，提升個人品牌
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Sparkles className="h-10 w-10 text-primary mb-2" />
            <CardTitle>AI 生成內容</CardTitle>
            <CardDescription>
              根據你的經歷生成專業的 LinkedIn 內容
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">開始生成</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <BarChart3 className="h-10 w-10 text-primary mb-2" />
            <CardTitle>關鍵字分析</CardTitle>
            <CardDescription>
              分析職位關鍵字，優化你的 Profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">分析關鍵字</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5" />
            生成歷史
          </CardTitle>
          <CardDescription>你之前生成的 LinkedIn 內容</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <p>還沒有任何生成記錄</p>
            <p className="text-sm mt-1">開始生成你的專業內容！</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
