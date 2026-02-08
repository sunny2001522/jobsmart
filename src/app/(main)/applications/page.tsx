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
import { Plus, Loader2, Eye, EyeOff } from "lucide-react";
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

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

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
          <div className="flex gap-2">
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
