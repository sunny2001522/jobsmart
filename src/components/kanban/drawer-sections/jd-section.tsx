"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Sparkles, Loader2, Pencil, X, Link2, Gift, Languages, RefreshCw } from "lucide-react";
import type { JobApplication, JDContentZh } from "@/types";

interface JDSectionProps {
  application: JobApplication;
  onUpdate?: (updates: {
    jd_content: Record<string, unknown>;
    jd_keywords: string[];
    jd_content_zh?: JDContentZh | null;
  }) => Promise<void>;
}

function cleanJdDescription(value: string): string {
  const navigationNoise = /(?:Menu icon|Close icon|Caret (?:down|up|right|left) icon|Accordion is (?:closed|open), click to (?:open|close)\.|Click to (?:expand|collapse)(?: menu)?\.|Skip to main content|Shopping Cart|Search icon)/gi;
  const cleaned = value
    .replace(navigationNoise, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Some crawlers return the entire site shell before the actual JD. Keep
  // the rendered panel usable even when that shell slipped through parsing.
  return cleaned.length > 6000 ? `${cleaned.slice(0, 6000).trim()}…` : cleaned;
}

export function JDSection({ application, onUpdate }: JDSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [jdInput, setJdInput] = useState("");
  const [urlInput, setUrlInput] = useState(application.jd_url || "");
  const [isParsing, setIsParsing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const jdContent = application.jd_content as {
    title?: string;
    description?: string;
    requirements?: string[];
    responsibilities?: string[];
    keywords?: string[];
    benefits?: string[];
    salary_range?: string;
    location?: string;
  } | null;

  const jdContentZh = application.jd_content_zh;

  const displayDescription = jdContent?.description ? cleanJdDescription(jdContent.description) : "";
  const hasJdContent = displayDescription || jdContent?.requirements?.length;

  // 翻譯 JD 內容
  const handleTranslate = async () => {
    if (!jdContent || !onUpdate) return;

    setIsTranslating(true);
    setTranslateError(null);

    try {
      const response = await fetch("/api/jd/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdContent: {
            description: jdContent.description,
            requirements: jdContent.requirements,
            responsibilities: jdContent.responsibilities,
            benefits: jdContent.benefits,
            keywords: jdContent.keywords,
          },
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        await onUpdate({
          jd_content: jdContent,
          jd_keywords: application.jd_keywords,
          jd_content_zh: result.data,
        });
      } else {
        setTranslateError(result.error || "翻譯失敗");
      }
    } catch (error) {
      console.error("Translation error:", error);
      setTranslateError("網路錯誤，請稍後再試");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleFetchFromUrl = async () => {
    if (!urlInput.trim()) return;

    setIsFetching(true);
    setFetchError(null);

    try {
      const response = await fetch("/api/jd/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });

      const result = await response.json();

      if (result.success && result.data && onUpdate) {
        await onUpdate({
          jd_content: {
            description: result.data.description,
            requirements: result.data.requirements || [],
            responsibilities: result.data.responsibilities || [],
            keywords: result.data.keywords || [],
            benefits: result.data.benefits || [],
            salary_range: result.data.salary,
            location: result.data.location,
          },
          jd_keywords: result.data.keywords || [],
        });
        setIsEditing(false);
      } else {
        setFetchError(result.error || "抓取失敗");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setFetchError("網路錯誤，請稍後再試");
    } finally {
      setIsFetching(false);
    }
  };

  const handleParseJD = async () => {
    if (!jdInput.trim() || jdInput.trim().length < 10) return;

    setIsParsing(true);
    try {
      const response = await fetch("/api/jd/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: jdInput,
          url: application.jd_url,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && onUpdate) {
          await onUpdate({
            jd_content: {
              description: jdInput,
              requirements: result.data.requirements || [],
              responsibilities: result.data.responsibilities || [],
              keywords: result.data.keywords || [],
              benefits: result.data.benefits || [],
            },
            jd_keywords: result.data.keywords || [],
          });
          setIsEditing(false);
          setJdInput("");
        }
      }
    } catch (error) {
      console.error("Failed to parse JD:", error);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 編輯/解析 JD 區塊 */}
      {isEditing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              解析職缺描述
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                setJdInput("");
                setFetchError(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 從 URL 抓取 */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">方式一：從網址自動抓取</p>
            <div className="flex gap-2">
              <Input
                placeholder="貼上 CakeResume、104 等職缺連結..."
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setFetchError(null);
                }}
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleFetchFromUrl}
                disabled={!urlInput.trim() || isFetching}
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                <span className="ml-1.5">{isFetching ? "抓取中" : "抓取"}</span>
              </Button>
            </div>
            {fetchError && (
              <p className="text-xs text-destructive">{fetchError}</p>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">或</span>
            </div>
          </div>

          {/* 手動貼上 */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">方式二：手動貼上內容</p>
            <Textarea
              placeholder="貼上職缺描述內容，系統將自動解析關鍵字、要求、職責、福利等資訊..."
              value={jdInput}
              onChange={(e) => setJdInput(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <Button
              onClick={handleParseJD}
              disabled={isParsing || jdInput.trim().length < 10}
              className="w-full"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  AI 解析中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI 解析 JD
                </>
              )}
            </Button>
          </div>
        </div>
      ) : !hasJdContent ? (
        <div className="text-center py-6 border-2 border-dashed rounded-lg space-y-3">
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">尚無職缺描述</p>
          {onUpdate && (
            <div className="flex flex-col gap-2 items-center">
              {application.jd_url && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleFetchFromUrl}
                  disabled={isFetching}
                >
                  {isFetching ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  從已有連結抓取
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                貼上 JD 並解析
              </Button>
            </div>
          )}
          {fetchError && (
            <p className="text-xs text-destructive">{fetchError}</p>
          )}
        </div>
      ) : (
        <Tabs defaultValue={jdContentZh ? "zh" : "en"} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="zh" className="flex items-center gap-1.5">
              <Languages className="h-3.5 w-3.5" />
              中文摘要
            </TabsTrigger>
            <TabsTrigger value="en">原文</TabsTrigger>
          </TabsList>

          {/* 中文摘要 Tab */}
          <TabsContent value="zh" className="space-y-4">
            {jdContentZh ? (
              <>
                {/* 職缺摘要 */}
                {jdContentZh.summary && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">職缺摘要</h4>
                    <p className="text-sm text-muted-foreground">
                      {jdContentZh.summary}
                    </p>
                  </div>
                )}

                {/* 職位要求 */}
                {jdContentZh.requirements && jdContentZh.requirements.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">職位要求</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {jdContentZh.requirements.map((req, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 工作職責 */}
                {jdContentZh.responsibilities && jdContentZh.responsibilities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">工作職責</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {jdContentZh.responsibilities.map((resp, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          {resp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 福利待遇 */}
                {jdContentZh.benefits && jdContentZh.benefits.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      福利待遇
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                      {jdContentZh.benefits.map((benefit, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 中文關鍵字 */}
                {jdContentZh.keywords_zh && jdContentZh.keywords_zh.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">關鍵技能</h4>
                    <div className="flex flex-wrap gap-2">
                      {jdContentZh.keywords_zh.map((keyword, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 重新翻譯按鈕 */}
                {onUpdate && (
                  <div className="pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTranslate}
                      disabled={isTranslating}
                      className="w-full"
                    >
                      {isTranslating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      重新翻譯
                    </Button>
                    {jdContentZh.translated_at && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        翻譯於 {new Date(jdContentZh.translated_at).toLocaleDateString("zh-TW")}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <Languages className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">尚未翻譯成中文</p>
                {translateError && (
                  <p className="text-xs text-destructive mb-3">{translateError}</p>
                )}
                {onUpdate && (
                  <Button
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    size="sm"
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        翻譯中...
                      </>
                    ) : (
                      <>
                        <Languages className="h-4 w-4 mr-2" />
                        翻譯成中文
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* 原文 Tab */}
          <TabsContent value="en" className="space-y-4">
            {/* 職缺描述 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  職缺描述
                </h4>
                {onUpdate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setJdInput(jdContent?.description || "");
                      setIsEditing(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                {displayDescription}
              </p>
            </div>

            {/* 職位要求 */}
            {jdContent?.requirements && jdContent.requirements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">職位要求</h4>
                <ul className="list-disc list-inside space-y-1">
                  {jdContent.requirements.map((req, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 工作職責 */}
            {jdContent?.responsibilities && jdContent.responsibilities.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">工作職責</h4>
                <ul className="list-disc list-inside space-y-1">
                  {jdContent.responsibilities.map((resp, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      {resp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 福利待遇 */}
            {jdContent?.benefits && jdContent.benefits.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  福利待遇
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {jdContent.benefits.map((benefit, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 薪資和地點 */}
            {(jdContent?.salary_range || jdContent?.location) && (
              <div className="flex flex-wrap gap-2">
                {jdContent.salary_range && (
                  <Badge variant="secondary">{jdContent.salary_range}</Badge>
                )}
                {jdContent.location && (
                  <Badge variant="outline">{jdContent.location}</Badge>
                )}
              </div>
            )}

            {/* 關鍵字標籤 */}
            {application.jd_keywords && application.jd_keywords.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">關鍵字</h4>
                <div className="flex flex-wrap gap-2">
                  {application.jd_keywords.map((keyword, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
