"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Sparkles, CheckCircle, Briefcase, Gift } from "lucide-react";

interface JDAnalysis {
  keywords: string[];
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  sourceUrl?: string;
  analyzedAt: string;
}

export default function JDAnalyzerPage() {
  const [jdContent, setJdContent] = useState("");
  const [jdUrl, setJdUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<JDAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!jdContent.trim()) {
      setError("請輸入職缺描述內容");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/jd/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: jdContent,
          url: jdUrl || undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      setAnalysis(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失敗，請稍後再試");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">JD 分析器</h1>
        <p className="text-muted-foreground">
          分析職缺描述，提取關鍵技能和要求
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 輸入區 */}
        <Card>
          <CardHeader>
            <CardTitle>職缺描述</CardTitle>
            <CardDescription>
              貼上職缺內容或輸入 JD 網址
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">JD 網址 (選填)</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  value={jdUrl}
                  onChange={(e) => setJdUrl(e.target.value)}
                />
                <Button variant="outline" size="icon" disabled>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                未來將支援自動抓取網頁內容
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">職缺內容 *</label>
              <Textarea
                placeholder="貼上完整的職缺描述..."
                value={jdContent}
                onChange={(e) => setJdContent(e.target.value)}
                className="min-h-[300px]"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !jdContent.trim()}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI 分析
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 結果區 */}
        <Card>
          <CardHeader>
            <CardTitle>分析結果</CardTitle>
            <CardDescription>
              {analysis
                ? `分析時間：${new Date(analysis.analyzedAt).toLocaleString("zh-TW")}`
                : "分析後將顯示結果"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analysis ? (
              <Tabs defaultValue="keywords">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="keywords">關鍵字</TabsTrigger>
                  <TabsTrigger value="requirements">要求</TabsTrigger>
                  <TabsTrigger value="responsibilities">職責</TabsTrigger>
                  <TabsTrigger value="benefits">福利</TabsTrigger>
                </TabsList>

                <TabsContent value="keywords" className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywords.length > 0 ? (
                      analysis.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary">
                          {keyword}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        未偵測到關鍵字
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="requirements" className="mt-4">
                  <ul className="space-y-2">
                    {analysis.requirements.length > 0 ? (
                      analysis.requirements.map((req, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                          {req}
                        </li>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        未偵測到要求
                      </p>
                    )}
                  </ul>
                </TabsContent>

                <TabsContent value="responsibilities" className="mt-4">
                  <ul className="space-y-2">
                    {analysis.responsibilities.length > 0 ? (
                      analysis.responsibilities.map((resp, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Briefcase className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                          {resp}
                        </li>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        未偵測到職責
                      </p>
                    )}
                  </ul>
                </TabsContent>

                <TabsContent value="benefits" className="mt-4">
                  <ul className="space-y-2">
                    {analysis.benefits.length > 0 ? (
                      analysis.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Gift className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                          {benefit}
                        </li>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        未偵測到福利
                      </p>
                    )}
                  </ul>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Search className="h-12 w-12 mb-4" />
                <p>貼上職缺描述後點擊「AI 分析」</p>
                <p className="text-sm mt-1">
                  AI 將幫你提取關鍵資訊
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
