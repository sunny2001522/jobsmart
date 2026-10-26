"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Check, FileText, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { JDSection } from "./drawer-sections/jd-section";
import { ReviewsSection } from "./drawer-sections/reviews-section";
import {
  ScoreSection,
  type ValueMatchResult,
} from "./drawer-sections/score-section";
import { InterviewSection } from "./drawer-sections/interview-section";
import {
  getCompanyReviewsByName,
  getValueRanking,
  updateJobApplication,
  getVersionJobResume,
  updateVersionJobResume,
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
import type { VersionJobResume } from "@/lib/turso/types";
import { APPLICATION_STATUS_LABELS } from "@/types";

type ReviewSource = "dcard" | "qollie" | "ptt" | "medium";

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
  onSubmitApplication: () => Promise<void>;
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
  onJDUpdate,
  interviews,
  interviewAggregated,
  isSearchingInterviews,
  interviewSourceResults,
  lastInterviewSearchedAt,
  onSearchInterviews,
  onSubmitApplication,
}: ApplicationDetailContentProps) {
  const metadata = application as JobApplication & Record<string, unknown>;
  const resumeStatus = String(metadata.resume_status || "ready");
  const coverLetterStatus = String(metadata.cover_letter_status || "ready");
  const resumeVersionId = String(metadata.resume_version_id || "");
  const [tailoredResume, setTailoredResume] = useState<VersionJobResume | null>(null);
  const [tailoredText, setTailoredText] = useState("");
  const [savingTailoredResume, setSavingTailoredResume] = useState(false);
  useEffect(() => {
    let current = true;
    if (!resumeVersionId) {
      setTailoredResume(null);
      setTailoredText("");
      return () => { current = false; };
    }
    getVersionJobResume(resumeVersionId, application.id).then((result) => {
      if (!current) return;
      setTailoredResume(result);
      setTailoredText(result?.customized_plain_text || "");
    }).catch((error) => console.error("Failed to load tailored resume", error));
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
  const legacyLinkedInTitle = application.position.match(/^(.+?)\s+at\s+(.+?)(?:\s+[—|-].*)?$/i);
  const displayPosition = legacyLinkedInTitle && /linkedin\.com/i.test(application.company_name) ? legacyLinkedInTitle[1].trim() : application.position;
  const displayCompany = legacyLinkedInTitle && /linkedin\.com/i.test(application.company_name) ? legacyLinkedInTitle[2].trim() : (/linkedin\.com/i.test(application.company_name) ? "LinkedIn 職缺" : application.company_name);
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

      {application.status === "editing" && <div className="border-b p-4">
        <div className="mb-3"><p className="text-sm font-medium">投遞準備</p><p className="mt-1 text-xs text-muted-foreground">送出前請檢查履歷與原始職缺頁；JobSmart 不會代替你提交申請。</p></div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border p-2"><p className="text-muted-foreground">履歷</p><p className="mt-1 flex items-center gap-1 font-medium">{resumeStatus === "generating" && <Loader2 className="h-3 w-3 animate-spin" />}{resumeStatus === "generating" ? "草稿生成中" : resumeStatus === "needs_review" ? "待你審核" : resumeStatus === "ready" ? "請檢查履歷" : "尚未準備"}</p></div>
          <div className="rounded border p-2"><p className="text-muted-foreground">求職信</p><p className="mt-1 font-medium">{coverLetterStatus === "not_created" ? "尚未建立" : coverLetterStatus === "generating" ? "準備中" : "可自行補充"}</p></div>
        </div>
        {tailoredResume?.customized_plain_text && <details className="mt-3 rounded-lg border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-medium"><span>客製履歷草稿 · 待你審核</span><span className="text-muted-foreground">ATS {tailoredResume.ats_score ?? "—"}/100</span></summary>
          <div className="space-y-2 border-t p-3">
            <p className="text-[11px] leading-5 text-muted-foreground">已匹配：{tailoredResume.matched_keywords?.join("、") || "—"}<br />尚未涵蓋：{tailoredResume.missing_keywords?.join("、") || "—"}</p>
            <Textarea aria-label="客製履歷草稿" value={tailoredText} onChange={(event) => setTailoredText(event.target.value)} rows={10} className="resize-y text-xs leading-5" />
            <Button size="sm" className="w-full" variant="secondary" disabled={savingTailoredResume || tailoredText === tailoredResume.customized_plain_text} onClick={saveTailoredResume}>{savingTailoredResume ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}{savingTailoredResume ? "儲存中" : "儲存草稿修改"}</Button>
          </div>
        </details>}
        {application.jd_url && <Button className="mt-3 w-full" size="sm" variant="outline" asChild><a href={application.jd_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />開啟職缺原頁</a></Button>}
        <Button className="mt-2 w-full" size="sm" onClick={onSubmitApplication}><Check className="mr-2 h-4 w-4" />我已親自送出申請</Button>
      </div>}

      <Tabs defaultValue="jd" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full grid grid-cols-4 shrink-0 rounded-none border-b bg-transparent h-auto p-0">
          <TabsTrigger
            value="jd"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
          >
            JD
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
          >
            評論
          </TabsTrigger>
          <TabsTrigger
            value="score"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
          >
            分數
          </TabsTrigger>
          <TabsTrigger
            value="interview"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
          >
            面試
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <TabsContent value="jd" className="mt-0">
              <JDSection application={application} onUpdate={onJDUpdate} />
            </TabsContent>
            <TabsContent value="reviews" className="mt-0">
              <ReviewsSection
                reviews={reviews}
                isLoading={isLoadingReviews}
                companyName={application.company_name}
                sourceResults={sourceResults}
                lastSearchedAt={lastSearchedAt}
                onSearchReviews={onSearchReviews}
                isSearching={isSearchingReviews}
              />
            </TabsContent>
            <TabsContent value="score" className="mt-0">
              <ScoreSection
                matchResult={matchResult}
                userRanking={userRanking}
                application={application}
                isLoading={isLoadingScore}
              />
            </TabsContent>
            <TabsContent value="interview" className="mt-0">
              <InterviewSection
                companyName={application.company_name}
                position={application.position}
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
          const result = calculateValueMatch(ranking.top_values, reviewsData);
          setMatchResult(result);
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

  // 搜尋公司評論
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
          sources: ["dcard", "qollie", "ptt", "medium"],
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

        // 重新計算價值匹配分數
        if (userRanking && userRanking.top_values && apiReviews.length > 0) {
          const matchResult = calculateValueMatch(
            userRanking.top_values,
            apiReviews
          );
          setMatchResult(matchResult);
        }
      }
    } catch (error) {
      console.error("Failed to search reviews:", error);
    } finally {
      setIsSearchingReviews(false);
    }
  }, [currentApplication, userRanking]);

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

  const handleSubmitApplication = async () => {
    if (!currentApplication) return;
    if (!window.confirm("確認你已在職缺原頁檢查資料並親自送出申請？")) return;
    const updatedAt = new Date().toISOString();
    await updateJobApplication(currentApplication.id, { status: "applied", applied_at: updatedAt });
    const updatedApp = { ...currentApplication, status: "applied" as const, applied_at: updatedAt, updated_at: updatedAt };
    setCurrentApplication(updatedApp);
    onApplicationUpdate?.(updatedApp);
  };

  // Mobile: render as bottom Sheet
  if (isMobile) {
    if (!currentApplication) return null;

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[85vh] rounded-t-2xl p-0 flex flex-col"
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
            onJDUpdate={handleJDUpdate}
            interviews={interviews}
            interviewAggregated={interviewAggregated}
            isSearchingInterviews={isSearchingInterviews}
            interviewSourceResults={interviewSourceResults}
            lastInterviewSearchedAt={lastInterviewSearchedAt}
            onSearchInterviews={handleSearchInterviews}
            onSubmitApplication={handleSubmitApplication}
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
    <div className="w-[340px] min-w-[280px] rounded-2xl bg-card border shadow-lg flex flex-col h-full overflow-hidden shrink-0">
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
        onJDUpdate={handleJDUpdate}
        interviews={interviews}
        interviewAggregated={interviewAggregated}
        isSearchingInterviews={isSearchingInterviews}
        interviewSourceResults={interviewSourceResults}
        lastInterviewSearchedAt={lastInterviewSearchedAt}
        onSearchInterviews={handleSearchInterviews}
        onSubmitApplication={handleSubmitApplication}
      />
    </div>
  );
}
