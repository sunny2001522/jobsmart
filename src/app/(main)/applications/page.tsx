"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddApplicationDialog } from "@/components/kanban/add-application-dialog";
import type { JobApplication, ApplicationStatus } from "@/types";

// 模擬資料 - 之後會從 Supabase 取得
const initialApplications: JobApplication[] = [
  {
    id: "1",
    user_id: "user-1",
    company_id: null,
    company_name: "Google",
    company: { id: "c1", name: "Google", logo_url: null, website: null, industry: "科技", avg_happiness: null, avg_salary_match: null, avg_colleagues: null, avg_pressure: null, review_count: 0, last_scraped_at: null, created_at: "", updated_at: "" },
    position: "Frontend Engineer",
    jd_url: "https://example.com",
    jd_content: null,
    jd_keywords: [],
    status: "wishlist",
    rating_happiness: null,
    rating_salary_match: null,
    rating_colleagues: null,
    rating_pressure: null,
    notes: null,
    display_order: 0,
    applied_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    user_id: "user-1",
    company_id: null,
    company_name: "Meta",
    company: { id: "c2", name: "Meta", logo_url: null, website: null, industry: "科技", avg_happiness: null, avg_salary_match: null, avg_colleagues: null, avg_pressure: null, review_count: 0, last_scraped_at: null, created_at: "", updated_at: "" },
    position: "Software Engineer",
    jd_url: null,
    jd_content: null,
    jd_keywords: [],
    status: "applied",
    rating_happiness: null,
    rating_salary_match: null,
    rating_colleagues: null,
    rating_pressure: null,
    notes: null,
    display_order: 1,
    applied_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<JobApplication[]>(initialApplications);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleStatusChange = (applicationId: string, newStatus: ApplicationStatus) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? { ...app, status: newStatus, updated_at: new Date().toISOString() }
          : app
      )
    );
  };

  const handleAddApplication = (data: { companyName: string; position: string; jdUrl?: string }) => {
    const newApplication: JobApplication = {
      id: crypto.randomUUID(),
      user_id: "user-1",
      company_id: null,
      company_name: data.companyName,
      position: data.position,
      jd_url: data.jdUrl || null,
      jd_content: null,
      jd_keywords: [],
      status: "wishlist",
      rating_happiness: null,
      rating_salary_match: null,
      rating_colleagues: null,
      rating_pressure: null,
      notes: null,
      display_order: applications.length,
      applied_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setApplications((prev) => [...prev, newApplication]);
    setIsAddDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">求職追蹤</h1>
          <p className="text-muted-foreground">
            追蹤你的求職進度，從想投到拿到 Offer
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新增追蹤
        </Button>
      </div>

      <KanbanBoard
        applications={applications}
        onStatusChange={handleStatusChange}
      />

      <AddApplicationDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddApplication}
      />
    </div>
  );
}
