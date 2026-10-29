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

export type ReviewSource = "dcard" | "medium" | "qollie" | "ptt" | "glassdoor" | "indeed" | "comparably" | "manual";
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
  phone?: string | null;
  linkedin_url?: string | null;
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

export type SalaryPeriod = "hourly" | "monthly" | "yearly";

// 單一因素的評分
export interface ValueScore {
  score: number | null;  // 0-10，null 表示無法計算
  source: 'jd' | 'reviews' | 'both' | 'user' | 'default';
  confidence: 'high' | 'medium' | 'low' | 'none';
  reasoning?: string;
}

export type ValueVerdict = 'positive' | 'negative' | 'neutral' | 'unknown';

// 職缺的價值觀評分
export interface JobValueScores {
  status: 'not_calculated' | 'calculating' | 'calculated' | 'failed';
  calculatedAt: string | null;
  scores: Record<string, ValueScore>;
  weightedScore: number | null;
  rankingSnapshot: string[] | null;
  manualVerdicts?: Partial<Record<string, ValueVerdict>>;
}

// JD 中文翻譯內容
export interface JDContentZh {
  summary: string;           // 職缺摘要（2-3句話）
  summary_tags?: string[];   // 工作摘要標籤（3-5個，如：前端(React)、建資料庫）
  requirements: string[];    // 中文職位要求
  responsibilities: string[]; // 中文工作職責
  benefits: string[];        // 中文福利待遇
  keywords_zh: string[];     // 中文關鍵字
  translated_at: string;     // ISO timestamp
}

export interface JobApplication {
  id: string;
  user_id: string;
  company_id: string | null;
  company_name: string;
  position: string;
  jd_url: string | null;
  jd_content: Record<string, unknown> | null;
  jd_content_zh: JDContentZh | null;  // 中文翻譯摘要
  jd_keywords: string[];
  status: ApplicationStatus;
  rating_happiness: number | null;
  rating_salary_match: number | null;
  rating_colleagues: number | null;
  rating_pressure: number | null;
  notes: string | null;
  display_order: number;
  applied_at: string | null;
  // 薪資資訊
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_period: SalaryPeriod;
  benefits: string[];
  // 實領薪水計算相關
  work_location: string | null;
  commute_cost: number;
  rent_estimate: number | null;
  meal_allowance: number;
  other_allowance: number;
  // 20 因素評分
  value_scores: JobValueScores | null;
  // 職位類別
  category_id: string | null;
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
  locale?: "en" | "zh-TW";
  company_name?: string | null;
  origin?: "company_review" | "resume_followup" | "custom" | "default";
  evidence?: Array<{ reviewId: string; quote: string }>;
  source_urls?: string[];
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

// ============================================
// 履歷版本管理相關類型
// ============================================

export type GenerationStatus = "pending" | "generating" | "completed" | "failed";

export interface ResumeLanguageVariant {
  language_code: string;
  content: Record<string, unknown>;
  plain_text: string;
  updated_at?: string;
}

export interface CustomizedResumeLanguageVariant {
  language_code: string;
  customized_plain_text: string;
  jd_highlight_phrases: string[];
  ats_score?: number;
  matched_keywords?: string[];
}

// 履歷版本
export interface ResumeVersion {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  target_role: string | null;
  base_content: Record<string, unknown>;  // TipTap JSON
  base_plain_text: string | null;
  base_language?: string;
  active_language?: string;
  language_variants?: ResumeLanguageVariant[];
  base_ats_score: number | null;
  base_keywords: string[];
  is_active: boolean;
  display_order: number;
  // 職位類別
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

// 版本-工作-客製化履歷關聯
export interface VersionJobResume {
  id: string;
  version_id: string;
  job_application_id: string;
  customized_content: Record<string, unknown> | null;
  customized_plain_text: string | null;
  customized_language_code?: string;
  customized_variants?: CustomizedResumeLanguageVariant[];
  jd_highlight_phrases?: string[];
  generation_status: GenerationStatus;
  generated_at: string | null;
  ats_score: number | null;
  matched_keywords: string[];
  missing_keywords: string[];
  ai_suggestions: {
    suggestions?: string[];
    strongVerbs?: string[];
    improvements?: string[];
    audit?: { status: "passed" | "needs_attention"; summary: string; findings: Array<{ claim: string; status: "supported" | "exaggerated" | "unsupported"; evidence: string; reason: string }>; requirements: Array<{ requirement: string; priority: "required" | "preferred"; evidence: string; status: "supported" | "partial" | "missing" }> };
  } | null;
  display_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// 帶關聯工作數據的版本類型
export interface ResumeVersionWithJobs extends ResumeVersion {
  version_job_resumes: (VersionJobResume & {
    job_application: JobApplication;
  })[];
  job_count: number;
  completed_count: number;
}

// Insert types
export type ResumeVersionInsert = Omit<ResumeVersion, "id" | "created_at" | "updated_at">;
export type VersionJobResumeInsert = Omit<VersionJobResume, "id" | "created_at" | "updated_at">;

// Update types
export type ResumeVersionUpdate = Partial<Omit<ResumeVersion, "id" | "user_id" | "created_at">> & { id: string };
export type VersionJobResumeUpdate = Partial<Omit<VersionJobResume, "id" | "version_id" | "job_application_id" | "created_at">> & { id: string };

// ============================================
// 職位類別相關類型
// ============================================

// 職位類別
export interface JobCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// 類別統計（用於 Dashboard）
export interface CategoryStats {
  category_id: string;
  category_name: string;
  category_color: string;
  total: number;
  wishlist: number;
  applied: number;
  interviews: number;
  offers: number;
}

// Insert types
export type JobCategoryInsert = Omit<JobCategory, "id" | "created_at" | "updated_at">;

// Update types
export type JobCategoryUpdate = Partial<Omit<JobCategory, "id" | "user_id" | "created_at">> & { id: string };

// ============================================
// Gmail OAuth 相關類型
// ============================================

export interface GmailOAuthToken {
  id: string;
  user_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  gmail_email: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Job Application 擴展欄位（Mobile Webhook）
// ============================================

export type JobApplicationSourceType =
  | "manual"
  | "webhook"
  | "threads"
  | "facebook"
  | "linkedin"
  | "line"
  | "other_social";

// 擴展的 JobApplication（包含新的 source 欄位）
export interface JobApplicationExtended extends JobApplication {
  source_type?: JobApplicationSourceType;
  source_content?: string | null;
  source_post_url?: string | null;
  contact_email?: string | null;
  contact_person?: string | null;
  application_instruction?: string | null;
}

// Webhook 設定
export interface WebhookSettings {
  autoCustomize: boolean;
  autoCompanyReview: boolean;
  autoDraftEmail: boolean;
}

// 擴展的 Profile（包含 Gmail 和 Webhook 設定）
export interface ProfileExtended extends Profile {
  gmail_connected?: boolean;
  gmail_email?: string | null;
  webhook_settings?: WebhookSettings;
}

// ============================================
// LINE 整合相關類型
// ============================================

// LINE 用戶綁定
export interface LineUserBinding {
  id: string;
  user_id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  is_active: boolean;
  notification_enabled: boolean;
  linked_at: string;
  last_interaction_at: string | null;
  created_at: string;
  updated_at: string;
}

// LINE 用戶綁定 Insert 類型
export type LineUserBindingInsert = Omit<
  LineUserBinding,
  "id" | "created_at" | "updated_at" | "linked_at"
>;

// LINE 用戶綁定 Update 類型
export type LineUserBindingUpdate = Partial<
  Omit<LineUserBinding, "id" | "user_id" | "line_user_id" | "created_at">
>;

// LINE 通知類型
export type LineNotificationType =
  | "job_added"
  | "processing_complete"
  | "processing_failed"
  | "binding_success"
  | "binding_required";

// LINE 通知 Payload
export interface LineNotificationPayload {
  type: LineNotificationType;
  title: string;
  body: string;
  data?: {
    jobApplicationId?: string;
    companyName?: string;
    position?: string;
    atsScore?: number;
    viewUrl?: string;
    gmailUrl?: string;
    error?: string;
  };
}

// 任務佇列相關類型
export type JobQueueStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface ProcessJobPayload {
  jobId: string;
  userId: string;
  lineUserId: string;
  url: string;
  content?: string;
  options: {
    autoCustomize: boolean;
    autoCompanyReview: boolean;
    autoDraftEmail: boolean;
  };
  createdAt: string;
}
