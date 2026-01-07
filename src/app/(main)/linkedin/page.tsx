"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Linkedin,
  Sparkles,
  Copy,
  Check,
  Loader2,
  Plus,
  X,
} from "lucide-react";

type ContentType = "headline" | "about" | "experience" | "summary";

interface GenerationResult {
  content: string;
  keywords: string[];
  suggestions: string[];
  contentType: ContentType;
}

const contentTypeLabels: Record<ContentType, string> = {
  headline: "標題 (Headline)",
  about: "關於 (About)",
  experience: "工作經歷",
  summary: "職涯摘要",
};

export default function LinkedInPage() {
  const [contentType, setContentType] = useState<ContentType>("headline");
  const [targetRole, setTargetRole] = useState("");
  const [currentContent, setCurrentContent] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/linkedin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          targetRole: targetRole || undefined,
          currentContent: currentContent || undefined,
          skills: skills.length > 0 ? skills : undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失敗");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (result?.content) {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">LinkedIn 優化</h1>
        <p className="text-muted-foreground">
          使用 AI 生成專業的 LinkedIn 內容，提升個人品牌
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 輸入區 */}
        <Card>
          <CardHeader>
            <CardTitle>生成設定</CardTitle>
            <CardDescription>選擇要生成的內容類型並填寫相關資訊</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 內容類型 */}
            <div className="space-y-2">
              <Label>內容類型</Label>
              <Tabs value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="headline">標題</TabsTrigger>
                  <TabsTrigger value="about">關於</TabsTrigger>
                  <TabsTrigger value="experience">經歷</TabsTrigger>
                  <TabsTrigger value="summary">摘要</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* 目標職位 */}
            <div className="space-y-2">
              <Label htmlFor="targetRole">目標職位 (選填)</Label>
              <Input
                id="targetRole"
                placeholder="例如：Frontend Engineer, Product Manager"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </div>

            {/* 技能 */}
            <div className="space-y-2">
              <Label>技能專長 (選填)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="新增技能..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddSkill()}
                />
                <Button type="button" variant="outline" onClick={handleAddSkill}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1">
                      {skill}
                      <button onClick={() => handleRemoveSkill(skill)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* 現有內容 */}
            <div className="space-y-2">
              <Label htmlFor="currentContent">現有內容 (選填，用於優化)</Label>
              <Textarea
                id="currentContent"
                placeholder="貼上你目前的 LinkedIn 內容，AI 會幫你優化..."
                value={currentContent}
                onChange={(e) => setCurrentContent(e.target.value)}
                rows={4}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI 生成
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 結果區 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Linkedin className="h-5 w-5" />
              生成結果
            </CardTitle>
            {result && (
              <CardDescription>
                {contentTypeLabels[result.contentType]}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                {/* 生成內容 */}
                <div className="relative">
                  <div className="p-4 rounded-lg bg-muted whitespace-pre-wrap text-sm">
                    {result.content}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* 關鍵字 */}
                {result.keywords.length > 0 && (
                  <div className="space-y-2">
                    <Label>建議關鍵字</Label>
                    <div className="flex flex-wrap gap-2">
                      {result.keywords.map((keyword, index) => (
                        <Badge key={index} variant="outline">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 建議 */}
                {result.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <Label>額外建議</Label>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {result.suggestions.map((suggestion, index) => (
                        <li key={index}>• {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Linkedin className="h-12 w-12 mb-4" />
                <p>填寫資訊後點擊「AI 生成」</p>
                <p className="text-sm mt-1">
                  AI 將幫你產出專業的 LinkedIn 內容
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 使用提示 */}
      <Card>
        <CardHeader>
          <CardTitle>LinkedIn 優化技巧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <p className="font-medium mb-1">標題 (Headline)</p>
              <p className="text-muted-foreground">
                120 字內，突出專業和價值主張
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">關於 (About)</p>
              <p className="text-muted-foreground">
                用故事吸引人，展示個人特色
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">工作經歷</p>
              <p className="text-muted-foreground">
                使用強動詞，量化你的成果
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">關鍵字</p>
              <p className="text-muted-foreground">
                加入目標職位相關關鍵字提高曝光
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
