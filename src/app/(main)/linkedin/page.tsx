"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useJobApplications } from "@/hooks/use-job-applications";
import { useResumeVersions } from "@/hooks/use-resume-versions";
import type { JobApplication } from "@/lib/supabase/types";
import {
  Sparkles,
  Copy,
  Check,
  Loader2,
  Building2,
  Briefcase,
  FileText,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

// 解析的經歷類型
interface ParsedExperience {
  company: string;
  position: string;
  duration: string;
  description: string;
}

// 優化結果類型
interface OptimizedResult {
  optimized: string;
  highlights: string[];
  suggestions: string[];
}

// 技能分析類型
interface SkillAnalysisItem {
  skill: string;
  count: number;
  percentage: number;
  jobs: { jobId: string; companyName: string; position: string }[];
}

// 技能分析函數
function analyzeSkillsFromJobs(applications: JobApplication[]): SkillAnalysisItem[] {
  const skillMap = new Map<string, { count: number; jobs: { jobId: string; companyName: string; position: string }[] }>();
  const validJobs = applications.filter(app => app.jd_keywords && app.jd_keywords.length > 0);
  const totalJobs = validJobs.length;

  for (const app of validJobs) {
    const keywords = [...new Set(app.jd_keywords || [])];
    for (const keyword of keywords) {
      const normalized = keyword.trim().toLowerCase();
      if (!normalized) continue;

      const existing = skillMap.get(normalized) || { count: 0, jobs: [] };
      existing.count++;
      existing.jobs.push({
        jobId: app.id,
        companyName: app.company_name,
        position: app.position,
      });
      skillMap.set(normalized, existing);
    }
  }

  return Array.from(skillMap.entries())
    .map(([skill, data]) => ({
      skill,
      count: data.count,
      percentage: totalJobs > 0 ? Math.round((data.count / totalJobs) * 100) : 0,
      jobs: data.jobs,
    }))
    .sort((a, b) => b.count - a.count); // 按數量排序
}

export default function LinkedInPage() {
  // 履歷和職缺數據
  const { versions, isLoading: isLoadingVersions } = useResumeVersions();
  const { applications, isLoading: isLoadingJobs } = useJobApplications();

  // 狀態
  const [experiences, setExperiences] = useState<ParsedExperience[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [optimizedResults, setOptimizedResults] = useState<Record<number, OptimizedResult>>({});
  const [isOptimizingAll, setIsOptimizingAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // 獲取主要履歷版本
  const primaryVersion = useMemo(() => {
    return versions.find(v => v.is_active) || versions[0];
  }, [versions]);

  // 計算技能分析（按數量排序）
  const skillAnalysis = useMemo(() => {
    if (!applications.length) return [];
    return analyzeSkillsFromJobs(applications);
  }, [applications]);

  // 解析履歷經歷
  const parseExperiences = async () => {
    if (!primaryVersion?.base_plain_text) return;

    setIsParsing(true);
    setParseError(null);

    try {
      const response = await fetch("/api/linkedin/parse-experiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: primaryVersion.base_plain_text }),
      });

      const data = await response.json();

      if (data.success) {
        setExperiences(data.data.experiences);
      } else {
        setParseError(data.error || "解析失敗");
      }
    } catch (err) {
      setParseError("網路錯誤，請稍後再試");
      console.error(err);
    } finally {
      setIsParsing(false);
    }
  };

  // 自動解析
  useEffect(() => {
    if (primaryVersion?.base_plain_text && experiences.length === 0 && !isParsing) {
      parseExperiences();
    }
  }, [primaryVersion]);

  // 優化所有經歷
  const optimizeAllExperiences = async () => {
    if (experiences.length === 0) return;

    setIsOptimizingAll(true);
    const topSkills = skillAnalysis.slice(0, 10).map(s => s.skill);

    try {
      // 並行優化所有經歷
      const promises = experiences.map(async (experience, index) => {
        const response = await fetch("/api/linkedin/optimize-experience", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            experience: {
              company: experience.company,
              position: experience.position,
              description: experience.description,
            },
            topSkills,
          }),
        });

        const data = await response.json();
        return { index, data };
      });

      const results = await Promise.all(promises);

      const newOptimizedResults: Record<number, OptimizedResult> = {};
      for (const { index, data } of results) {
        if (data.success) {
          newOptimizedResults[index] = data.data;
        }
      }

      setOptimizedResults(newOptimizedResults);
    } catch (err) {
      console.error(err);
    } finally {
      setIsOptimizingAll(false);
    }
  };

  // 複製內容
  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // 載入中狀態
  if (isLoadingVersions) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">LinkedIn 優化</h1>
          <p className="text-muted-foreground">從你的履歷生成優化的 LinkedIn 內容</p>
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="space-y-4">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // 無履歷狀態
  if (!primaryVersion) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">LinkedIn 優化</h1>
          <p className="text-muted-foreground">從你的履歷生成優化的 LinkedIn 內容</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-medium mb-2">尚無履歷</p>
            <p className="text-sm text-muted-foreground mb-4">
              請先建立履歷版本，才能優化 LinkedIn 內容
            </p>
            <Button asChild>
              <Link href="/resume">前往履歷管理</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* 標題 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">LinkedIn 優化</h1>
            <p className="text-muted-foreground">
              從「{primaryVersion.name}」生成優化的 LinkedIn 內容
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={parseExperiences}
              disabled={isParsing || isOptimizingAll}
            >
              {isParsing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              重新解析
            </Button>
            {experiences.length > 0 && (
              <Button
                onClick={optimizeAllExperiences}
                disabled={isOptimizingAll || isParsing}
              >
                {isOptimizingAll ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {isOptimizingAll ? "優化中..." : "全部優化"}
              </Button>
            )}
          </div>
        </div>

        {/* 技能標籤區 */}
        {!isLoadingJobs && skillAnalysis.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">熱門技能</CardTitle>
              <CardDescription>
                來自 {applications.filter(a => a.jd_keywords?.length > 0).length} 個追蹤職缺 (hover 查看職缺)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {skillAnalysis.map((item) => (
                  <Tooltip key={item.skill}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant={item.count >= 3 ? "default" : "secondary"}
                        className="cursor-help text-sm py-1 px-3"
                      >
                        {item.skill}
                        <span className="ml-1.5 opacity-70">{item.count}</span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm" side="bottom">
                      <p className="font-medium mb-2">{item.count} 個職缺需要此技能</p>
                      <div className="text-xs space-y-1.5">
                        {item.jobs.map((job) => (
                          <div key={job.jobId} className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="font-medium">{job.companyName}</span>
                            <span className="text-muted-foreground">- {job.position}</span>
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 解析錯誤 */}
        {parseError && (
          <Card className="border-destructive">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive">{parseError}</p>
              <Button variant="outline" size="sm" onClick={parseExperiences}>
                重試
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 解析中 */}
        {isParsing && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mr-3" />
              <p className="text-muted-foreground">正在解析履歷經歷...</p>
            </CardContent>
          </Card>
        )}

        {/* 經歷列表 - 左右兩欄 */}
        {!isParsing && experiences.length > 0 && (
          <div className="space-y-4">
            {experiences.map((exp, index) => {
              const optimized = optimizedResults[index];
              const isCopied = copiedIndex === index;

              return (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building2 className="h-5 w-5" />
                      {exp.company}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Briefcase className="h-4 w-4" />
                      {exp.position}
                      {exp.duration && (
                        <span className="text-xs">({exp.duration})</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* 左右兩欄佈局 */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* 左欄：原始描述 */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">原始描述</p>
                        <div className="p-4 rounded-lg bg-muted min-h-[120px] text-sm whitespace-pre-wrap">
                          {exp.description}
                        </div>
                      </div>

                      {/* 右欄：優化後描述 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-muted-foreground">優化後描述</p>
                          {optimized && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7"
                              onClick={() => handleCopy(optimized.optimized, index)}
                            >
                              {isCopied ? (
                                <Check className="h-3 w-3 mr-1 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3 mr-1" />
                              )}
                              {isCopied ? "已複製" : "複製"}
                            </Button>
                          )}
                        </div>
                        <div className="p-4 rounded-lg border bg-card min-h-[120px] text-sm whitespace-pre-wrap">
                          {isOptimizingAll && !optimized ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              <Loader2 className="h-5 w-5 animate-spin mr-2" />
                              AI 優化中...
                            </div>
                          ) : optimized ? (
                            optimized.optimized
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              點擊上方「全部優化」生成
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 優化後的額外資訊 */}
                    {optimized && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        {/* 亮點 */}
                        {optimized.highlights.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">亮點</p>
                            <div className="flex flex-wrap gap-1.5">
                              {optimized.highlights.map((h, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {h}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 建議 */}
                        {optimized.suggestions.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">建議</p>
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              {optimized.suggestions.map((s, i) => (
                                <li key={i}>• {s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* 無經歷 */}
        {!isParsing && experiences.length === 0 && !parseError && primaryVersion?.base_plain_text && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="font-medium mb-2">無法解析經歷</p>
              <p className="text-sm text-muted-foreground mb-4">
                請確認履歷中包含工作經歷資訊
              </p>
              <Button onClick={parseExperiences}>重新解析</Button>
            </CardContent>
          </Card>
        )}

        {/* 履歷無內容 */}
        {!primaryVersion?.base_plain_text && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="font-medium mb-2">履歷內容為空</p>
              <p className="text-sm text-muted-foreground mb-4">
                請先編輯履歷，加入你的工作經歷
              </p>
              <Button asChild>
                <Link href={`/resume/${primaryVersion?.id}/edit`}>編輯履歷</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
