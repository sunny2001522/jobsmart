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
  source: 'dcard' | 'medium' | 'qollie' | 'manual';
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
  model: 'gemini-flash' | 'gemini-pro' | 'gpt-4' | 'gpt-4-turbo' | 'whisper';
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
