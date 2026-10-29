// 用戶類型 (對應 profiles 資料表)
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  ai_credits_remaining: number;
  monthly_jd_count: number;
  monthly_crawl_count: number;
  created_at: string;
  updated_at: string;
}

// 求職狀態
export type ApplicationStatus =
  | 'wishlist'       // 想投
  | 'editing'        // 修改中
  | 'applied'        // 已投
  | 'interview_1'    // 一面
  | 'interview_2'    // 二面
  | 'interview_3'    // 三面
  | 'interview_4'    // 四面
  | 'interview_5'    // 五面
  | 'interview_6'    // 六面
  | 'interview_7'    // 七面
  | 'interview_8'    // 八面
  | 'verbal_offer'   // 口頭 Offer
  | 'written_offer'  // 書面 Offer
  | 'rejected'       // 被拒
  | 'ghosted';       // 無聲卡

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  wishlist: '想投',
  editing: '修改中',
  applied: '已投',
  interview_1: '一面',
  interview_2: '二面',
  interview_3: '三面',
  interview_4: '四面',
  interview_5: '五面',
  interview_6: '六面',
  interview_7: '七面',
  interview_8: '八面',
  verbal_offer: '口頭 Offer',
  written_offer: '書面 Offer',
  rejected: '被拒',
  ghosted: '無聲卡',
};

// Kanban 列
export const KANBAN_COLUMNS: ApplicationStatus[] = [
  'wishlist',
  'editing',
  'applied',
  'interview_1',
  'interview_2',
  'interview_3',
  'verbal_offer',
  'written_offer',
];

// 公司評分
export interface CompanyRatings {
  happiness: number;      // 開心程度 1-5
  salary_match: number;   // 薪水匹配 1-5
  colleagues: number;     // 同事相處 1-5
  pressure: number;       // 壓力程度 1-5 (越低越好)
  growth: number;         // 成長空間 1-5
}

// 公司 (對應 companies 資料表)
export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  avg_happiness: number | null;
  avg_salary_match: number | null;
  avg_colleagues: number | null;
  avg_pressure: number | null;
  review_count: number;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
}

// 公司評論 (對應 company_reviews 資料表)
export interface CompanyReview {
  id: string;
  company_id: string;
  company_name?: string;
  source: 'dcard' | 'medium' | 'qollie' | 'ptt' | 'glassdoor' | 'indeed' | 'comparably' | 'manual';
  source_url: string | null;
  title: string | null;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  sentiment_score: number | null;
  author: string | null;
  published_at: string | null;
  scraped_at: string;
  created_at: string;
}

// 薪資週期
export type SalaryPeriod = 'hourly' | 'monthly' | 'yearly';

export const SALARY_PERIOD_LABELS: Record<SalaryPeriod, string> = {
  hourly: '時薪',
  monthly: '月薪',
  yearly: '年薪',
};

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

// 求職追蹤 (對應 job_applications 資料表)
export interface JobApplication {
  id: string;
  user_id: string;
  company_id: string | null;
  company_name: string;
  company?: Company | null;  // 可選的關聯公司資料
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
  cover_letter?: CoverLetterDraft | null;
}

export interface CoverLetterDraft {
  subject: string;
  body: string;
  htmlBody?: string;
  attachmentNote: string;
  followUpDate: string;
}

// 履歷 (對應 resumes 資料表)
export interface Resume {
  id: string;
  user_id: string;
  title: string;
  content: Record<string, unknown>;  // TipTap JSON
  plain_text: string | null;
  ats_score: number | null;
  keywords: string[];
  target_position: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

// 面試題目類別
export type InterviewQuestionCategory =
  | 'behavioral'      // 行為問題
  | 'technical'       // 技術問題
  | 'situational'     // 情境問題
  | 'culture_fit'     // 文化適配
  | 'leadership'      // 領導力
  | 'problem_solving' // 問題解決
  | 'self_introduction' // 自我介紹
  | 'other';          // 其他

// 面試題目 (對應 interview_questions 資料表)
export interface InterviewQuestion {
  id: string;
  user_id: string | null;
  company_id: string | null;
  question: string;
  category: InterviewQuestionCategory | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  is_public: boolean;
  usage_count: number;
  locale?: "en" | "zh-TW";
  company_name?: string | null;
  origin?: "company_review" | "resume_followup" | "custom" | "default";
  evidence?: Array<{ reviewId: string; quote: string }>;
  source_urls?: string[];
  created_at: string;
}

// 面試回答 AI 回饋
export interface InterviewFeedback {
  strengths: string[];
  improvements: string[];
  suggestions: string[];
}

// 面試回答 (對應 interview_answers 資料表)
export interface InterviewAnswer {
  id: string;
  question_id: string;
  user_id: string;
  transcript: string;
  duration_seconds: number | null;
  word_count: number | null;
  ai_feedback: InterviewFeedback | null;
  ai_score: number | null;
  created_at: string;
}

// LinkedIn 生成類型
export type LinkedInContentType = 'headline' | 'about' | 'experience' | 'summary';

// LinkedIn 生成記錄 (對應 linkedin_generations 資料表)
export interface LinkedInGeneration {
  id: string;
  user_id: string;
  content_type: LinkedInContentType;
  input_data: Record<string, unknown> | null;
  generated_content: string;
  keywords_used: string[];
  created_at: string;
}

// AI 使用記錄 (對應 ai_usage_logs 資料表)
export interface AIUsageLog {
  id: string;
  user_id: string;
  model: 'nebius-nemotron' | 'nebius-whisper';
  task_type: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  created_at: string;
}

// 價值觀卡牌
export interface ValueCard {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export const VALUE_CARDS: ValueCard[] = [
  { id: 'salary', label: '薪資待遇', description: '高薪水、好福利', icon: '💰' },
  { id: 'growth', label: '成長空間', description: '學習機會、升遷管道', icon: '📈' },
  { id: 'balance', label: '工作生活平衡', description: '準時下班、彈性工時', icon: '⚖️' },
  { id: 'impact', label: '社會影響力', description: '有意義的工作', icon: '🌍' },
  { id: 'team', label: '團隊氛圍', description: '好同事、好主管', icon: '👥' },
  { id: 'stability', label: '工作穩定', description: '穩定、不常裁員', icon: '🏠' },
  { id: 'autonomy', label: '自主性', description: '自己決定工作方式', icon: '🎯' },
  { id: 'recognition', label: '被認可', description: '努力被看見', icon: '🏆' },
  { id: 'challenge', label: '挑戰性', description: '有趣、有挑戰的任務', icon: '🔥' },
  { id: 'remote', label: '遠端工作', description: '可在家工作', icon: '🏡' },
];

// 價值觀排序結果 (對應 value_rankings 資料表)
export interface ValueRanking {
  id: string;
  user_id: string;
  top_values: string[];    // 最重視的前 5-10 個價值
  full_ranking: string[];  // 完整排序
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// 價值觀卡片類別
export type ValueCardCategory =
  | 'work_environment'  // 工作環境
  | 'personal_growth'   // 個人成長
  | 'relationships'     // 人際關係
  | 'rewards'           // 報酬獎勵
  | 'lifestyle';        // 生活方式

// 資料庫版價值觀卡片 (對應 value_cards 資料表)
export interface DBValueCard {
  id: number;
  name: string;
  description: string | null;
  category: ValueCardCategory | null;
}

// ============================================
// 履歷版本管理相關類型
// ============================================

// 客製化履歷生成狀態
export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed';

export const GENERATION_STATUS_LABELS: Record<GenerationStatus, string> = {
  pending: '待生成',
  generating: '生成中',
  completed: '已完成',
  failed: '生成失敗',
};

// 履歷版本 (對應 resume_versions 資料表)
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
  language_variants?: Array<{
    language_code: string;
    content: Record<string, unknown>;
    plain_text: string;
    updated_at?: string;
  }>;
  base_ats_score: number | null;
  base_keywords: string[];
  is_active: boolean;
  display_order: number;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

// 版本-工作-客製化履歷關聯 (對應 version_job_resumes 資料表)
export interface VersionJobResume {
  id: string;
  version_id: string;
  job_application_id: string;
  customized_content: Record<string, unknown> | null;
  customized_plain_text: string | null;
  customized_language_code?: string;
  customized_variants?: Array<{
    language_code: string;
    customized_plain_text: string;
    jd_highlight_phrases: string[];
    ats_score?: number;
    matched_keywords?: string[];
  }>;
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

// 帶版本信息的客製化履歷
export interface VersionJobResumeWithDetails extends VersionJobResume {
  job_application: JobApplication;
  resume_version?: ResumeVersion;
}

// ============================================
// 20 因素評分系統
// ============================================

// 單一因素的評分
export interface ValueScore {
  score: number | null;  // 0-10，null 表示無法計算
  source: 'jd' | 'reviews' | 'both' | 'user' | 'default';
  confidence: 'high' | 'medium' | 'low' | 'none';
  reasoning?: string;  // 評分依據
}

export type ValueVerdict = 'positive' | 'negative' | 'neutral' | 'unknown';

// 職缺的價值觀評分（存儲在 job_applications.value_scores）
export interface JobValueScores {
  status: 'not_calculated' | 'calculating' | 'calculated' | 'failed';
  calculatedAt: string | null;
  scores: Record<string, ValueScore>;  // 20 個因素的評分
  weightedScore: number | null;  // 加權總分 0-10
  rankingSnapshot: string[] | null;  // 計算時使用的用戶排序快照
  // User choices shown in the compact values list. They intentionally
  // override AI evidence without changing the stored evidence score.
  manualVerdicts?: Partial<Record<string, ValueVerdict>>;
}

// 因素元數據
export interface FactorMetadata {
  id: string;
  name: string;
  shortName: string;
  description: string;
  primarySource: 'jd' | 'reviews' | 'calculated' | 'user';
  settingRequired?: {
    type: string;
    label: string;
    path: string;
  };
}

// 加權分數計算結果
export interface WeightedScoreResult {
  score: number;  // 0-10
  calculatedCount: number;  // 有分數的因素數
  defaultedCount: number;  // 使用預設值的因素數
}

// ============================================
// 職位類別系統
// ============================================

// 職位類別 (對應 job_categories 資料表)
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

// 類別統計數據
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

export type JobCategoryInsert = Omit<JobCategory, 'id' | 'created_at' | 'updated_at'>;
export type JobCategoryUpdate = Partial<Omit<JobCategory, 'id' | 'user_id' | 'created_at'>> & { id: string };

// ============================================
// 面試經驗搜尋系統
// ============================================

// 面試來源
export type InterviewSource = 'dcard' | 'ptt' | 'qollie' | 'medium';

// 面試關卡
export interface InterviewStage {
  order: number;
  name: string;        // e.g., "電話面試", "技術面", "HR面"
  description?: string;
}

// 面試經驗 (對應 interview_experiences 資料表)
export interface InterviewExperience {
  id: string;
  company_id: string | null;
  company_name: string;
  source: InterviewSource;
  source_url: string | null;
  title: string | null;
  content: string;
  position: string | null;

  // AI 提取欄位
  stages: InterviewStage[];
  questions: string[];
  difficulty: 'easy' | 'medium' | 'hard' | null;
  outcome: 'offer' | 'rejected' | 'ghosted' | 'unknown' | null;
  tips: string[];

  // 情緒分析
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  sentiment_score: number | null;

  // 元資料
  author: string | null;
  published_at: string | null;
  scraped_at: string;
  created_at: string;
}

// 面試搜尋結果的來源統計
export interface InterviewSourceResult {
  success: boolean;
  count: number;
  error?: string;
}

// 面試資料彙整
export interface InterviewAggregated {
  commonStages: InterviewStage[];
  commonQuestions: string[];
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  outcomeDistribution: {
    offer: number;
    rejected: number;
    ghosted: number;
    unknown: number;
  };
}
