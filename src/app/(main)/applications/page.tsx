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
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { ApplicationCard } from "@/components/kanban/application-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Eye, EyeOff, Sparkles, MoreHorizontal, Trash2, ExternalLink, FileText, Save, Search, X } from "lucide-react";
import { toast } from "sonner";
import { AddApplicationDialog } from "@/components/kanban/add-application-dialog";
import { JobCategoryTabs } from "@/components/job-category-tabs";
import { useJobCategoryContext } from "@/contexts/job-category-context";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getJobApplications,
  createJobApplication,
  updateJobApplication,
  getResumeVersions,
  updateVersionJobResume,
} from "@/lib/turso/db";
import type { JobApplication, ApplicationStatus, JDContentZh } from "@/types";
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

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addDialogStatus, setAddDialogStatus] = useState<ApplicationStatus>("wishlist");
  const [showAllSummaries, setShowAllSummaries] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [automationRunning, setAutomationRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [automationSettings, setAutomationSettings] = useState({ enabled: false, frequency: "daily", mode: "review", query: "AI product manager", nextRunAt: null as string | null });
  const [jobLeads, setJobLeads] = useState<Array<{ id: string; company: string; role: string; url: string; source: string; status: string; snippet: string }>>([]);
  const [activeLead, setActiveLead] = useState<(typeof jobLeads)[number] | null>(null);
  const [resumeVersions, setResumeVersions] = useState<ResumeVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [jdDraft, setJdDraft] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [prepared, setPrepared] = useState<{ applicationId: string; relationId: string; versionId: string; versionName: string; customizedContent: string; atsScore: number; matchedKeywords: string[]; missingKeywords: string[]; suggestions: string[] } | null>(null);
  const [draftContent, setDraftContent] = useState("");

  const { selectedCategoryId } = useJobCategoryContext();
  const isMobile = useIsMobile();

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

  const handleAddClick = (status: ApplicationStatus) => {
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
      const [settingsResponse, queueResponse, versions] = await Promise.all([fetch("/api/automation/settings"), fetch("/api/automation/queue"), getResumeVersions()]);
      if (settingsResponse.ok) setAutomationSettings((await settingsResponse.json()).data);
      if (queueResponse.ok) {
        const rows = (await queueResponse.json()).data as typeof jobLeads;
        setJobLeads(rows.filter((lead, index, all) => all.findIndex((item) => item.url === lead.url) === index));
      }
      setResumeVersions(versions);
      setSelectedVersionId((current) => current || versions.find((version) => version.is_active)?.id || versions[0]?.id || "");
    } catch (error) { console.error("Failed to load automation:", error); }
  }, []);

  useEffect(() => {
    loadApplications();
    loadAutomation();
  }, [loadApplications, loadAutomation]);

  const runAutomation = async () => {
    setAutomationRunning(true);
    try {
      const response = await fetch("/api/automation/run", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "搜尋失敗");
      await loadAutomation();
      toast.success(`找到 ${result.data.discovered} 個候選職缺`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "搜尋失敗，請稍後重試"); }
    finally { setAutomationRunning(false); }
  };

  const saveAutomation = async (next: typeof automationSettings) => {
    setAutomationSettings(next);
    await fetch("/api/automation/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
  };

  const openLead = (lead: (typeof jobLeads)[number]) => {
    setActiveLead(lead);
    setJdDraft(lead.snippet || "");
    setPrepared(null);
    setDraftContent("");
  };
  const closeLead = (open: boolean) => {
    if (!open && !preparing && !savingDraft) {
      setActiveLead(null);
      setPrepared(null);
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
      await Promise.all([loadAutomation(), loadApplications()]);
      toast.success("客製履歷已建立，請逐項審核");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "準備失敗，請稍後重試");
    } finally { setPreparing(false); }
  };
  const savePreparedDraft = async () => {
    if (!prepared) return;
    setSavingDraft(true);
    try {
      const saved = await updateVersionJobResume(prepared.relationId, { customized_plain_text: draftContent, generation_status: "completed" });
      if (!saved) throw new Error("儲存失敗");
      setPrepared({ ...prepared, customizedContent: draftContent });
      toast.success("履歷草稿已儲存");
    } catch (error) { toast.error(error instanceof Error ? error.message : "儲存失敗"); }
    finally { setSavingDraft(false); }
  };
  const markAsApplied = async () => {
    if (!prepared || !window.confirm("確認你已在 LinkedIn 檢查資料並親自送出申請？")) return;
    try {
      const updated = await updateJobApplication(prepared.applicationId, { status: "applied", applied_at: new Date().toISOString() });
      if (!updated) throw new Error("狀態更新失敗");
      setApplications((previous) => previous.map((application) => application.id === updated.id ? updated : application));
      toast.success("已更新為已投遞");
      setActiveLead(null);
      setPrepared(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "更新失敗"); }
  };
  const deleteLead = async (id: string) => {
    const response = await fetch(`/api/automation/queue?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) { toast.error("刪除失敗，請重試"); return; }
    setJobLeads((prev) => prev.filter((lead) => lead.id !== id));
    toast.success("已移除候選職缺");
  };
  const handleStatusChange = async (applicationId: string, newStatus: ApplicationStatus) => {
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

  const pendingLeads = jobLeads.filter((lead) => lead.status === "queued");
  const queueCards = pendingLeads.length > 0 ? (
    <div className="mb-3 space-y-2" aria-label="待評估職缺">
      {pendingLeads.slice(0, 5).map((lead) => <article key={lead.id} className="rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <button className="min-w-0 flex-1 text-left" onClick={() => openLead(lead)}>
            <p className="truncate text-sm font-semibold">{lead.role}</p><p className="truncate text-xs text-muted-foreground">{lead.company}</p>
          </button>
          <details className="relative"><summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted" aria-label="更多操作"><MoreHorizontal className="h-4 w-4" /></summary><div className="absolute right-0 z-10 mt-1 w-28 rounded-md border bg-popover p-1 shadow"><button className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-destructive hover:bg-muted" onClick={() => deleteLead(lead.id)}><Trash2 className="h-3.5 w-3.5" />移除候選職缺</button></div></details>
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{lead.snippet || "尚未取得職缺描述，開啟後可貼上完整 JD。"}</p>
        <Button size="sm" variant="secondary" className="mt-3 h-8 w-full" onClick={() => openLead(lead)}><FileText className="mr-2 h-3.5 w-3.5" />檢視 JD 並準備履歷</Button>
      </article>)}
      {pendingLeads.length > 5 && <p className="px-1 text-center text-xs text-muted-foreground">另有 {pendingLeads.length - 5} 個候選職缺</p>}
    </div>
  ) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">求職追蹤</h1>
            <p className="text-muted-foreground">
              先確認職缺與履歷，再決定是否投遞
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" onClick={runAutomation} disabled={automationRunning}><Sparkles className="mr-1 h-4 w-4" />{automationRunning ? "搜尋中" : "AI 找職缺"}</Button>
            <label className="relative hidden sm:block"><span className="sr-only">搜尋公司或職稱</span><Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜尋公司、職稱" className="h-9 w-48 pl-8 pr-8" />{searchQuery && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="清除搜尋" onClick={() => setSearchQuery("")}><X className="h-3.5 w-3.5" /></button>}</label>
            <select aria-label="職缺準備確認方式" className="h-9 rounded-md border bg-transparent px-2 text-xs" value={automationSettings.mode === "ask" ? "ask" : "review"} onChange={(e) => saveAutomation({ ...automationSettings, mode: e.target.value })}><option value="review">逐職缺確認</option><option value="ask">逐步確認</option></select>
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
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新增追蹤
            </Button>
          </div>
        </div>

        <div className="sm:hidden"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜尋公司或職稱" className="h-10 pl-9" />{searchQuery && <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="清除搜尋" onClick={() => setSearchQuery("")}><X className="h-4 w-4" /></button>}</div></div>

        {/* 職位類別 Tab */}
        <JobCategoryTabs showStats stats={categoryStats} totalCount={applications.length} />

        {searchQuery && filteredApplications.length === 0 && <div className="rounded-xl border border-dashed px-4 py-8 text-center"><p className="text-sm font-medium">找不到符合「{searchQuery}」的職缺</p><button className="mt-1 text-xs text-primary hover:underline" onClick={() => setSearchQuery("")}>清除搜尋</button></div>}

        <KanbanBoard
          applications={filteredApplications}
          showSummaries={showAllSummaries}
          onApplicationUpdate={handleApplicationUpdate}
          onAddClick={handleAddClick}
          firstColumnContent={queueCards}
        />

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
            <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
              <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">AI 預估 ATS 分數</p><p className="mt-1 text-3xl font-semibold">{prepared.atsScore}<span className="text-base font-normal text-muted-foreground">/100</span></p><p className="mt-1 text-[11px] text-muted-foreground">估算值，不代表錄取機率</p></div>
              <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border p-3"><p className="mb-2 text-xs font-medium">已涵蓋關鍵字 · {prepared.matchedKeywords.length}</p><div className="flex flex-wrap gap-1.5">{prepared.matchedKeywords.length ? prepared.matchedKeywords.slice(0, 12).map((word) => <span key={word} className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-700 dark:text-emerald-300">{word}</span>) : <span className="text-xs text-muted-foreground">沒有可確認的匹配項</span>}</div></div><div className="rounded-xl border p-3"><p className="mb-2 text-xs font-medium">尚未涵蓋 · {prepared.missingKeywords.length}</p><div className="flex flex-wrap gap-1.5">{prepared.missingKeywords.length ? prepared.missingKeywords.slice(0, 12).map((word) => <span key={word} className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">{word}</span>) : <span className="text-xs text-muted-foreground">無</span>}</div></div></div>
            </div>
            {prepared.suggestions.length > 0 && <div className="rounded-lg border p-3"><p className="mb-1 text-xs font-medium">需要你確認</p><ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">{prepared.suggestions.map((suggestion, index) => <li key={`${index}-${suggestion}`}>{suggestion}</li>)}</ul></div>}
            <div className="space-y-2"><div className="flex items-center justify-between gap-2"><label className="text-sm font-medium" htmlFor="tailored-resume">履歷客製草稿 · {prepared.versionName}</label><a className="shrink-0 text-xs text-primary hover:underline" href={`/resume/${prepared.versionId}`} target="_blank" rel="noreferrer">檢視原履歷</a></div><Textarea id="tailored-resume" value={draftContent} onChange={(event) => setDraftContent(event.target.value)} rows={13} className="resize-y font-mono text-xs leading-5" /></div>
            <p className="rounded-lg bg-amber-500/10 p-3 text-xs leading-5 text-amber-800 dark:text-amber-200">送出前請逐項核對公司、日期、成果數字與技能。JobSmart 不會替你按下 LinkedIn 最後的送出按鈕。</p>
          </div>}

          <DialogFooter className="gap-2 sm:gap-2">
            {!prepared ? <Button onClick={prepareLead} disabled={preparing || !selectedVersionId || jdDraft.trim().length < 80}>{preparing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />正在分析並建立草稿</> : <><Sparkles className="mr-2 h-4 w-4" />同意並客製化履歷</>}</Button> : <>
              <Button variant="outline" onClick={savePreparedDraft} disabled={savingDraft || !draftContent.trim() || draftContent === prepared.customizedContent}>{savingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{savingDraft ? "儲存中" : "儲存草稿修改"}</Button>
              <Button variant="secondary" asChild disabled={draftContent !== prepared.customizedContent}><a href={activeLead?.url || "https://www.linkedin.com/jobs/"} target="_blank" rel="noreferrer" onClick={(event) => { if (draftContent !== prepared.customizedContent) event.preventDefault(); }}><ExternalLink className="mr-2 h-4 w-4" />前往職缺頁面</a></Button>
              <Button onClick={markAsApplied} disabled={draftContent !== prepared.customizedContent}>我已親自送出</Button>
            </>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
