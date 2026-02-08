// Database helper functions for JobSmart
import { createClient } from "./client";
import type {
  Resume,
  ResumeInsert,
  ResumeUpdate,
  JobApplication,
  JobApplicationInsert,
  JobApplicationUpdate,
  ApplicationStatus,
  InterviewQuestion,
  InterviewQuestionInsert,
  InterviewAnswer,
  InterviewAnswerInsert,
  ValueRanking,
  ValueRankingInsert,
  ValueRankingUpdate,
  Profile,
  ProfileUpdate,
  ResumeVersion,
  ResumeVersionInsert,
  ResumeVersionUpdate,
  VersionJobResume,
  VersionJobResumeInsert,
  VersionJobResumeUpdate,
  ResumeVersionWithJobs,
  JobCategory,
  JobCategoryInsert,
  JobCategoryUpdate,
  CategoryStats,
} from "./types";

// ============================================
// Profile Functions
// ============================================

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
}

export async function updateProfile(updates: Omit<ProfileUpdate, "id">): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    return null;
  }

  return data;
}

// ============================================
// Resume Functions
// ============================================

export async function getResumes(): Promise<Resume[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching resumes:", error);
    return [];
  }

  return data || [];
}

export async function getResume(id: string): Promise<Resume | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching resume:", error);
    return null;
  }

  return data;
}

export async function createResume(resume: Omit<ResumeInsert, "user_id">): Promise<Resume | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("resumes")
    .insert({ ...resume, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("Error creating resume:", error);
    return null;
  }

  return data;
}

export async function updateResume(id: string, updates: Omit<ResumeUpdate, "id">): Promise<Resume | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("resumes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating resume:", error);
    return null;
  }

  return data;
}

export async function deleteResume(id: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("resumes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting resume:", error);
    return false;
  }

  return true;
}

// ============================================
// Job Application Functions
// ============================================

export async function getJobApplications(): Promise<JobApplication[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("job_applications")
    .select("*")
    .eq("user_id", user.id)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching job applications:", error);
    return [];
  }

  return data || [];
}

export async function getJobApplicationsByStatus(status: ApplicationStatus): Promise<JobApplication[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("job_applications")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", status)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching job applications:", error);
    return [];
  }

  return data || [];
}

export async function createJobApplication(
  application: Omit<JobApplicationInsert, "user_id">
): Promise<JobApplication | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("job_applications")
    .insert({ ...application, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("Error creating job application:", error);
    return null;
  }

  return data;
}

export async function updateJobApplication(
  id: string,
  updates: Omit<JobApplicationUpdate, "id">
): Promise<JobApplication | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("job_applications")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating job application:", error);
    return null;
  }

  return data;
}

export async function deleteJobApplication(id: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("job_applications")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting job application:", error);
    return false;
  }

  return true;
}

export async function getApplicationStats() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      total: 0,
      wishlist: 0,
      applied: 0,
      interviews: 0,
      offers: 0,
      rejected: 0,
    };
  }

  const { data, error } = await supabase
    .from("job_applications")
    .select("status")
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching stats:", error);
    return {
      total: 0,
      wishlist: 0,
      applied: 0,
      interviews: 0,
      offers: 0,
      rejected: 0,
    };
  }

  const stats = {
    total: data?.length || 0,
    wishlist: 0,
    applied: 0,
    interviews: 0,
    offers: 0,
    rejected: 0,
  };

  data?.forEach((app) => {
    switch (app.status) {
      case "wishlist":
        stats.wishlist++;
        break;
      case "editing":
      case "applied":
        stats.applied++;
        break;
      case "interview_1":
      case "interview_2":
      case "interview_3":
      case "interview_4":
      case "interview_5":
      case "interview_6":
      case "interview_7":
      case "interview_8":
        stats.interviews++;
        break;
      case "verbal_offer":
      case "written_offer":
        stats.offers++;
        break;
      case "rejected":
      case "ghosted":
        stats.rejected++;
        break;
    }
  });

  return stats;
}

// ============================================
// Interview Functions
// ============================================

export async function getInterviewQuestions(options?: {
  category?: string;
  difficulty?: string;
  includePublic?: boolean;
}): Promise<InterviewQuestion[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase.from("interview_questions").select("*");

  // 公開題目或自己的題目
  if (user && options?.includePublic !== false) {
    query = query.or(`is_public.eq.true,user_id.eq.${user.id}`);
  } else if (user) {
    query = query.eq("user_id", user.id);
  } else {
    query = query.eq("is_public", true);
  }

  if (options?.category) {
    query = query.eq("category", options.category);
  }

  if (options?.difficulty) {
    query = query.eq("difficulty", options.difficulty);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching interview questions:", error);
    return [];
  }

  return data || [];
}

export async function createInterviewQuestion(
  question: Omit<InterviewQuestionInsert, "user_id">
): Promise<InterviewQuestion | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("interview_questions")
    .insert({ ...question, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("Error creating interview question:", error);
    return null;
  }

  return data;
}

export async function getInterviewAnswers(questionId?: string): Promise<InterviewAnswer[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from("interview_answers")
    .select("*")
    .eq("user_id", user.id);

  if (questionId) {
    query = query.eq("question_id", questionId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching interview answers:", error);
    return [];
  }

  return data || [];
}

export async function createInterviewAnswer(
  answer: Omit<InterviewAnswerInsert, "user_id">
): Promise<InterviewAnswer | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("interview_answers")
    .insert({ ...answer, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("Error creating interview answer:", error);
    return null;
  }

  return data;
}

// ============================================
// Value Ranking Functions
// ============================================

export async function getValueRanking(): Promise<ValueRanking | null> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error("Auth error in getValueRanking:", authError);
    return null;
  }

  if (!user) {
    console.error("No authenticated user in getValueRanking");
    return null;
  }

  const { data, error } = await supabase
    .from("value_rankings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found
    console.error("Error fetching value ranking:", error);
    return null;
  }

  return data;
}

export async function saveValueRanking(
  ranking: Omit<ValueRankingInsert, "user_id">
): Promise<ValueRanking | null> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error("Auth error in saveValueRanking:", authError);
    return null;
  }

  if (!user) {
    console.error("No authenticated user in saveValueRanking");
    return null;
  }

  // 使用 upsert 來插入或更新
  const { data, error } = await supabase
    .from("value_rankings")
    .upsert(
      { ...ranking, user_id: user.id },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Error saving value ranking:", error);
    return null;
  }

  return data;
}

// ============================================
// Recent Activity
// ============================================

export interface RecentActivity {
  id: string;
  type: "applied" | "interview" | "offer" | "added";
  company: string;
  position: string;
  date: string;
}

export async function getRecentActivity(limit = 5): Promise<RecentActivity[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("job_applications")
    .select("id, company_name, position, status, created_at, applied_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent activity:", error);
    return [];
  }

  return (data || []).map((app) => {
    let type: RecentActivity["type"] = "added";
    if (app.status === "applied" || app.status === "editing") {
      type = "applied";
    } else if (app.status.startsWith("interview")) {
      type = "interview";
    } else if (app.status === "verbal_offer" || app.status === "written_offer") {
      type = "offer";
    }

    return {
      id: app.id,
      type,
      company: app.company_name,
      position: app.position,
      date: app.updated_at,
    };
  });
}

// ============================================
// Resume Version Functions
// ============================================

export async function getResumeVersions(): Promise<ResumeVersion[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("resume_versions")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching resume versions:", error);
    return [];
  }

  return data || [];
}

export async function getResumeVersion(id: string): Promise<ResumeVersion | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("resume_versions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching resume version:", error);
    return null;
  }

  return data;
}

export async function getResumeVersionWithJobs(versionId: string): Promise<ResumeVersionWithJobs | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("resume_versions")
    .select(`
      *,
      version_job_resumes (
        *,
        job_application:job_applications (*)
      )
    `)
    .eq("id", versionId)
    .single();

  if (error) {
    console.error("Error fetching resume version with jobs:", error);
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vjr = (data.version_job_resumes || []) as any[];

  return {
    ...data,
    version_job_resumes: vjr,
    job_count: vjr.length,
    completed_count: vjr.filter(
      (v: VersionJobResume) => v.generation_status === "completed"
    ).length,
  };
}

export async function createResumeVersion(
  version: Omit<ResumeVersionInsert, "user_id">
): Promise<ResumeVersion | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("resume_versions")
    .insert({ ...version, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("Error creating resume version:", error);
    return null;
  }

  return data;
}

export async function updateResumeVersion(
  id: string,
  updates: Omit<ResumeVersionUpdate, "id">
): Promise<ResumeVersion | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("resume_versions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating resume version:", error);
    return null;
  }

  return data;
}

export async function deleteResumeVersion(id: string): Promise<boolean> {
  const supabase = createClient();

  // 軟刪除
  const { error } = await supabase
    .from("resume_versions")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Error deleting resume version:", error);
    return false;
  }

  return true;
}

// ============================================
// Version Job Resume Functions (拖放關聯)
// ============================================

export async function addJobToVersion(
  versionId: string,
  jobApplicationId: string
): Promise<VersionJobResume | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("version_job_resumes")
    .insert({
      version_id: versionId,
      job_application_id: jobApplicationId,
      generation_status: "pending",
      matched_keywords: [],
      missing_keywords: [],
    })
    .select()
    .single();

  if (error) {
    // 處理重複添加的情況
    if (error.code === "23505") {
      console.log("Job already in version");
      return null;
    }
    console.error("Error adding job to version:", error);
    return null;
  }

  return data;
}

export async function removeJobFromVersion(
  versionId: string,
  jobApplicationId: string
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("version_job_resumes")
    .delete()
    .eq("version_id", versionId)
    .eq("job_application_id", jobApplicationId);

  if (error) {
    console.error("Error removing job from version:", error);
    return false;
  }

  return true;
}

export async function getVersionJobResume(
  versionId: string,
  jobApplicationId: string
): Promise<VersionJobResume | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("version_job_resumes")
    .select("*")
    .eq("version_id", versionId)
    .eq("job_application_id", jobApplicationId)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching version job resume:", error);
    }
    return null;
  }

  return data;
}

export async function updateVersionJobResume(
  id: string,
  updates: Omit<VersionJobResumeUpdate, "id">
): Promise<VersionJobResume | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("version_job_resumes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating version job resume:", error);
    return null;
  }

  return data;
}

// 獲取特定工作的所有客製化履歷
export async function getCustomizedResumesForJob(
  jobApplicationId: string
): Promise<(VersionJobResume & { resume_version: ResumeVersion })[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("version_job_resumes")
    .select(`
      *,
      resume_version:resume_versions (*)
    `)
    .eq("job_application_id", jobApplicationId);

  if (error) {
    console.error("Error fetching customized resumes:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []) as any[];
}

// 獲取版本下所有工作的客製化履歷
export async function getVersionJobResumes(
  versionId: string
): Promise<(VersionJobResume & { job_application: JobApplication })[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("version_job_resumes")
    .select(`
      *,
      job_application:job_applications (*)
    `)
    .eq("version_id", versionId)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching version job resumes:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []) as any[];
}

// ============================================
// Company Review Functions
// ============================================

import type { CompanyReview } from "./types";

export async function getCompanyReviewsByName(
  companyName: string
): Promise<CompanyReview[]> {
  const supabase = createClient();

  // 先嘗試找到公司
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .ilike("name", `%${companyName}%`)
    .limit(1)
    .single();

  if (!company) {
    return [];
  }

  // 獲取公司評論
  const { data, error } = await supabase
    .from("company_reviews")
    .select("*")
    .eq("company_id", company.id)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Error fetching company reviews:", error);
    return [];
  }

  return data || [];
}

// ============================================
// Job Category Functions
// ============================================

export async function getJobCategories(): Promise<JobCategory[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("job_categories")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching job categories:", error);
    return [];
  }

  return data || [];
}

export async function getJobCategory(id: string): Promise<JobCategory | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("job_categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching job category:", error);
    return null;
  }

  return data;
}

export async function createJobCategory(
  category: Omit<JobCategoryInsert, "user_id">
): Promise<JobCategory | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // 獲取當前最大 display_order
  const { data: existing } = await supabase
    .from("job_categories")
    .select("display_order")
    .eq("user_id", user.id)
    .order("display_order", { ascending: false })
    .limit(1);

  const maxOrder = existing?.[0]?.display_order ?? -1;

  const { data, error } = await supabase
    .from("job_categories")
    .insert({
      ...category,
      user_id: user.id,
      display_order: category.display_order ?? maxOrder + 1,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating job category:", error);
    return null;
  }

  return data;
}

export async function updateJobCategory(
  id: string,
  updates: Omit<JobCategoryUpdate, "id">
): Promise<JobCategory | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("job_categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating job category:", error);
    return null;
  }

  return data;
}

export async function deleteJobCategory(id: string): Promise<boolean> {
  const supabase = createClient();

  // 軟刪除
  const { error } = await supabase
    .from("job_categories")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Error deleting job category:", error);
    return false;
  }

  return true;
}

export async function reorderJobCategories(
  orderedIds: string[]
): Promise<boolean> {
  const supabase = createClient();

  // 批量更新 display_order
  const updates = orderedIds.map((id, index) =>
    supabase
      .from("job_categories")
      .update({ display_order: index })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const hasError = results.some((r) => r.error);

  if (hasError) {
    console.error("Error reordering job categories");
    return false;
  }

  return true;
}

// 獲取類別統計（用於 Dashboard）
export async function getCategoryStats(): Promise<CategoryStats[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // 獲取所有類別
  const { data: categories, error: catError } = await supabase
    .from("job_categories")
    .select("id, name, color")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (catError) {
    console.error("Error fetching categories for stats:", catError);
    return [];
  }

  // 獲取所有申請
  const { data: applications, error: appError } = await supabase
    .from("job_applications")
    .select("category_id, status")
    .eq("user_id", user.id);

  if (appError) {
    console.error("Error fetching applications for stats:", appError);
    return [];
  }

  // 計算每個類別的統計
  const statsMap = new Map<string, CategoryStats>();

  // 初始化所有類別
  categories?.forEach((cat) => {
    statsMap.set(cat.id, {
      category_id: cat.id,
      category_name: cat.name,
      category_color: cat.color,
      total: 0,
      wishlist: 0,
      applied: 0,
      interviews: 0,
      offers: 0,
    });
  });

  // 統計申請
  applications?.forEach((app) => {
    if (!app.category_id) return;

    const stats = statsMap.get(app.category_id);
    if (!stats) return;

    stats.total++;

    switch (app.status) {
      case "wishlist":
        stats.wishlist++;
        break;
      case "editing":
      case "applied":
        stats.applied++;
        break;
      case "interview_1":
      case "interview_2":
      case "interview_3":
      case "interview_4":
      case "interview_5":
      case "interview_6":
      case "interview_7":
      case "interview_8":
        stats.interviews++;
        break;
      case "verbal_offer":
      case "written_offer":
        stats.offers++;
        break;
    }
  });

  return Array.from(statsMap.values());
}

// 按類別獲取求職申請
export async function getJobApplicationsByCategory(
  categoryId: string | null
): Promise<JobApplication[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from("job_applications")
    .select("*")
    .eq("user_id", user.id)
    .order("display_order", { ascending: true });

  // categoryId 為 null 表示獲取所有，否則按類別過濾
  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching applications by category:", error);
    return [];
  }

  return data || [];
}

// ============================================
// Interview Experience Functions (面試經驗)
// ============================================

import type { InterviewExperience, InterviewStage } from "@/types";

export async function getInterviewExperiencesByCompany(
  companyName: string
): Promise<InterviewExperience[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("interview_experiences")
    .select("*")
    .ilike("company_name", `%${companyName}%`)
    .order("scraped_at", { ascending: false });

  if (error) {
    console.error("Error fetching interview experiences:", error);
    return [];
  }

  // 轉換 stages 從 JSONB 到正確的類型
  return (data || []).map((exp) => ({
    ...exp,
    stages: (exp.stages || []) as InterviewStage[],
    questions: exp.questions || [],
    tips: exp.tips || [],
  }));
}

export async function saveInterviewExperiences(
  experiences: InterviewExperience[]
): Promise<boolean> {
  if (experiences.length === 0) return true;

  const supabase = createClient();

  // 準備要插入的資料
  const records = experiences.map((exp) => ({
    id: exp.id,
    company_id: exp.company_id,
    company_name: exp.company_name,
    source: exp.source,
    source_url: exp.source_url,
    title: exp.title,
    content: exp.content,
    position: exp.position,
    stages: exp.stages,
    questions: exp.questions,
    difficulty: exp.difficulty,
    outcome: exp.outcome,
    tips: exp.tips,
    sentiment: exp.sentiment,
    sentiment_score: exp.sentiment_score,
    author: exp.author,
    published_at: exp.published_at,
    scraped_at: exp.scraped_at,
  }));

  // 使用 upsert 來避免重複插入
  const { error } = await supabase
    .from("interview_experiences")
    .upsert(records, { onConflict: "id" });

  if (error) {
    console.error("Error saving interview experiences:", error);
    return false;
  }

  return true;
}

export async function getInterviewExperienceStats(companyName: string): Promise<{
  total: number;
  offerCount: number;
  rejectedCount: number;
  avgDifficulty: "easy" | "medium" | "hard" | null;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("interview_experiences")
    .select("outcome, difficulty")
    .ilike("company_name", `%${companyName}%`);

  if (error || !data) {
    return {
      total: 0,
      offerCount: 0,
      rejectedCount: 0,
      avgDifficulty: null,
    };
  }

  const total = data.length;
  const offerCount = data.filter((d) => d.outcome === "offer").length;
  const rejectedCount = data.filter((d) => d.outcome === "rejected").length;

  // 計算平均難度
  const difficulties = data
    .map((d) => d.difficulty)
    .filter((d): d is "easy" | "medium" | "hard" => d !== null);

  let avgDifficulty: "easy" | "medium" | "hard" | null = null;
  if (difficulties.length > 0) {
    const scores = difficulties.map((d) =>
      d === "easy" ? 1 : d === "medium" ? 2 : 3
    );
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    avgDifficulty = avg < 1.5 ? "easy" : avg < 2.5 ? "medium" : "hard";
  }

  return {
    total,
    offerCount,
    rejectedCount,
    avgDifficulty,
  };
}
