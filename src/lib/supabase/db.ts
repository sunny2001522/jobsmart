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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

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
