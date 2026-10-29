"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { localizedToast as toast } from "@/lib/i18n/toast";
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
import { calculateValueMatch, getCompleteValueRanking } from "@/lib/values/matcher";
import { FACTOR_ORDER } from "@/lib/values/factors-config";
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
  JobValueScores,
  ValueVerdict,
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

function flattenEvidenceText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(flattenEvidenceText).filter(Boolean).join(" ");
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, nestedValue]) => {
        const nestedText = flattenEvidenceText(nestedValue);
        return nestedText ? `${key} ${nestedText}` : "";
      })
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function getJobEvidenceText(application: JobApplication): string {
  return flattenEvidenceText({
    jobDescription: application.jd_content,
    translatedDescription: application.jd_content_zh,
    keywords: application.jd_keywords,
    location: application.work_location,
    salary: application.salary_min || application.salary_max
      ? `${application.salary_min ?? ""} ${application.salary_max ?? ""} ${application.salary_currency || ""}`
      : null,
    benefits: application.benefits,
  });
}

function getRankingValues(ranking: ValueRanking | null): string[] {
  const savedRanking = ranking?.full_ranking?.length
    ? ranking.full_ranking
    : ranking?.top_values || [];
  return getCompleteValueRanking(savedRanking);
}

function buildStoredValueScores(result: ValueMatchResult, ranking: string[], manualVerdicts: JobValueScores["manualVerdicts"] = {}): JobValueScores {
  const breakdownById = new Map(result.breakdown.map((item) => [item.valueId, item]));
  const scores = Object.fromEntries(FACTOR_ORDER.map((valueId) => {
    const item = breakdownById.get(valueId);
    return [valueId, item ? {
      score: Math.round(item.score) / 10,
      source: item.source === "none" ? "user" : item.source,
      confidence: item.source === "none" ? "none" : result.confidence,
      reasoning: item.source === "none"
        ? `No JD/review evidence; rank bonus only (+${item.priorityBonus})`
        : `Evidence score with a +${item.priorityBonus} rank bonus`,
    } : {
      score: null,
      source: "default" as const,
      confidence: "none" as const,
    }];
  })) as JobValueScores["scores"];

  return {
    status: result.breakdown.length > 0 ? "calculated" : "not_calculated",
    calculatedAt: result.breakdown.length > 0 ? new Date().toISOString() : null,
    scores,
    weightedScore: result.breakdown.length > 0 ? Math.round(result.matchScore) / 10 : null,
    rankingSnapshot: ranking,
    manualVerdicts,
  };
}

function valueScoresAreCurrent(application: JobApplication, next: JobValueScores): boolean {
  const current = application.value_scores;
  return current?.status === next.status
    && current.weightedScore === next.weightedScore
    && JSON.stringify(current.scores || {}) === JSON.stringify(next.scores)
    && JSON.stringify(current.rankingSnapshot || []) === JSON.stringify(next.rankingSnapshot || [])
    && JSON.stringify(current.manualVerdicts || {}) === JSON.stringify(next.manualVerdicts || {});
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
  onVerdictChange: (valueId: string, verdict: ValueVerdict) => Promise<void>;
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
  onVerdictChange,
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
  const [isGeneratingTailored, setIsGeneratingTailored] = useState(false);
  const autoGeneratedResumeKey = useRef<string | null>(null);
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

  useEffect(() => {
    const generationKey = `${effectiveResumeVersionId}:${application.id}`;
    if (
      activeTab !== "resume" ||
      !effectiveResumeVersionId ||
      !sourceResume?.base_plain_text?.trim() ||
      !tailoredResume ||
      tailoredResume.customized_plain_text ||
      tailoredResume.generation_status === "generating" ||
      autoGeneratedResumeKey.current === generationKey
    ) return;

    autoGeneratedResumeKey.current = generationKey;
    setIsGeneratingTailored(true);
    void (async () => {
      try {
        const response = await fetch("/api/resume/customize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ versionId: effectiveResumeVersionId, jobApplicationId: application.id }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "履歷客製化失敗");
        const refreshed = await getVersionJobResume(effectiveResumeVersionId, application.id);
        setTailoredResume(refreshed);
        setTailoredText(refreshed?.customized_plain_text || "");
        if (result.data?.baseAtsScore !== undefined) {
          setSourceResume((current) => current ? { ...current, base_ats_score: result.data.baseAtsScore } : current);
        }
        toast.success("已根據 JD 產生客製履歷");
      } catch (error) {
        autoGeneratedResumeKey.current = null;
        toast.error(error instanceof Error ? error.message : "履歷客製化失敗");
      } finally {
        setIsGeneratingTailored(false);
      }
    })();
  }, [activeTab, application.id, effectiveResumeVersionId, sourceResume, tailoredResume]);
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
    <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden">
      <div className="w-full min-w-0 max-w-full shrink-0 border-b p-4">
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
        className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden"
      >
        <TabsList className="grid w-full min-w-0 shrink-0 grid-cols-3">
          <TabsTrigger value="about" className="min-w-0">About</TabsTrigger>
          <TabsTrigger value="resume" className="min-w-0">Resume</TabsTrigger>
          <TabsTrigger value="interview" className="min-w-0">Interview</TabsTrigger>
        </TabsList>

        <ScrollArea className="min-h-0 min-w-0 w-full max-w-full flex-1 overflow-x-hidden">
          <div className="min-w-0 w-full max-w-full overflow-x-hidden p-4 pr-8">
            <TabsContent value="about" className="mt-0 space-y-6">
              <JDSection application={application} onUpdate={onJDUpdate} />
              <ScoreSection
                matchResult={matchResult}
                userRanking={userRanking}
                reviews={reviews}
                isLoading={isLoadingScore}
                onRefreshScore={onSearchReviews}
                isRefreshingScore={isSearchingReviews}
                manualVerdicts={application.value_scores?.manualVerdicts}
                onVerdictChange={(valueId, verdict) => void onVerdictChange(valueId, verdict)}
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
                isGeneratingTailored={isGeneratingTailored}
                coverLetter={(() => {
                  const value = (application as typeof application & { cover_letter?: unknown }).cover_letter;
                  return value && typeof value === "object" ? value as import("@/types").CoverLetterDraft : null;
                })()}
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
    </div>
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
    setReviews([]);
    setMatchResult(null);
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
      const rankingValues = getRankingValues(ranking);

      if (rankingValues.length > 0) {
        // 獲取評論用於計算分數
        const reviewsData = (await getCompanyReviewsByName(app.company_name)) || [];
        const result = calculateValueMatch(rankingValues, reviewsData, getJobEvidenceText(app));
        setMatchResult(result);
        const valueScores = buildStoredValueScores(result, rankingValues, app.value_scores?.manualVerdicts);
        if (!valueScoresAreCurrent(app, valueScores)) {
          const updated = await updateJobApplication(app.id, { value_scores: valueScores });
          if (updated) onApplicationUpdate?.(updated);
        }
      } else {
        setMatchResult(null);
      }
    } catch (error) {
      console.error("Failed to load value ranking:", error);
      setUserRanking(null);
      setMatchResult(null);
    } finally {
      setIsLoadingScore(false);
    }
  };

  // Recalculate from whichever evidence is available: the JD, reviews, or both.
  useEffect(() => {
    const ranking = userRanking;
    const app = currentApplication;
    const rankingValues = getRankingValues(ranking);
    if (!app || rankingValues.length === 0) {
      if (ranking) setMatchResult(null);
      return;
    }

    const result = calculateValueMatch(rankingValues, reviews, getJobEvidenceText(app));
    setMatchResult(result);

    const valueScores = buildStoredValueScores(result, rankingValues, app.value_scores?.manualVerdicts);
    if (valueScoresAreCurrent(app, valueScores)) return;
    void updateJobApplication(app.id, {
      value_scores: valueScores,
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

        // The ranking/evidence effect recalculates using reviews and JD data.
        if (apiReviews.length === 0) {
          toast.warning("沒有找到公司評論；有職缺資料的項目仍會依 JD 計分");
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
    const rankingValues = getRankingValues(userRanking);
    if (rankingValues.length > 0) {
      const match = calculateValueMatch(rankingValues, nextReviews, getJobEvidenceText(currentApplication));
      setMatchResult(match);
      updates.value_scores = buildStoredValueScores(match, rankingValues, currentApplication.value_scores?.manualVerdicts);
    }
    const updated = await updateJobApplication(currentApplication.id, updates as never);
    if (updated) {
      setCurrentApplication(updated);
      onApplicationUpdate?.(updated);
    }
    toast.success("評論已新增，分數正在重新計算");
  }, [currentApplication, reviews, userRanking, onApplicationUpdate]);

  const handleVerdictChange = useCallback(async (valueId: string, verdict: ValueVerdict) => {
    if (!currentApplication) return;
    const existing = currentApplication.value_scores;
    const valueScores: JobValueScores = {
      status: existing?.status ?? "not_calculated",
      calculatedAt: existing?.calculatedAt ?? null,
      scores: existing?.scores ?? {},
      weightedScore: existing?.weightedScore ?? null,
      rankingSnapshot: existing?.rankingSnapshot ?? null,
      manualVerdicts: { ...existing?.manualVerdicts, [valueId]: verdict },
    };
    const updated = await updateJobApplication(currentApplication.id, { value_scores: valueScores });
    if (updated) {
      setCurrentApplication(updated);
      onApplicationUpdate?.(updated);
    }
  }, [currentApplication, onApplicationUpdate]);

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
          className="h-[min(90dvh,760px)] max-h-[90dvh] min-h-0 w-full max-w-full overflow-hidden rounded-t-2xl p-0 flex flex-col"
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
            onVerdictChange={handleVerdictChange}
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
        onVerdictChange={handleVerdictChange}
      />
    </div>
  );
}
