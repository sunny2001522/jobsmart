"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { ApplicationCard } from "@/components/kanban/application-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Eye, EyeOff, Sparkles, MoreHorizontal, Trash2, ExternalLink, Save, Search, X, Check, FileText, BriefcaseBusiness, Heart, BookmarkCheck, Send, CircleHelp } from "lucide-react";
import { localizedToast as toast } from "@/lib/i18n/toast";
import { AddApplicationDialog } from "@/components/kanban/add-application-dialog";
import { JobCategoryTabs } from "@/components/job-category-tabs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useJobCategoryContext } from "@/contexts/job-category-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/contexts/i18n-context";
import { SpotlightTour, useSpotlightTour, type SpotlightStep } from "@/components/spotlight-tour";
import {
  getJobApplications,
  createJobApplication,
  updateJobApplication,
  getResumeVersions,
  getValueRanking,
} from "@/lib/turso/db";
import type { JobApplication, ApplicationStatus, JDContentZh, CoverLetterDraft } from "@/types";
import type { ResumeVersion } from "@/lib/turso/types";
import { KANBAN_COLUMNS } from "@/types";

// 自訂碰撞偵測：優先偵測 category tabs，其次是 kanban columns
const customCollisionDetection: CollisionDetection = (args) => {
  // 先用 pointerWithin 偵測（適合小目標如 tabs）
  const pointerCollisions = pointerWithin(args);

  // 如果指標在某個 droppable 內，優先使用
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  // 否則用 rectIntersection 偵測（適合大區域如 columns）
  return rectIntersection(args);
};

const TOUR_STORAGE_KEY = "jobsmart.tour.applications.v1";
type ResumeAudit = { status: "passed" | "needs_attention"; summary: string; findings: Array<{ claim: string; status: string; evidence: string; reason: string }>; requirements: Array<{ requirement: string; priority: string; evidence: string; status: string }> };
type PreparedApplication = { applicationId: string; relationId: string; versionId: string; versionName: string; customizedContent: string; atsScore: number; matchedKeywords: string[]; missingKeywords: string[]; suggestions: string[]; audit: ResumeAudit; coverLetter: CoverLetterDraft };

const tourContent: Record<"zh-TW" | "en", { steps: SpotlightStep[]; labels: { next: string; prev: string; skip: string; done: string } }> = {
  "zh-TW": {
    labels: { next: "下一步", prev: "上一步", skip: "略過", done: "開始使用" },
    steps: [
      { target: "progress", title: "找工作進度", body: "這裡列出求職的每個步驟與完成度，點任何一步就能直接前往處理。" },
      { target: "ai-search", title: "搜尋職缺", body: "使用你儲存的關鍵字搜尋公開職缺。結果會加入「候選職缺」；確認 JD 後再建立客製履歷與求職信。" },
      { target: "add", title: "手動新增追蹤", body: "看到喜歡的職缺？貼上網址或職缺描述，JobSmart 會自動解析並加入看板。" },
      { target: "kanban", title: "求職看板", body: "拖曳卡片更新進度。在「想投遞」的卡片按「OK — 準備履歷」，AI 會依 JD 產生客製履歷讓你審核。" },
      { target: "nav", title: "更多工具", body: "在這裡切換履歷管理、面試練習與價值觀排序，先建立一份履歷才能使用 AI 客製功能。" },
      { target: "tour-replay", title: "隨時重看教學", body: "忘記怎麼用時，按這個按鈕就能再看一次導覽。" },
    ],
  },
  en: {
    labels: { next: "Next", prev: "Back", skip: "Skip", done: "Get started" },
    steps: [
      { target: "progress", title: "Your job search progress", body: "Each step of your search and how far along you are. Click any step to jump straight to it." },
      { target: "ai-search", title: "Search public jobs", body: "Searches public listings with your saved keywords. Results go to Candidate jobs for review; they are not applications." },
      { target: "add", title: "Track a job manually", body: "Found a job you like? Paste its link or description and JobSmart will parse it onto the board." },
      { target: "kanban", title: "Application board", body: "Drag cards to update their stage. On a Wishlist card, click “Prepare resume” to generate a tailored resume and cover letter for review." },
      { target: "nav", title: "More tools", body: "Switch to resumes, interview practice and values ranking here. Create a resume first to use AI tailoring." },
      { target: "tour-replay", title: "Replay this tour", body: "Click here any time to see this walkthrough again." },
    ],
  },
};

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addDialogStatus, setAddDialogStatus] = useState<ApplicationStatus>("wishlist");
  const [showAllSummaries, setShowAllSummaries] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [automationRunning, setAutomationRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [jobLeads, setJobLeads] = useState<Array<{ id: string; company: string; role: string; url: string; source: string; status: string; snippet: string }>>([]);
  const [activeLead, setActiveLead] = useState<(typeof jobLeads)[number] | null>(null);
  const [resumeVersions, setResumeVersions] = useState<ResumeVersion[]>([]);
  const [hasValueRanking, setHasValueRanking] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [jdDraft, setJdDraft] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [prepared, setPrepared] = useState<PreparedApplication | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [coverLetterDraft, setCoverLetterDraft] = useState<CoverLetterDraft | null>(null);
  const [approvedForFill, setApprovedForFill] = useState(false);
  const [creatingFillTask, setCreatingFillTask] = useState(false);
  const [preparingApplicationIds, setPreparingApplicationIds] = useState<Set<string>>(new Set());
  const [isAppliedConfirmOpen, setIsAppliedConfirmOpen] = useState(false);
  const [pendingAppliedApplicationId, setPendingAppliedApplicationId] = useState<string | null>(null);

  const { selectedCategoryId } = useJobCategoryContext();
  const isMobile = useIsMobile();
  const { locale } = useI18n();
  const tour = useSpotlightTour(TOUR_STORAGE_KEY);
  const tourCopy = tourContent[locale === "en" ? "en" : "zh-TW"];

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Active application for DragOverlay
  const activeApplication = activeId
    ? applications.find((app) => app.id === activeId)
    : null;

  // 根據選中類別過濾申請
  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return applications.filter((app) => {
      const matchesCategory = !selectedCategoryId || app.category_id === selectedCategoryId;
      const matchesSearch = !query || `${app.company_name} ${app.position} ${app.notes ?? ""}`.toLocaleLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [applications, selectedCategoryId, searchQuery]);

  // 計算每個類別的統計（總數）
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    applications.forEach((app) => {
      if (app.category_id) {
        stats[app.category_id] = (stats[app.category_id] || 0) + 1;
      }
    });
    return stats;
  }, [applications]);

  const appliedCount = useMemo(() => applications.filter((app) =>
    app.applied_at !== null || !["wishlist", "editing"].includes(app.status)
  ).length, [applications]);

  const progressSteps = useMemo(() => [
    {
      label: "增加一份履歷",
      detail: resumeVersions.length > 0 ? `${resumeVersions.length} 份履歷` : "尚未新增",
      href: "/resume",
      complete: resumeVersions.length > 0,
      icon: FileText,
    },
    {
      label: "設定要找的工作",
      detail: resumeVersions.some((version) => Boolean(version.target_role?.trim())) ? "已設定" : "尚未設定",
      href: "/resume",
      complete: resumeVersions.some((version) => Boolean(version.target_role?.trim())),
      icon: BriefcaseBusiness,
    },
    {
      label: "排價值觀卡牌",
      detail: hasValueRanking ? "已完成" : "可以跳過",
      href: "/values",
      complete: hasValueRanking,
      optional: true,
      icon: Heart,
    },
    {
      label: "儲存 10 個職缺",
      detail: `${Math.min(applications.length, 10)} / 10`,
      href: "/applications",
      complete: applications.length >= 10,
      icon: BookmarkCheck,
    },
    {
      label: "投出 10 份履歷",
      detail: `${Math.min(appliedCount, 10)} / 10`,
      href: "/applications",
      complete: appliedCount >= 10,
      icon: Send,
    },
  ], [applications.length, appliedCount, hasValueRanking, resumeVersions]);

  const requiredProgress = useMemo(() => {
    const requiredSteps = progressSteps.filter((step) => !step.optional);
    return Math.round((requiredSteps.filter((step) => step.complete).length / requiredSteps.length) * 100);
  }, [progressSteps]);

  const handleAddClick = (status: ApplicationStatus) => {
    if (status === "applied") {
      toast.info("請先新增職缺；親自送出申請後再拖入「已投遞」欄確認");
      return;
    }
    setAddDialogStatus(status);
    setIsAddDialogOpen(true);
  };

  // 從數據庫載入資料
  const loadApplications = useCallback(async () => {
    try {
      const data = await getJobApplications();
      setApplications(data);
    } catch (error) {
      console.error("Failed to load applications:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAutomation = useCallback(async () => {
    try {
      const [queueResponse, versions, valueRanking] = await Promise.all([
        fetch("/api/automation/queue"),
        getResumeVersions(),
        getValueRanking(),
      ]);
      if (queueResponse.ok) {
        const rows = (await queueResponse.json()).data as typeof jobLeads;
        setJobLeads(rows.filter((lead, index, all) => all.findIndex((item) => item.url === lead.url) === index));
      }
      setResumeVersions(versions);
      setHasValueRanking(Boolean(valueRanking));
      setSelectedVersionId((current) => current || versions.find((version) => version.is_active)?.id || versions[0]?.id || "");
    } catch (error) { console.error("Failed to load automation:", error); }
  }, []);

  useEffect(() => {
    loadAutomation().then(loadApplications);
  }, [loadApplications, loadAutomation]);

  const runAutomation = async () => {
    setAutomationRunning(true);
    try {
      const response = await fetch("/api/automation/run", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "搜尋失敗");
      await loadAutomation();
      await loadApplications();
      toast.success(`搜尋完成：找到 ${result.data.discovered} 筆，新加入 ${result.data.promoted} 筆候選職缺`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "搜尋失敗，請稍後重試"); }
    finally { setAutomationRunning(false); }
  };

  const openLead = (lead: (typeof jobLeads)[number]) => {
    setActiveLead(lead);
    setJdDraft(lead.snippet || "");
    setPrepared(null);
    setDraftContent("");
    setCoverLetterDraft(null);
    setApprovedForFill(false);
  };
  const closeLead = (open: boolean) => {
    if (!open && !preparing && !savingDraft) {
      setActiveLead(null);
      setPrepared(null);
      setCoverLetterDraft(null);
      setApprovedForFill(false);
    }
  };
  const prepareLead = async () => {
    if (!activeLead || !selectedVersionId) return;
    setPreparing(true);
    try {
      const response = await fetch(`/api/automation/queue/${activeLead.id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ versionId: selectedVersionId, jdContent: jdDraft }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "履歷準備失敗");
      setPrepared({ applicationId: result.data.applicationId, ...result.data.resume });
      setDraftContent(result.data.resume.customizedContent);
      setCoverLetterDraft(result.data.resume.coverLetter);
      setApprovedForFill(false);
      await Promise.all([loadAutomation(), loadApplications()]);
      toast.success("客製履歷已建立，請逐項審核");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "準備失敗，請稍後重試");
    } finally { setPreparing(false); }
  };
  const savePreparedDraft = async () => {
    if (!prepared || !coverLetterDraft) return;
    setSavingDraft(true);
    try {
      const response = await fetch("/api/resume/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ versionId: prepared.versionId, applicationId: prepared.applicationId, draft: draftContent, jdContent: jdDraft, coverLetter: coverLetterDraft }) });
      const reviewed = await response.json();
      if (!response.ok) throw new Error(reviewed.error || "履歷事實審核失敗");
      setPrepared({ ...prepared, customizedContent: draftContent, audit: reviewed.data.audit, coverLetter: coverLetterDraft });
      setApprovedForFill(false);
      toast.success("履歷與求職信已儲存；履歷事實審核已更新");
    } catch (error) { toast.error(error instanceof Error ? error.message : "儲存失敗"); }
    finally { setSavingDraft(false); }
  };
  const startLinkedInFill = async () => {
    if (!prepared || !coverLetterDraft || !approvedForFill) return;
    const linkedinUrl = activeLead?.url || "";
    if (!/^https:\/\/(?:[a-z0-9-]+\.)*linkedin\.com\//i.test(linkedinUrl)) {
      toast.error("此職缺不是 LinkedIn 網址，請開啟原職缺頁面手動操作");
      return;
    }
    const tab = window.open("about:blank", "_blank");
    if (!tab) { toast.error("瀏覽器封鎖了新分頁，請允許 JobSmart 開啟分頁後重試"); return; }
    setCreatingFillTask(true);
    try {
      const response = await fetch("/api/linkedin/extension/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: prepared.applicationId, approved: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "無法建立 LinkedIn 填表任務");
      tab.location.href = result.data.jobUrl;
      toast.success("填表任務已交給外掛；請在 LinkedIn 檢查每個欄位與附件");
    } catch (error) {
      tab.close();
      toast.error(error instanceof Error ? error.message : "無法啟動外掛填表");
    } finally { setCreatingFillTask(false); }
  };
  const markAsApplied = () => {
    if (!prepared) return;
    setPendingAppliedApplicationId(prepared.applicationId);
    setIsAppliedConfirmOpen(true);
  };
  const confirmMarkAsApplied = async () => {
    if (!pendingAppliedApplicationId) return;
    try {
      const response = await fetch("/api/applications/mark-applied", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: pendingAppliedApplicationId, confirmed: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "狀態更新失敗");
      const updated = result.data as JobApplication;
      setApplications((previous) => previous.map((application) => application.id === updated.id ? updated : application));
      toast.success("已更新為已投遞");
      setIsAppliedConfirmOpen(false);
      setPendingAppliedApplicationId(null);
      if (prepared?.applicationId === updated.id) {
        setActiveLead(null);
        setPrepared(null);
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : "更新失敗"); }
  };
  const deleteLead = async (id: string) => {
    const response = await fetch(`/api/automation/queue?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) { toast.error("刪除失敗，請重試"); return; }
    setJobLeads((prev) => prev.filter((lead) => lead.id !== id));
    toast.success("已移除候選職缺");
  };

  const approveApplication = async (application: JobApplication) => {
    if (!resumeVersions.length) {
      toast.error("請先新增你的原始履歷");
      router.push("/resume?create=1");
      return;
    }
    if (preparingApplicationIds.has(application.id)) return;
    const version = resumeVersions.find((item) => item.is_active) || resumeVersions[0];
    const toastId = `prepare-${application.id}`;
    setPreparingApplicationIds((previous) => new Set(previous).add(application.id));
    toast.loading(`正在為「${application.company_name}」客製履歷，約需 30 秒…`, { id: toastId });
    try {
      const response = await fetch("/api/applications/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application.id, versionId: version.id }),
      });
      const result = await response.json();
      if (result.data?.application) {
        setApplications((previous) => previous.map((item) => item.id === application.id ? result.data.application : item));
      }
      if (!response.ok) throw new Error(result.error || "履歷準備失敗");
      toast.success("客製履歷已建立，請逐項審核", { id: toastId });
      // 直接開啟審核視窗，讓使用者檢查草稿後前往職缺頁送出
      setActiveLead({ id: application.id, company: application.company_name, role: application.position, url: application.jd_url || "", source: "tracking", status: "prepared", snippet: result.data.jdContent });
      setJdDraft(result.data.jdContent);
      setPrepared({
        applicationId: result.data.applicationId,
        relationId: result.data.relationId,
        versionId: result.data.versionId,
        versionName: result.data.versionName,
        customizedContent: result.data.customizedContent,
        atsScore: result.data.atsScore,
        matchedKeywords: result.data.matchedKeywords,
        missingKeywords: result.data.missingKeywords,
        suggestions: result.data.suggestions,
        audit: result.data.audit,
        coverLetter: result.data.coverLetter,
      });
      setDraftContent(result.data.customizedContent);
      setCoverLetterDraft(result.data.coverLetter);
      setApprovedForFill(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "履歷準備失敗，請稍後重試", { id: toastId });
    } finally {
      setPreparingApplicationIds((previous) => {
        const nextIds = new Set(previous);
        nextIds.delete(application.id);
        return nextIds;
      });
    }
  };
  const handleStatusChange = async (applicationId: string, newStatus: ApplicationStatus) => {
    const application = applications.find((item) => item.id === applicationId);
    if (newStatus === "applied") {
      if (application?.status !== "applied") {
        setPendingAppliedApplicationId(applicationId);
        setIsAppliedConfirmOpen(Boolean(application));
      }
      return;
    }
    // Dropping a wishlist card into "Preparing" is the same explicit action
    // as pressing the card's Prepare resume button: generate both artifacts.
    if (application?.status === "wishlist" && newStatus === "editing") {
      await approveApplication(application);
      return;
    }

    // 樂觀更新 UI
    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? { ...app, status: newStatus, updated_at: new Date().toISOString() }
          : app
      )
    );

    // 同步到數據庫
    try {
      await updateJobApplication(applicationId, { status: newStatus });
    } catch (error) {
      console.error("Failed to update application status:", error);
      // 回滾
      loadApplications();
    }
  };

  const handleCategoryChange = async (applicationId: string, newCategoryId: string) => {
    // 樂觀更新 UI
    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? { ...app, category_id: newCategoryId, updated_at: new Date().toISOString() }
          : app
      )
    );

    // 同步到數據庫
    try {
      await updateJobApplication(applicationId, { category_id: newCategoryId });
    } catch (error) {
      console.error("Failed to update application category:", error);
      // 回滾
      loadApplications();
    }
  };

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over) {
      const overId = over.id as string;

      // 拖到 status column
      if (KANBAN_COLUMNS.includes(overId as ApplicationStatus)) {
        handleStatusChange(active.id as string, overId as ApplicationStatus);
      }

      // 拖到 category tab
      if (overId.startsWith("category-")) {
        const categoryId = overId.replace("category-", "");
        handleCategoryChange(active.id as string, categoryId);
      }
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleAddApplication = async (data: {
    companyName: string;
    position: string;
    jdUrl?: string;
    jdContent?: string;
    status?: ApplicationStatus;
    categoryId?: string | null;
    fetchedData?: {
      companyName: string;
      position: string;
      description: string;
      requirements: string[];
      responsibilities: string[];
      benefits: string[];
      keywords: string[];
      salary?: string;
      location?: string;
      translation?: {
        summary: string;
        summary_tags?: string[];
        requirements: string[];
        responsibilities: string[];
        benefits: string[];
        keywords_zh: string[];
        translated_at: string;
      };
    };
  }) => {
    try {
      let jdContent: Record<string, unknown> | null = null;
      let jdKeywords: string[] = [];
      let jdContentZh: JDContentZh | null = null;

      // 優先使用已抓取的資料
      if (data.fetchedData) {
        jdContent = {
          description: data.fetchedData.description,
          requirements: data.fetchedData.requirements,
          responsibilities: data.fetchedData.responsibilities,
          keywords: data.fetchedData.keywords,
          benefits: data.fetchedData.benefits,
          salary_range: data.fetchedData.salary,
          location: data.fetchedData.location,
        };
        jdKeywords = data.fetchedData.keywords;

        // 儲存中文翻譯
        if (data.fetchedData.translation) {
          jdContentZh = data.fetchedData.translation;
        }
      }
      // 如果有 JD 內容但沒有抓取資料，則解析
      else if (data.jdContent && data.jdContent.trim().length >= 10) {
        try {
          const parseResponse = await fetch("/api/jd/parse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: data.jdContent,
              url: data.jdUrl,
            }),
          });

          if (parseResponse.ok) {
            const parseResult = await parseResponse.json();
            if (parseResult.success && parseResult.data) {
              jdContent = {
                description: data.jdContent,
                requirements: parseResult.data.requirements || [],
                responsibilities: parseResult.data.responsibilities || [],
                keywords: parseResult.data.keywords || [],
                benefits: parseResult.data.benefits || [],
              };
              jdKeywords = parseResult.data.keywords || [];
            }
          }
        } catch (parseError) {
          console.error("Failed to parse JD:", parseError);
          // 即使解析失敗，也保存原始內容
          jdContent = { description: data.jdContent };
        }
      }

      const newApplication = await createJobApplication({
        company_id: null,
        company_name: data.companyName,
        position: data.position,
        jd_url: data.jdUrl || null,
        jd_content: jdContent,
        jd_content_zh: jdContentZh,
        jd_keywords: jdKeywords,
        status: data.status || "wishlist",
        rating_happiness: null,
        rating_salary_match: null,
        rating_colleagues: null,
        rating_pressure: null,
        notes: null,
        display_order: applications.length,
        applied_at: null,
        salary_min: null,
        salary_max: null,
        salary_currency: "TWD",
        salary_period: "monthly",
        benefits: [],
        work_location: null,
        commute_cost: 0,
        rent_estimate: null,
        meal_allowance: 0,
        other_allowance: 0,
        value_scores: null,
        category_id: data.categoryId || null,
      });

      if (newApplication) {
        setApplications((prev) => [...prev, newApplication]);
      }
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Failed to create application:", error);
    }
  };

  const handleApplicationUpdate = (updatedApplication: JobApplication) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === updatedApplication.id ? updatedApplication : app
      )
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden">
        <div className="flex w-full min-w-0 max-w-full flex-wrap items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {!isMobile && <SidebarTrigger className="-ml-1" />}
            <h1 className="shrink-0 text-2xl font-bold">求職追蹤</h1>
          </div>
          <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
            <JobCategoryTabs className="h-8 shrink-0" showStats stats={categoryStats} totalCount={applications.length} />
            <Button data-tour="ai-search" size="sm" className="px-2 sm:px-3" onClick={runAutomation} disabled={automationRunning} aria-label={automationRunning ? "搜尋中" : "搜尋職缺"} title={automationRunning ? "搜尋中" : "搜尋職缺"}><Sparkles className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">{automationRunning ? "搜尋中" : "搜尋職缺"}</span></Button>
            <Button variant="outline" size="sm" asChild><Link href="/automation">搜尋設定</Link></Button>
            <label className="relative hidden md:block"><span className="sr-only">搜尋公司或職稱</span><Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜尋公司或職稱" className="h-9 w-64 pl-8 pr-8" />{searchQuery && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="清除搜尋" onClick={() => setSearchQuery("")}><X className="h-3.5 w-3.5" /></button>}</label>
            <Button variant="outline" size="icon" className="md:hidden" aria-label="搜尋公司或職稱" title="搜尋公司或職稱" onClick={() => setShowMobileSearch((value) => !value)}><Search className="h-4 w-4" /></Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowAllSummaries(!showAllSummaries)}
              title={showAllSummaries ? "隱藏摘要" : "顯示摘要"}
            >
              {showAllSummaries ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            <Button data-tour="tour-replay" variant="outline" size="icon" onClick={tour.start} aria-label="新手教學" title="新手教學">
              <CircleHelp className="h-4 w-4" />
            </Button>
            <Button data-tour="add" className="px-2 sm:px-4" onClick={() => setIsAddDialogOpen(true)} aria-label="新增追蹤" title="新增追蹤">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">新增追蹤</span>
            </Button>
          </div>
        </div>

        <section data-tour="progress" className="overflow-x-auto rounded-lg border bg-card shadow-sm" aria-labelledby="job-search-progress-title">
          <div className="flex min-w-max items-center gap-1.5 px-2.5 py-1.5">
            <div className="flex items-center gap-1.5 border-r pr-2">
              <h2 id="job-search-progress-title" className="text-xs font-semibold">找工作進度</h2>
              <span className="text-xs font-semibold tabular-nums text-primary">{requiredProgress}%</span>
              <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${requiredProgress}%` }} />
              </div>
            </div>
            {progressSteps.map((step) => {
              const StepIcon = step.icon;
              return (
                <Link
                  key={step.label}
                  href={step.href}
                  className="group flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted"
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${step.complete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {step.complete ? <Check className="h-3 w-3" /> : <StepIcon className="h-3 w-3" />}
                  </span>
                  <span className="text-xs font-medium group-hover:text-primary">{step.label}</span>
                  {!step.complete && (step.label === "儲存 10 個職缺" || step.label === "投出 10 份履歷" || step.optional) && (
                    <span className="text-[11px] tabular-nums text-muted-foreground">{step.detail}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        {jobLeads.length > 0 && <section className="space-y-3 rounded-xl border bg-card p-4" aria-labelledby="job-leads-title">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><h2 id="job-leads-title" className="text-base font-semibold">候選職缺 · {jobLeads.length}</h2><p className="text-xs text-muted-foreground">確認職缺內容後，選擇一份履歷產生客製履歷與求職信。</p></div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {jobLeads.map((lead) => <article key={lead.id} className="min-w-0 rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><h3 className="font-medium">{lead.role}</h3><p className="text-sm text-muted-foreground">{lead.company}</p><p className="mt-1 text-xs text-muted-foreground">來源：{lead.source}</p></div>
                <button type="button" onClick={() => void deleteLead(lead.id)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="移除候選職缺"><Trash2 className="h-4 w-4" /></button>
              </div>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{lead.snippet || "搜尋來源沒有提供完整 JD，請開啟職缺頁面後複製完整描述。"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openLead(lead)}>檢查 JD 並準備材料</Button>
                {lead.url && <Button size="sm" variant="outline" asChild><a href={lead.url} target="_blank" rel="noreferrer">開啟原職缺</a></Button>}
              </div>
            </article>)}
          </div>
        </section>}

        {showMobileSearch && <div className="md:hidden"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜尋公司或職稱" className="h-10 pl-9" />{searchQuery && <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="清除搜尋" onClick={() => setSearchQuery("")}><X className="h-4 w-4" /></button>}</div></div>}

        {searchQuery && filteredApplications.length === 0 && <div className="rounded-xl border border-dashed px-4 py-8 text-center"><p className="text-sm font-medium">找不到符合「{searchQuery}」的職缺</p><button className="mt-1 text-xs text-primary hover:underline" onClick={() => setSearchQuery("")}>清除搜尋</button></div>}

        <div data-tour="kanban">
          <KanbanBoard
            applications={filteredApplications}
            showSummaries={showAllSummaries}
            onApplicationUpdate={handleApplicationUpdate}
            onAddClick={handleAddClick}
            onApproveApplication={approveApplication}
          />
        </div>

        <AddApplicationDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          defaultStatus={addDialogStatus}
          defaultCategoryId={selectedCategoryId}
          onSubmit={handleAddApplication}
        />
      </div>

      <Dialog open={!!activeLead} onOpenChange={closeLead}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader className="pr-8">
            <DialogTitle>{prepared ? "審核客製履歷" : "評估職缺並準備履歷"}</DialogTitle>
            <DialogDescription>{activeLead ? `${activeLead.role} · ${activeLead.company}` : "檢查完整職缺描述與履歷適配後，再建立客製草稿。"}</DialogDescription>
          </DialogHeader>

          {!prepared ? <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div className="min-w-0"><p className="text-sm font-medium">職缺原頁</p><p className="truncate text-xs text-muted-foreground">{activeLead?.url}</p></div>
              {activeLead?.url && <a href={activeLead.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-sm text-primary hover:underline">開啟 <ExternalLink className="h-3.5 w-3.5" /></a>}
            </div>
            <div className="space-y-2"><label className="text-sm font-medium" htmlFor="reviewed-jd">職缺描述（確認完整，資料不足請補貼）</label><Textarea id="reviewed-jd" value={jdDraft} onChange={(event) => setJdDraft(event.target.value)} rows={9} className="resize-y text-sm leading-6" placeholder="貼上完整職缺描述，至少 80 個字。資料不足時不會產生適配分數。" /><p className="text-right text-xs text-muted-foreground">{jdDraft.trim().length} 字</p></div>
            <div className="space-y-2"><label className="text-sm font-medium">用哪一份既有履歷？</label>{resumeVersions.length ? <Select value={selectedVersionId} onValueChange={setSelectedVersionId}><SelectTrigger><SelectValue placeholder="選擇履歷版本" /></SelectTrigger><SelectContent>{resumeVersions.map((version) => <SelectItem key={version.id} value={version.id}>{version.name}{version.is_active ? " · 主要履歷" : ""}</SelectItem>)}</SelectContent></Select> : <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">尚無可用的履歷版本。<Link className="ml-1 text-primary hover:underline" href="/resume">先建立履歷</Link>，再回來準備這個職缺。</div>}</div>
            <p className="rounded-lg bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">AI 會建立一份獨立草稿，不會覆寫原履歷。適配與 ATS 分數是估算結果；請確認每項經歷都真實、可佐證。</p>
          </div> : <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1"><div className="rounded-xl border p-3"><p className="text-[11px] text-muted-foreground">AI 預估 ATS</p><p className="mt-1 text-2xl font-semibold">{prepared.atsScore}<span className="text-sm font-normal text-muted-foreground">/100</span></p><p className="mt-1 text-[10px] text-muted-foreground">估算值，不代表錄取機率</p></div><div className="rounded-xl border p-3"><p className="text-[11px] text-muted-foreground">JD 關鍵字吻合</p><p className="mt-1 text-2xl font-semibold">{prepared.matchedKeywords.length + prepared.missingKeywords.length ? Math.round(prepared.matchedKeywords.length / (prepared.matchedKeywords.length + prepared.missingKeywords.length) * 100) : "—"}<span className="text-sm font-normal text-muted-foreground">{prepared.matchedKeywords.length + prepared.missingKeywords.length ? "%" : ""}</span></p><p className="mt-1 text-[10px] text-muted-foreground">依 AI 列出的關鍵字估算</p></div></div>
              <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border p-3"><p className="mb-2 text-xs font-medium">已涵蓋關鍵字 · {prepared.matchedKeywords.length}</p><div className="flex flex-wrap gap-1.5">{prepared.matchedKeywords.length ? prepared.matchedKeywords.slice(0, 12).map((word) => <span key={word} className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-700 dark:text-emerald-300">{word}</span>) : <span className="text-xs text-muted-foreground">沒有可確認的匹配項</span>}</div></div><div className="rounded-xl border p-3"><p className="mb-2 text-xs font-medium">尚未涵蓋 · {prepared.missingKeywords.length}</p><div className="flex flex-wrap gap-1.5">{prepared.missingKeywords.length ? prepared.missingKeywords.slice(0, 12).map((word) => <span key={word} className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">{word}</span>) : <span className="text-xs text-muted-foreground">無</span>}</div></div></div>
            </div>
            <div className={`rounded-lg border p-3 ${prepared.audit.status === "passed" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}><p className="text-xs font-semibold">事實審核 · {prepared.audit.status === "passed" ? "未發現無根據主張" : "有項目需要確認"}</p><p className="mt-1 text-xs text-muted-foreground">{prepared.audit.summary}</p>{prepared.audit.findings.filter((finding) => finding.status !== "supported").map((finding, index) => <div key={`${index}-${finding.claim}`} className="mt-2 rounded border bg-background p-2 text-xs"><p className="font-medium">{finding.status === "exaggerated" ? "責任或成果可能被放大" : "缺少履歷依據"}：{finding.claim}</p><p className="mt-1 text-muted-foreground">{finding.reason}{finding.evidence ? ` · 原履歷依據：${finding.evidence}` : ""}</p></div>)}</div>
            <div className="rounded-lg border p-3"><p className="mb-2 text-xs font-medium">JD 條件與履歷證據</p><div className="space-y-2">{prepared.audit.requirements.map((item, index) => <div key={`${index}-${item.requirement}`} className="flex items-start justify-between gap-3 text-xs"><div><span className="font-medium">{item.requirement}</span><p className="mt-0.5 text-muted-foreground">{item.evidence || "履歷未提供可引用證據"}</p></div><span className="shrink-0 text-muted-foreground">{item.priority === "required" ? "必要" : "加分"} · {item.status === "supported" ? "有證據" : item.status === "partial" ? "部分符合" : "缺口"}</span></div>)}</div></div>
            {prepared.suggestions.length > 0 && <div className="rounded-lg border p-3"><p className="mb-1 text-xs font-medium">改善建議</p><ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">{prepared.suggestions.map((suggestion, index) => <li key={`${index}-${suggestion}`}>{suggestion}</li>)}</ul></div>}
            <div className="space-y-2"><div className="flex items-center justify-between gap-2"><label className="text-sm font-medium" htmlFor="tailored-resume">履歷客製草稿 · {prepared.versionName}</label><a className="shrink-0 text-xs text-primary hover:underline" href={`/resume/${prepared.versionId}`} target="_blank" rel="noreferrer">檢視原履歷</a></div><Textarea id="tailored-resume" value={draftContent} onChange={(event) => { setDraftContent(event.target.value); setApprovedForFill(false); }} rows={13} className="resize-y font-mono text-xs leading-5" /></div>
            {coverLetterDraft && <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">求職信草稿</p>
              <label className="block space-y-1 text-xs font-medium">主旨<Input value={coverLetterDraft.subject} onChange={(event) => { setCoverLetterDraft({ ...coverLetterDraft, subject: event.target.value }); setApprovedForFill(false); }} /></label>
              <label className="block space-y-1 text-xs font-medium">內文<Textarea value={coverLetterDraft.body} onChange={(event) => { setCoverLetterDraft({ ...coverLetterDraft, body: event.target.value }); setApprovedForFill(false); }} rows={8} className="resize-y text-sm leading-6" /></label>
              <p className="text-xs text-muted-foreground">附件提示：{coverLetterDraft.attachmentNote}</p>
            </div>}
            <label className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs leading-5 text-amber-900 dark:text-amber-200">
              <input type="checkbox" className="mt-1" checked={approvedForFill} onChange={(event) => setApprovedForFill(event.target.checked)} />
              <span>我已檢查履歷與求職信的公司、日期、成果數字和技能；同意把這份履歷、求職信及我的姓名、Email、已儲存電話和 LinkedIn 網址提供給已配對的 JobSmart 外掛填入 LinkedIn 表單。</span>
            </label>
            <p className="text-xs leading-5 text-muted-foreground">外掛只填入支援的欄位與履歷附件。請在 LinkedIn 檢查未填欄位、每項資料與附件，再由你親自送出申請。</p>
            <p className="text-xs text-muted-foreground">首次使用請先<Link className="ml-1 text-primary hover:underline" href="/settings/linkedin">配對並啟用 LinkedIn 外掛</Link>。</p>
          </div>}

          <DialogFooter className="gap-2 sm:gap-2">
            {!prepared ? <Button onClick={prepareLead} disabled={preparing || !selectedVersionId || jdDraft.trim().length < 80}>{preparing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />正在分析並建立草稿</> : <><Sparkles className="mr-2 h-4 w-4" />同意並客製化履歷</>}</Button> : <>
              <Button variant="outline" onClick={savePreparedDraft} disabled={savingDraft || !draftContent.trim() || !coverLetterDraft || (draftContent === prepared.customizedContent && JSON.stringify(coverLetterDraft) === JSON.stringify(prepared.coverLetter))}>{savingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{savingDraft ? "儲存中" : "儲存並重新審核"}</Button>
              {/^https:\/\/(?:[a-z0-9-]+\.)*linkedin\.com\//i.test(activeLead?.url || "")
                ? <Button onClick={startLinkedInFill} disabled={!approvedForFill || creatingFillTask || draftContent !== prepared.customizedContent || !coverLetterDraft || JSON.stringify(coverLetterDraft) !== JSON.stringify(prepared.coverLetter)}>{creatingFillTask ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}交給 LinkedIn 外掛填表</Button>
                : <Button variant="secondary" asChild disabled={draftContent !== prepared.customizedContent || JSON.stringify(coverLetterDraft) !== JSON.stringify(prepared.coverLetter)}><a href={activeLead?.url || "#"} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />前往職缺頁面</a></Button>}
              <Button variant="outline" onClick={markAsApplied} disabled={draftContent !== prepared.customizedContent || JSON.stringify(coverLetterDraft) !== JSON.stringify(prepared.coverLetter)}>我已親自送出</Button>
            </>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAppliedConfirmOpen} onOpenChange={(open) => { setIsAppliedConfirmOpen(open); if (!open) setPendingAppliedApplicationId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{locale === "en" ? "Confirm application submitted" : "確認已送出申請"}</AlertDialogTitle>
            <AlertDialogDescription>
              {locale === "en"
                ? "Confirm that you reviewed the details on LinkedIn and submitted the application yourself?"
                : "確認你已在 LinkedIn 檢查資料並親自送出申請？"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{locale === "en" ? "Cancel" : "取消"}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarkAsApplied}>{locale === "en" ? "Confirm" : "確認"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SpotlightTour steps={tourCopy.steps} labels={tourCopy.labels} open={tour.open} onClose={tour.close} />

      <DragOverlay>
        {activeApplication ? (
          <ApplicationCard
            application={activeApplication}
            isDragging
            showSummary={showAllSummaries}
            isMobile={isMobile}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
