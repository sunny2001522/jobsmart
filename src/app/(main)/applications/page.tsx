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
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { ApplicationCard } from "@/components/kanban/application-card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Eye, EyeOff, Sparkles, MoreHorizontal, Trash2, Check } from "lucide-react";
import Link from "next/link";
import { AddApplicationDialog } from "@/components/kanban/add-application-dialog";
import { JobCategoryTabs } from "@/components/job-category-tabs";
import { useJobCategoryContext } from "@/contexts/job-category-context";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getJobApplications,
  createJobApplication,
  updateJobApplication,
} from "@/lib/supabase/db";
import type { JobApplication, ApplicationStatus, JDContentZh } from "@/types";
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
  const [automationSettings, setAutomationSettings] = useState({ enabled: false, frequency: "daily", mode: "review", query: "AI product manager", nextRunAt: null as string | null });
  const [jobLeads, setJobLeads] = useState<Array<{ id: string; company: string; role: string; url: string; source: string; status: string; snippet: string }>>([]);
  const [linkedinStatus, setLinkedinStatus] = useState("disconnected");

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
    if (!selectedCategoryId) return applications;
    return applications.filter((app) => app.category_id === selectedCategoryId);
  }, [applications, selectedCategoryId]);

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
      const [settingsResponse, queueResponse, linkedinResponse] = await Promise.all([fetch("/api/automation/settings"), fetch("/api/automation/queue"), fetch("/api/integrations/linkedin")]);
      if (settingsResponse.ok) setAutomationSettings((await settingsResponse.json()).data);
      if (queueResponse.ok) {
        const rows = (await queueResponse.json()).data as typeof jobLeads;
        setJobLeads(rows.filter((lead, index, all) => all.findIndex((item) => item.url === lead.url) === index));
      }
      if (linkedinResponse.ok) setLinkedinStatus(String((await linkedinResponse.json()).data.status));
    } catch (error) { console.error("Failed to load automation:", error); }
  }, []);

  useEffect(() => {
    loadApplications();
    loadAutomation();
  }, [loadApplications, loadAutomation]);

  const runAutomation = async () => {
    setAutomationRunning(true);
    try { await fetch("/api/automation/run", { method: "POST" }); await loadAutomation(); }
    finally { setAutomationRunning(false); }
  };

  const saveAutomation = async (next: typeof automationSettings) => {
    setAutomationSettings(next);
    await fetch("/api/automation/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
  };

  const approveLead = async (id: string) => { await fetch(`/api/automation/queue/${id}/approve`, { method: "POST" }); await Promise.all([loadAutomation(), loadApplications()]); };
  const deleteLead = async (id: string) => { await fetch(`/api/automation/queue?id=${encodeURIComponent(id)}`, { method: "DELETE" }); setJobLeads((prev) => prev.filter((lead) => lead.id !== id)); };
  const connectLinkedIn = async () => {
    if (linkedinStatus === "pending") {
      const response = await fetch("/api/integrations/linkedin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "connected", accountLabel: "LinkedIn Companion" }) });
      if (response.ok) setLinkedinStatus("connected");
      return;
    }
    window.open("https://www.linkedin.com/login", "_blank", "noopener,noreferrer");
    setLinkedinStatus("pending");
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
    <div className="mb-3 space-y-2" aria-label="搶投職缺">
      {pendingLeads.slice(0, 5).map((lead) => <div key={lead.id} className="rounded-lg border bg-card p-3 shadow-sm"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-medium text-muted-foreground">{lead.role}</p><p className="truncate text-xs text-muted-foreground">{lead.company}</p></div><details className="relative"><summary className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded hover:bg-muted" aria-label="更多操作"><MoreHorizontal className="h-3.5 w-3.5" /></summary><div className="absolute right-0 z-10 mt-1 w-24 rounded border bg-popover p-1 shadow"><button aria-label="刪除職缺" className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-[10px] text-destructive hover:bg-muted" onClick={() => deleteLead(lead.id)}><Trash2 className="h-3 w-3" />刪除</button></div></details></div><Button size="sm" variant="outline" className="mt-2 h-7 w-full text-[11px]" onClick={() => approveLead(lead.id)}><Check className="mr-1 h-3 w-3" />同意並開始修改</Button></div>)}
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
              追蹤你的求職進度，從想投到拿到 Offer
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" onClick={runAutomation} disabled={automationRunning}><Sparkles className="mr-1 h-4 w-4" />{automationRunning ? "搜尋中" : "AI 找職缺"}</Button>
            <span className="text-xs text-muted-foreground">{automationSettings.mode === "auto" ? "自動" : "需同意"}</span>
            <select aria-label="目前投遞模式" className="h-9 rounded-md border bg-transparent px-2 text-xs" value={automationSettings.mode} onChange={(e) => saveAutomation({ ...automationSettings, mode: e.target.value })}><option value="review">勾選後投</option><option value="ask">每步詢問</option><option value="auto">自動投遞</option></select>
            <Button variant="outline" size="sm" onClick={connectLinkedIn}>{linkedinStatus === "connected" ? "LinkedIn 已連接" : linkedinStatus === "pending" ? "完成 LinkedIn 連線" : "連接 LinkedIn"}</Button>
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

        {/* 職位類別 Tab */}
        <JobCategoryTabs showStats stats={categoryStats} totalCount={applications.length} />

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
