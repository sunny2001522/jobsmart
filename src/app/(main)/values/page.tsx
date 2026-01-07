import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Shuffle, History } from "lucide-react";

export default function ValuesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">工作價值觀</h1>
        <p className="text-muted-foreground">
          透過卡片排序了解你最重視的工作價值
        </p>
      </div>

      <Card>
        <CardHeader>
          <Heart className="h-10 w-10 text-primary mb-2" />
          <CardTitle>價值觀卡片排序</CardTitle>
          <CardDescription>
            從 52 張價值觀卡片中選擇並排序，找出你最重視的工作價值
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            這個練習將幫助你：
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>更清楚了解自己的工作動機</li>
            <li>在面試中更好地表達你的價值觀</li>
            <li>找到更適合你的工作環境</li>
          </ul>
          <Button className="w-full">
            <Shuffle className="h-4 w-4 mr-2" />
            開始排序
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            排序歷史
          </CardTitle>
          <CardDescription>你之前的價值觀排序結果</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <p>還沒有任何排序記錄</p>
            <p className="text-sm mt-1">完成一次排序來了解你的工作價值觀！</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
