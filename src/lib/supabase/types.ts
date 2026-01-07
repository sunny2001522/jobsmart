// Database Types for JobSmart

export type SubscriptionTier = "free" | "pro" | "enterprise";
export type ApplicationStatus =
  | "wishlist"
  | "editing"
  | "applied"
  | "interview_1"
  | "interview_2"
  | "interview_3"
  | "interview_4"
  | "interview_5"
  | "interview_6"
  | "interview_7"
  | "interview_8"
  | "verbal_offer"
  | "written_offer"
  | "rejected"
  | "ghosted";

export type ReviewSource = "dcard" | "medium" | "qollie" | "manual";
export type Sentiment = "positive" | "neutral" | "negative";
export type QuestionCategory =
  | "behavioral"
  | "technical"
  | "situational"
  | "culture_fit"
  | "leadership"
  | "problem_solving"
  | "self_introduction"
  | "other";
export type Difficulty = "easy" | "medium" | "hard";
export type LinkedInContentType = "headline" | "about" | "experience" | "summary";
export type ValueCategory =
  | "work_environment"
  | "personal_growth"
  | "relationships"
  | "rewards"
  | "lifestyle";

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  ai_credits_remaining: number;
  monthly_jd_count: number;
  monthly_crawl_count: number;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  industry: string | null;
  website: string | null;
  avg_happiness: number | null;
  avg_salary_match: number | null;
  avg_colleagues: number | null;
  avg_pressure: number | null;
  review_count: number;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyReview {
  id: string;
  company_id: string;
  source: ReviewSource;
  source_url: string | null;
  title: string | null;
  content: string;
  sentiment: Sentiment | null;
  sentiment_score: number | null;
  author: string | null;
  published_at: string | null;
  scraped_at: string;
  created_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  title: string;
  content: Record<string, unknown>;
  plain_text: string | null;
  ats_score: number | null;
  keywords: string[];
  target_position: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobApplication {
  id: string;
  user_id: string;
  company_id: string | null;
  company_name: string;
  position: string;
  jd_url: string | null;
  jd_content: Record<string, unknown> | null;
  jd_keywords: string[];
  status: ApplicationStatus;
  rating_happiness: number | null;
  rating_salary_match: number | null;
  rating_colleagues: number | null;
  rating_pressure: number | null;
  notes: string | null;
  display_order: number;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewQuestion {
  id: string;
  user_id: string | null;
  company_id: string | null;
  question: string;
  category: QuestionCategory | null;
  difficulty: Difficulty | null;
  is_public: boolean;
  usage_count: number;
  created_at: string;
}

export interface InterviewAnswer {
  id: string;
  question_id: string;
  user_id: string;
  transcript: string;
  duration_seconds: number | null;
  word_count: number | null;
  ai_feedback: {
    strengths: string[];
    improvements: string[];
    suggestions: string[];
  } | null;
  ai_score: number | null;
  created_at: string;
}

export interface ValueRanking {
  id: string;
  user_id: string;
  top_values: string[];
  full_ranking: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkedInGeneration {
  id: string;
  user_id: string;
  content_type: LinkedInContentType;
  input_data: Record<string, unknown> | null;
  generated_content: string;
  keywords_used: string[];
  created_at: string;
}

export interface AIUsageLog {
  id: string;
  user_id: string;
  model: string;
  task_type: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  created_at: string;
}

export interface ValueCard {
  id: number;
  name: string;
  description: string | null;
  category: ValueCategory | null;
}

// Insert types (without auto-generated fields)
export type ProfileInsert = Omit<Profile, "created_at" | "updated_at">;
export type CompanyInsert = Omit<Company, "id" | "created_at" | "updated_at" | "review_count">;
export type ResumeInsert = Omit<Resume, "id" | "created_at" | "updated_at">;
export type JobApplicationInsert = Omit<JobApplication, "id" | "created_at" | "updated_at">;
export type InterviewQuestionInsert = Omit<InterviewQuestion, "id" | "created_at" | "usage_count">;
export type InterviewAnswerInsert = Omit<InterviewAnswer, "id" | "created_at">;
export type ValueRankingInsert = Omit<ValueRanking, "id" | "created_at" | "updated_at">;
export type LinkedInGenerationInsert = Omit<LinkedInGeneration, "id" | "created_at">;

// Update types (all fields optional except id)
export type ProfileUpdate = Partial<Omit<Profile, "id" | "email" | "created_at">> & { id: string };
export type CompanyUpdate = Partial<Omit<Company, "id" | "created_at">> & { id: string };
export type ResumeUpdate = Partial<Omit<Resume, "id" | "user_id" | "created_at">> & { id: string };
export type JobApplicationUpdate = Partial<Omit<JobApplication, "id" | "user_id" | "created_at">> & { id: string };
export type InterviewQuestionUpdate = Partial<Omit<InterviewQuestion, "id" | "user_id" | "created_at">> & { id: string };
export type ValueRankingUpdate = Partial<Omit<ValueRanking, "id" | "user_id" | "created_at">> & { id: string };
