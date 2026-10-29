// Compatibility API for the existing UI. The implementation is now Turso/libSQL.
// Browser calls go through /api/data so TURSO_AUTH_TOKEN never reaches the client.
import type {
  CategoryStats, CompanyReview, InterviewAnswer, InterviewAnswerInsert, InterviewQuestion,
  InterviewQuestionInsert, JobApplication, JobApplicationInsert, JobApplicationUpdate,
  JobCategory, JobCategoryInsert, JobCategoryUpdate, Profile, ProfileUpdate, Resume,
  ResumeInsert, ResumeUpdate, ResumeVersion, ResumeVersionInsert, ResumeVersionUpdate,
  ResumeVersionWithJobs, ValueRanking, ValueRankingInsert, VersionJobResume,
  VersionJobResumeUpdate,
} from "./types";
import type { InterviewExperience } from "@/types";

export interface RecentActivity { id: string; type: "applied" | "interview" | "offer" | "added"; company: string; position: string; date: string; }

async function call<T>(action: string, args: unknown[] = []): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error("伺服器端請直接使用 server-data，不要從 client-safe db 模組存取資料庫");
  }
  const response = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, args }) });
  const body = await response.json();
  if (!body.success) throw new Error(body.error ?? "資料庫操作失敗");
  return body.data as T;
}

export const getProfile = () => call<Profile | null>("getProfile");
export const updateProfile = (updates: Omit<ProfileUpdate, "id">) => call<Profile | null>("updateProfile", [updates]);
export const getResumes = () => call<Resume[]>("getResumes");
export const getResume = (id: string) => call<Resume | null>("getResume", [id]);
export const createResume = (resume: Omit<ResumeInsert, "user_id">) => call<Resume | null>("createResume", [resume]);
export const updateResume = (id: string, updates: Omit<ResumeUpdate, "id">) => call<Resume | null>("updateResume", [id, updates]);
export const deleteResume = (id: string) => call<boolean>("deleteResume", [id]);

export const getJobApplications = () => call<JobApplication[]>("getJobApplications");
export const getJobApplicationsByStatus = (status: JobApplication["status"]) => call<JobApplication[]>("getJobApplicationsByStatus", [status]);
export const getJobApplicationsByCategory = (categoryId: string | null) => categoryId ? call<JobApplication[]>("getJobApplicationsByCategory", [categoryId]) : getJobApplications();
export const createJobApplication = (application: Omit<JobApplicationInsert, "user_id">) => call<JobApplication | null>("createJobApplication", [application]);
export const updateJobApplication = (id: string, updates: Omit<JobApplicationUpdate, "id">) => call<JobApplication | null>("updateJobApplication", [id, updates]);
export const deleteJobApplication = (id: string) => call<boolean>("deleteJobApplication", [id]);
export const getApplicationStats = () => call<{ total: number; wishlist: number; applied: number; interviews: number; offers: number; rejected: number }>("getApplicationStats");
export const getRecentActivity = (limit = 5) => call<RecentActivity[]>("getRecentActivity", [limit]);

export const getInterviewQuestions = (options?: { category?: string; difficulty?: string; includePublic?: boolean; locale?: "en" | "zh-TW"; companyName?: string }) => call<InterviewQuestion[]>("getInterviewQuestions", [options ?? {}]);
export const createInterviewQuestion = (question: Omit<InterviewQuestionInsert, "user_id">) => call<InterviewQuestion | null>("createInterviewQuestion", [question]);
export const saveInterviewQuestions = (questions: Array<Omit<InterviewQuestionInsert, "user_id">>) => call<InterviewQuestion[]>("saveInterviewQuestions", [questions]);
export const getInterviewAnswers = (questionId?: string) => call<InterviewAnswer[]>("getInterviewAnswers", [questionId]);
export const createInterviewAnswer = (answer: Omit<InterviewAnswerInsert, "user_id">) => call<InterviewAnswer | null>("createInterviewAnswer", [answer]);
export const getValueRanking = () => call<ValueRanking | null>("getValueRanking");
export const saveValueRanking = (ranking: Omit<ValueRankingInsert, "user_id">) => call<ValueRanking | null>("saveValueRanking", [ranking]);

export const getResumeVersions = () => call<ResumeVersion[]>("getResumeVersions");
export const getResumeVersion = (id: string) => call<ResumeVersion | null>("getResumeVersion", [id]);
export const getResumeVersionWithJobs = (id: string) => call<ResumeVersionWithJobs | null>("getResumeVersionWithJobs", [id]);
export const createResumeVersion = (version: Omit<ResumeVersionInsert, "user_id">) => call<ResumeVersion | null>("createResumeVersion", [version]);
export const updateResumeVersion = (id: string, updates: Omit<ResumeVersionUpdate, "id">) => call<ResumeVersion | null>("updateResumeVersion", [id, updates]);
export const deleteResumeVersion = (id: string) => call<boolean>("deleteResumeVersion", [id]);
export const addJobToVersion = (versionId: string, jobApplicationId: string) => call<VersionJobResume | null>("addJobToVersion", [versionId, jobApplicationId]);
export const removeJobFromVersion = (versionId: string, jobApplicationId: string) => call<boolean>("removeJobFromVersion", [versionId, jobApplicationId]);
export const getVersionJobResume = (versionId: string, jobApplicationId: string) => call<VersionJobResume | null>("getVersionJobResume", [versionId, jobApplicationId]);
export const updateVersionJobResume = (id: string, updates: Omit<VersionJobResumeUpdate, "id">) => call<VersionJobResume | null>("updateVersionJobResume", [id, updates]);
export const getCustomizedResumesForJob = (jobId: string) => call<(VersionJobResume & { resume_version: ResumeVersion })[]>("getCustomizedResumesForJob", [jobId]);
export const getVersionJobResumes = (versionId: string) => call<(VersionJobResume & { job_application: JobApplication })[]>("getVersionJobResumes", [versionId]);

export const getCompanyReviewsByName = (companyName: string) => call<CompanyReview[]>("getCompanyReviewsByName", [companyName]);
export const createCompanyReview = (review: Omit<CompanyReview, "id" | "created_at"> & { company_name?: string }) => call<CompanyReview | null>("createCompanyReview", [review]);
export type CompanyReviewCrawlerRecord = {
  company_name: string;
  company_id?: string;
  source: string;
  source_url: string | null;
  title: string | null;
  content: string;
  sentiment: string | null;
  sentiment_score: number | null;
  author: string | null;
  published_at: string | null;
  scraped_at: string;
  created_at?: string;
};
export const saveCompanyReviews = (reviews: CompanyReviewCrawlerRecord[]) => call<boolean>("saveCompanyReviews", [reviews]);
export const getJobCategories = () => call<JobCategory[]>("getJobCategories");
export const getJobCategory = (id: string) => call<JobCategory | null>("getJobCategory", [id]);
export const createJobCategory = (category: Omit<JobCategoryInsert, "user_id">) => call<JobCategory | null>("createJobCategory", [category]);
export const updateJobCategory = (id: string, updates: Omit<JobCategoryUpdate, "id">) => call<JobCategory | null>("updateJobCategory", [id, updates]);
export const deleteJobCategory = (id: string) => call<boolean>("deleteJobCategory", [id]);
export const reorderJobCategories = (orderedIds: string[]) => call<boolean>("reorderJobCategories", [orderedIds.map((id, display_order) => ({ id, display_order }))]);
export const getCategoryStats = () => call<CategoryStats[]>("getCategoryStats");

export const getInterviewExperiencesByCompany = (companyName: string) => call<InterviewExperience[]>("getInterviewExperiencesByCompany", [companyName]);
export const saveInterviewExperiences = (experiences: InterviewExperience[]) => call<boolean>("saveInterviewExperiences", [experiences]);
export const getInterviewExperienceStats = (companyName: string) => call<{ total: number; offerCount: number; rejectedCount: number; avgDifficulty: "easy" | "medium" | "hard" | null }>("getInterviewExperienceStats", [companyName]);
