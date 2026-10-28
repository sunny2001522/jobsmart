"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { JDSection } from "./drawer-sections/jd-section";
import { ReviewsSection } from "./drawer-sections/reviews-section";
import { useI18n } from "@/contexts/i18n-context";
import {
  ScoreSection,
  type ValueMatchResult,
} from "./drawer-sections/score-section";
import { InterviewSection } from "./drawer-sections/interview-section";
import { ResumeSection } from "./drawer-sections/resume-section";
import {
  getCompanyReviewsByName,
  createCompanyReview,
  getValueRanking,
  updateJobApplication,
  getVersionJobResume,
  getResumeVersion,
  getResumeVersions,
  addJobToVersion,
  updateVersionJobResume,
  createInterviewQuestion,
} from "@/lib/turso/db";
import { calculateValueMatch } from "@/lib/values/matcher";
import { useIsMobile } from "@/hooks/use-mobile";
import type {
  JobApplication,
  CompanyReview,
  ValueRanking,
  JDContentZh,
  InterviewExperience,
  InterviewSource,
  InterviewSourceResult,
  InterviewAggregated,
} from "@/types";
import type { ResumeVersion, VersionJobResume } from "@/lib/turso/types";
import { APPLICATION_STATUS_LABELS } from "@/types";

type ReviewSource = "dcard" | "qollie" | "ptt" | "medium" | "glassdoor" | "indeed" | "comparably";

function extractResumeText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(extractResumeText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    const node = value as { text?: unknown; content?: unknown };
    if (typeof node.text === "string") return node.text;
    if (node.content) return extractResumeText(node.content);
  }
  return "";
}

function getJobEvidenceText(application: JobApplication): string {
  return [
    JSON.stringify(application.jd_content || ""),
    JSON.stringify(application.jd_content_zh || ""),
    Array.isArray(application.jd_keywords) ? application.jd_keywords.join(" ") : "",
  ].join(" ");
}

interface SourceResult {
  success: boolean;
  count: number;
  error?: string;
}

interface ApplicationDetailDrawerProps {
  application: JobApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplicationUpdate?: (updatedApplication: JobApplication) => void;
}

// Empty state component for desktop when no application selected
function EmptyStatePanel() {
  return (
    <div className="w-[340px] min-w-[280px] rounded-2xl bg-muted/30 border border-dashed flex flex-col items-center justify-center h-full shrink-0">
      <div className="text-center text-muted-foreground p-8">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-sm font-medium">選擇一個應徵項目</p>
        <p className="text-xs mt-1">點擊卡片查看詳細資訊</p>
      </div>
    </div>
  );
}

// Content component that's shared between Sheet and inline panel
interface ApplicationDetailContentProps {
  application: JobApplication;
  reviews: CompanyReview[];
  userRanking: ValueRanking | null;
  matchResult: ValueMatchResult | null;
  isLoadingReviews: boolean;
  isLoadingScore: boolean;
  isSearchingReviews: boolean;
  sourceResults?: Record<ReviewSource, SourceResult>;
  lastSearchedAt?: string;
  onSearchReviews: () => Promise<void>;
  onAddReview: (review: { title: string; content: string; sentiment: "positive" | "neutral" | "negative" }) => Promise<void>;
  onJDUpdate: (updates: {
    jd_content: Record<string, unknown>;
    jd_keywords: string[];
    jd_content_zh?: JDContentZh | null;
  }) => Promise<void>;
  // 面試相關
  interviews: InterviewExperience[];
  interviewAggregated?: InterviewAggregated;
  isSearchingInterviews: boolean;
  interviewSourceResults?: Record<InterviewSource, InterviewSourceResult>;
  lastInterviewSearchedAt?: string;
  onSearchInterviews: () => Promise<void>;
}

function ApplicationDetailContent({
  application,
  reviews,
  userRanking,
  matchResult,
  isLoadingReviews,
  isLoadingScore,
  isSearchingReviews,
  sourceResults,
  lastSearchedAt,
  onSearchReviews,
  onAddReview,
  onJDUpdate,
  interviews,
  interviewAggregated,
  isSearchingInterviews,
  interviewSourceResults,
  lastInterviewSearchedAt,
  onSearchInterviews,
}: ApplicationDetailContentProps) {
  const { locale } = useI18n();
  const metadata = application as JobApplication & Record<string, unknown>;
  const resumeVersionId = String(metadata.resume_version_id || "");
  const [effectiveResumeVersionId, setEffectiveResumeVersionId] = useState(resumeVersionId);
  const [tailoredResume, setTailoredResume] = useState<VersionJobResume | null>(null);
  const [sourceResume, setSourceResume] = useState<ResumeVersion | null>(null);
  const [sourceResumeName, setSourceResumeName] = useState<string | null>(null);
  const [tailoredText, setTailoredText] = useState("");
  const [savingTailoredResume, setSavingTailoredResume] = useState(false);
  const [activeTab, setActiveTab] = useState("about");
  useEffect(() => {
    let current = true;
    setEffectiveResumeVersionId(resumeVersionId);
    const loadResume = async () => {
      const selectedId = resumeVersionId || (await getResumeVersions()).find((version) => version.is_active)?.id || "";
      if (!current) return;
      setEffectiveResumeVersionId(selectedId);
      if (!selectedId) {
        setTailoredResume(null);
        setTailoredText("");
        return;
      }
      const version = await getResumeVersion(selectedId);
      let jobResume = await getVersionJobResume(selectedId, application.id);
      if (!jobResume) {
        jobResume = await addJobToVersion(selectedId, application.id);
      }
      if (!current) return;
      setTailoredResume(jobResume);
      setTailoredText(jobResume?.customized_plain_text || version?.base_plain_text || extractResumeText(version?.base_content));
      setSourceResume(version);
      setSourceResumeName(version?.name || null);
    };
    loadResume().catch((error) => console.error("Failed to load tailored resume", error));
    return () => { current = false; };
  }, [resumeVersionId, application.id]);
  const saveTailoredResume = async () => {
    if (!tailoredResume) return;
    setSavingTailoredResume(true);
    try {
      const saved = await updateVersionJobResume(tailoredResume.id, { customized_plain_text: tailoredText });
      if (!saved) throw new Error("儲存失敗");
      setTailoredResume(saved);
      toast.success("客製履歷已儲存");
    } catch (error) {
      console.error("Failed to save tailored resume", error);
      toast.error("客製履歷儲存失敗，請重試");
    } finally { setSavingTailoredResume(false); }
  };
  const strengthenResume = async (answer: string) => {
    if (!effectiveResumeVersionId) return;
    const response = await fetch("/api/resume/customize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        versionId: effectiveResumeVersionId,
        jobApplicationId: application.id,
        additionalContext: answer,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || "履歷更新失敗");
    const refreshed = await getVersionJobResume(effectiveResumeVersionId, application.id);
    setTailoredResume(refreshed);
    setTailoredText(refreshed?.customized_plain_text || "");
    toast.success("履歷已根據你的回答更新");
  };
  const legacyLinkedInTitle = application.position.match(/^(.+?)\s+at\s+(.+?)(?:\s+[—|-].*)?$/i);
  const displayPosition = legacyLinkedInTitle && /linkedin\.com/i.test(application.company_name) ? legacyLinkedInTitle[1].trim() : application.position;
  const displayCompany = legacyLinkedInTitle && /linkedin\.com/i.test(application.company_name) ? legacyLinkedInTitle[2].trim() : (/linkedin\.com/i.test(application.company_name) ? (locale === "en" ? "LinkedIn job" : "LinkedIn 職缺") : application.company_name);
  return (
    <>
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">
              {displayPosition}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {displayCompany}
            </p>
          </div>
          <Badge variant="secondary">
            {APPLICATION_STATUS_LABELS[application.status]}
          </Badge>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          if (value === "interview" && interviews.length === 0 && !isSearchingInterviews) {
            void onSearchInterviews();
          }
        }}
        className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden"
      >
        <TabsList className="w-full grid grid-cols-3 shrink-0 rounded-none border-b bg-transparent h-auto p-0">
          <TabsTrigger value="about" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">About</TabsTrigger>
          <TabsTrigger value="resume" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">Resume</TabsTrigger>
          <TabsTrigger value="interview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">Interview</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 min-h-0 min-w-0 overflow-hidden">
          <div className="p-4">
            <TabsContent value="about" className="mt-0 space-y-6">
              <JDSection application={application} onUpdate={onJDUpdate} />
              <ScoreSection
                matchResult={matchResult}
                userRanking={userRanking}
                application={application}
                reviews={reviews}
                isLoading={isLoadingScore}
                onRefreshScore={onSearchReviews}
                isRefreshingScore={isSearchingReviews}
              />
              <ReviewsSection
                reviews={reviews}
                isLoading={isLoadingReviews}
                companyName={application.company_name}
                sourceResults={sourceResults}
                lastSearchedAt={lastSearchedAt}
                onSearchReviews={onSearchReviews}
                onAddReview={onAddReview}
                isSearching={isSearchingReviews}
              />
            </TabsContent>
            <TabsContent value="resume" className="mt-0">
              <ResumeSection
                application={application}
                resumeVersionId={effectiveResumeVersionId}
                sourceResume={sourceResume}
                sourceResumeName={sourceResumeName}
                tailoredResume={tailoredResume}
                tailoredText={tailoredText}
                savingTailoredResume={savingTailoredResume}
                onTailoredTextChange={setTailoredText}
                onSaveTailoredResume={saveTailoredResume}
                onStrengthenResume={strengthenResume}
              />
            </TabsContent>
            <TabsContent value="interview" className="mt-0">
              <InterviewSection
                companyName={application.company_name}
                position={application.position}
                resumeText={tailoredText || sourceResume?.base_plain_text || ""}
                interviews={interviews}
                aggregated={interviewAggregated}
                isSearching={isSearchingInterviews}
                sourceResults={interviewSourceResults}
                lastSearchedAt={lastInterviewSearchedAt}
                onSearchInterviews={onSearchInterviews}
              />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </>
  );
}

export function ApplicationDetailDrawer({
  application,
  open,
  onOpenChange,
  onApplicationUpdate,
}: ApplicationDetailDrawerProps) {
  const isMobile = useIsMobile();
  const [reviews, setReviews] = useState<CompanyReview[]>([]);
  const [userRanking, setUserRanking] = useState<ValueRanking | null>(null);
  const [matchResult, setMatchResult] = useState<ValueMatchResult | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isLoadingScore, setIsLoadingScore] = useState(false);
  const [currentApplication, setCurrentApplication] =
    useState<JobApplication | null>(null);
  const [isSearchingReviews, setIsSearchingReviews] = useState(false);
  const [sourceResults, setSourceResults] = useState<
    Record<ReviewSource, SourceResult> | undefined
  >(undefined);
  const [lastSearchedAt, setLastSearchedAt] = useState<string | undefined>(
    undefined
  );
  const autoReviewSearchAttempted = useRef(false);

  // 面試經驗狀態
  const [interviews, setInterviews] = useState<InterviewExperience[]>([]);
  const [interviewAggregated, setInterviewAggregated] = useState<InterviewAggregated | undefined>(undefined);
  const [isSearchingInterviews, setIsSearchingInterviews] = useState(false);
  const [interviewSourceResults, setInterviewSourceResults] = useState<
    Record<InterviewSource, InterviewSourceResult> | undefined
  >(undefined);
  const [lastInterviewSearchedAt, setLastInterviewSearchedAt] = useState<string | undefined>(
    undefined
  );

  // 同步 application prop 到本地狀態
  useEffect(() => {
    setCurrentApplication(application);
    autoReviewSearchAttempted.current = false;
  }, [application]);

  // 當打開時載入數據 (mobile: when open, desktop: when application changes)
  useEffect(() => {
    const shouldLoad = isMobile ? open && application : !!application;
    if (shouldLoad && application) {
      loadData(application);
    }
  }, [open, application, isMobile]);

  const loadData = async (app: JobApplication) => {
    // 載入公司評論
    setIsLoadingReviews(true);
    try {
      const reviewsData = await getCompanyReviewsByName(app.company_name);
      setReviews(reviewsData || []);
    } catch (error) {
      console.error("Failed to load reviews:", error);
      setReviews([]);
    } finally {
      setIsLoadingReviews(false);
    }

    // 載入用戶價值觀排序並計算匹配分數
    setIsLoadingScore(true);
    try {
      const ranking = await getValueRanking();
      setUserRanking(ranking);

      if (ranking && ranking.top_values && ranking.top_values.length > 0) {
        // 獲取評論用於計算分數
        const reviewsData = await getCompanyReviewsByName(app.company_name);
        if (reviewsData && reviewsData.length > 0) {
          const result = calculateValueMatch(ranking.top_values, reviewsData, getJobEvidenceText(app));
          setMatchResult(result);
        if (app.value_scores?.status !== "calculated") {
          const valueScores = Object.fromEntries(result.breakdown.map((item) => [item.valueId, {
            score: Math.round(item.contributedScore / 10),
            source: "reviews" as const,
            confidence: result.confidence,
            reasoning: `${item.valueName} based on company review signals`,
          }]));
          const updated = await updateJobApplication(app.id, {
            value_scores: {
              status: "calculated",
              calculatedAt: new Date().toISOString(),
              scores: valueScores,
            weightedScore: result.matchScore,
              rankingSnapshot: ranking.top_values,
            },
          });
          if (updated) onApplicationUpdate?.(updated);
        }
        } else {
          setMatchResult(null);
        }
      }
    } catch (error) {
      console.error("Failed to load value ranking:", error);
      setUserRanking(null);
      setMatchResult(null);
    } finally {
      setIsLoadingScore(false);
    }
  };

  // Reviews and value ranking load independently. Recalculate whenever both
  // are available so a fast review search cannot race past the ranking load.
  useEffect(() => {
    const ranking = userRanking;
    const app = currentApplication;
    if (!app || !ranking?.top_values?.length || reviews.length === 0) {
      if (ranking && !ranking.top_values?.length) setMatchResult(null);
      return;
    }

    const result = calculateValueMatch(ranking.top_values, reviews, getJobEvidenceText(app));
    setMatchResult(result);

    const scoreIsCurrent = app.value_scores?.status === "calculated"
      && app.value_scores.weightedScore === result.matchScore
      && JSON.stringify(app.value_scores.rankingSnapshot || []) === JSON.stringify(ranking.top_values);
    if (scoreIsCurrent) return;
    const valueScores = Object.fromEntries(result.breakdown.map((item) => [item.valueId, {
      score: Math.round(item.contributedScore / 10),
      source: "reviews" as const,
      confidence: result.confidence,
      reasoning: `${item.valueName} based on company review signals`,
    }]));
    void updateJobApplication(app.id, {
      value_scores: {
        status: "calculated",
        calculatedAt: new Date().toISOString(),
        scores: valueScores,
        weightedScore: result.matchScore,
        rankingSnapshot: ranking.top_values,
      },
    }).then((updated) => {
      if (updated) onApplicationUpdate?.(updated);
    }).catch((error) => console.error("Failed to persist value match score:", error));
  }, [currentApplication, reviews, userRanking, onApplicationUpdate]);

  // When a company has no cached reviews, start the configured crawlers as
  // soon as its detail panel opens so the user does not need a second action.
  useEffect(() => {
    if (!currentApplication || !open || reviews.length > 0 || isSearchingReviews || autoReviewSearchAttempted.current) return;
    autoReviewSearchAttempted.current = true;
    handleSearchReviews();
  }, [currentApplication?.id, open]);

  // 搜尋公司評論
  const getCompanyRating = (reviewItems: CompanyReview[]) => {
    if (reviewItems.length === 0) return null;
    const average = reviewItems.reduce((total, review) => {
      return total + (review.sentiment_score ?? (review.sentiment === "positive" ? 85 : review.sentiment === "negative" ? 25 : 55));
    }, 0) / reviewItems.length;
    return Math.max(1, Math.min(10, Math.round(average / 10)));
  };

  const persistReviewScores = async (app: JobApplication, reviewItems: CompanyReview[]) => {
    const rating = getCompanyRating(reviewItems);
    if (rating === null) return;
    const updated = await updateJobApplication(app.id, { rating_happiness: rating });
    if (updated) {
      setCurrentApplication(updated);
      onApplicationUpdate?.(updated);
    }
  };

  const handleSearchReviews = useCallback(async () => {
    if (!currentApplication) return;

    setIsSearchingReviews(true);
    setSourceResults(undefined);

    try {
      const response = await fetch("/api/companies/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: currentApplication.company_name,
          sources: ["glassdoor", "indeed", "comparably", "medium"],
          forceRefresh: true,
          limit: 10,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // 轉換 API 回傳的評論格式
        const apiReviews = result.data.reviews.map(
          (r: Record<string, unknown>) => ({
            id: r.id as string,
            company_id: currentApplication.company_id || "",
            source: r.source as string,
            source_url: r.sourceUrl as string,
            title: r.title as string,
            content: r.content as string,
            sentiment: r.sentiment as string | null,
            sentiment_score: r.sentimentScore as number | null,
            author: r.author as string,
            published_at: r.publishedAt as string,
            scraped_at: r.scrapedAt as string,
            created_at: new Date().toISOString(),
          })
        ) as CompanyReview[];

        setReviews(apiReviews);
        setSourceResults(result.data.sourceResults);
        setLastSearchedAt(result.data.crawledAt);
        await persistReviewScores(currentApplication, apiReviews);

        // 重新計算價值匹配分數
        if (userRanking && userRanking.top_values && apiReviews.length > 0) {
          const matchResult = calculateValueMatch(
            userRanking.top_values,
            apiReviews,
            getJobEvidenceText(currentApplication)
          );
          setMatchResult(matchResult);
        }
        if (apiReviews.length === 0) {
          setMatchResult(null);
          toast.warning("查詢完成，但目前沒有可用的公司評論，因此無法計算分數");
        } else {
          toast.success(`已取得 ${apiReviews.length} 則評論並重新計算分數`);
        }
      } else {
        setReviews([]);
        setMatchResult(null);
        const warning = result?.data?.warnings?.[0]?.message;
        throw new Error(result?.error || warning || "公司評論查詢失敗，請稍後再試");
      }
    } catch (error) {
      console.error("Failed to search reviews:", error);
      toast.error(error instanceof Error ? error.message : "公司評論查詢失敗，請稍後再試");
    } finally {
      setIsSearchingReviews(false);
    }
  }, [currentApplication, userRanking]);

  const handleAddReview = useCallback(async (review: { title: string; content: string; sentiment: "positive" | "neutral" | "negative" }) => {
    if (!currentApplication) return;
    const sentimentScore = review.sentiment === "positive" ? 85 : review.sentiment === "negative" ? 25 : 55;
    const saved = await createCompanyReview({
      company_id: currentApplication.company_id || "",
      company_name: currentApplication.company_name,
      source: "manual",
      source_url: null,
      title: review.title || null,
      content: review.content,
      sentiment: review.sentiment,
      sentiment_score: sentimentScore,
      author: "user",
      published_at: null,
      scraped_at: new Date().toISOString(),
    });
    if (!saved) throw new Error("評論儲存失敗");
    const nextReviews = [saved, ...reviews.filter((item) => item.id !== saved.id)];
    setReviews(nextReviews);
    const updates: Record<string, unknown> = { rating_happiness: getCompanyRating(nextReviews) };
    if (userRanking?.top_values?.length) {
      const match = calculateValueMatch(userRanking.top_values, nextReviews, getJobEvidenceText(currentApplication));
      setMatchResult(match);
      updates.value_scores = {
        status: "calculated",
        calculatedAt: new Date().toISOString(),
        scores: Object.fromEntries(match.breakdown.map((item) => [item.valueId, {
          score: Math.round(item.contributedScore / 10),
          source: "reviews" as const,
          confidence: match.confidence,
          reasoning: `${item.valueName} based on company review signals`,
        }])),
        weightedScore: match.matchScore,
        rankingSnapshot: userRanking.top_values,
      };
    }
    const updated = await updateJobApplication(currentApplication.id, updates as never);
    if (updated) {
      setCurrentApplication(updated);
      onApplicationUpdate?.(updated);
    }
    toast.success("評論已新增，分數正在重新計算");
  }, [currentApplication, reviews, userRanking, onApplicationUpdate]);

  // 搜尋面試經驗
  const handleSearchInterviews = useCallback(async () => {
    if (!currentApplication) return;

    setIsSearchingInterviews(true);
    setInterviewSourceResults(undefined);

    try {
      const response = await fetch("/api/companies/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: currentApplication.company_name,
          contentType: "interviews",
          sources: ["dcard", "ptt", "qollie", "medium"],
          forceRefresh: true,
          limit: 10,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // 轉換 API 回傳的面試經驗格式
        const apiInterviews = result.data.interviews.map(
          (i: Record<string, unknown>) => ({
            id: i.id as string,
            company_id: i.company_id as string | null,
            company_name: i.company_name as string,
            source: i.source as InterviewSource,
            source_url: i.source_url as string | null,
            title: i.title as string | null,
            content: i.content as string,
            position: i.position as string | null,
            stages: (i.stages as unknown[]) || [],
            questions: (i.questions as string[]) || [],
            difficulty: i.difficulty as "easy" | "medium" | "hard" | null,
            outcome: i.outcome as "offer" | "rejected" | "ghosted" | "unknown" | null,
            tips: (i.tips as string[]) || [],
            sentiment: i.sentiment as "positive" | "neutral" | "negative" | null,
            sentiment_score: i.sentiment_score as number | null,
            author: i.author as string | null,
            published_at: i.published_at as string | null,
            scraped_at: i.scraped_at as string,
            created_at: i.created_at as string || new Date().toISOString(),
          })
        ) as InterviewExperience[];

        setInterviews(apiInterviews);
        setInterviewSourceResults(result.data.sourceResults);
        setInterviewAggregated(result.data.aggregated);
        setLastInterviewSearchedAt(result.data.crawledAt);

        // 將公司題目同步到共用面試題庫，讓 Interview Prep 可以集中練習。
        const questions = Array.from(new Set(apiInterviews.flatMap((item) => item.questions || [])));
        await Promise.all(questions.map((question) => createInterviewQuestion({
          company_id: currentApplication.company_id,
          question,
          category: "other",
          difficulty: "medium",
          is_public: false,
        })));
      }
    } catch (error) {
      console.error("Failed to search interviews:", error);
    } finally {
      setIsSearchingInterviews(false);
    }
  }, [currentApplication]);

  // 處理 JD 更新
  const handleJDUpdate = async (updates: {
    jd_content: Record<string, unknown>;
    jd_keywords: string[];
    jd_content_zh?: JDContentZh | null;
  }) => {
    if (!currentApplication) return;

    try {
      await updateJobApplication(currentApplication.id, {
        jd_content: updates.jd_content,
        jd_keywords: updates.jd_keywords,
        ...(updates.jd_content_zh !== undefined && {
          jd_content_zh: updates.jd_content_zh,
        }),
      });

      // 更新本地狀態
      const updatedApp = {
        ...currentApplication,
        jd_content: updates.jd_content,
        jd_keywords: updates.jd_keywords,
        ...(updates.jd_content_zh !== undefined && {
          jd_content_zh: updates.jd_content_zh,
        }),
        updated_at: new Date().toISOString(),
      };
      setCurrentApplication(updatedApp);

      // 通知父組件
      onApplicationUpdate?.(updatedApp);
    } catch (error) {
      console.error("Failed to update JD:", error);
      throw error;
    }
  };

  // Mobile: render as bottom Sheet
  if (isMobile) {
    if (!currentApplication) return null;

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[min(90dvh,760px)] max-h-[90dvh] min-h-0 overflow-hidden rounded-t-2xl p-0 flex flex-col"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{currentApplication.company_name}</SheetTitle>
            <SheetDescription>{currentApplication.position}</SheetDescription>
          </SheetHeader>
          <ApplicationDetailContent
            application={currentApplication}
            reviews={reviews}
            userRanking={userRanking}
            matchResult={matchResult}
            isLoadingReviews={isLoadingReviews}
            isLoadingScore={isLoadingScore}
            isSearchingReviews={isSearchingReviews}
            sourceResults={sourceResults}
            lastSearchedAt={lastSearchedAt}
            onSearchReviews={handleSearchReviews}
            onAddReview={handleAddReview}
            onJDUpdate={handleJDUpdate}
            interviews={interviews}
            interviewAggregated={interviewAggregated}
            isSearchingInterviews={isSearchingInterviews}
            interviewSourceResults={interviewSourceResults}
            lastInterviewSearchedAt={lastInterviewSearchedAt}
            onSearchInterviews={handleSearchInterviews}
          />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: render inline panel
  if (!currentApplication) {
    return <EmptyStatePanel />;
  }

  return (
    <div data-application-detail-panel className="w-[min(380px,calc(100vw-1rem))] min-w-[280px] max-w-full min-h-0 rounded-2xl bg-card border shadow-lg flex flex-col h-full max-h-full overflow-hidden shrink-0">
      <ApplicationDetailContent
        application={currentApplication}
        reviews={reviews}
        userRanking={userRanking}
        matchResult={matchResult}
        isLoadingReviews={isLoadingReviews}
        isLoadingScore={isLoadingScore}
        isSearchingReviews={isSearchingReviews}
        sourceResults={sourceResults}
        lastSearchedAt={lastSearchedAt}
        onSearchReviews={handleSearchReviews}
        onAddReview={handleAddReview}
        onJDUpdate={handleJDUpdate}
        interviews={interviews}
        interviewAggregated={interviewAggregated}
        isSearchingInterviews={isSearchingInterviews}
        interviewSourceResults={interviewSourceResults}
        lastInterviewSearchedAt={lastInterviewSearchedAt}
        onSearchInterviews={handleSearchInterviews}
      />
    </div>
  );
}
