-- JobSmart Initial Schema
-- Migration: 20250106000000_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 用戶資料表 (擴展 Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  ai_credits_remaining INT DEFAULT 100,
  monthly_jd_count INT DEFAULT 0,
  monthly_crawl_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 當 auth.users 新增用戶時自動建立 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 公司資料表
-- ============================================
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  industry TEXT,
  website TEXT,
  avg_happiness DECIMAL(3,2),
  avg_salary_match DECIMAL(3,2),
  avg_colleagues DECIMAL(3,2),
  avg_pressure DECIMAL(3,2),
  review_count INT DEFAULT 0,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 公司名稱唯一索引 (不區分大小寫)
CREATE UNIQUE INDEX companies_name_lower_idx ON public.companies (LOWER(name));

-- ============================================
-- 公司評論資料表
-- ============================================
CREATE TABLE public.company_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('dcard', 'medium', 'qollie', 'manual')),
  source_url TEXT,
  title TEXT,
  content TEXT NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score DECIMAL(3,2),
  author TEXT,
  published_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX company_reviews_company_id_idx ON public.company_reviews(company_id);
CREATE INDEX company_reviews_source_idx ON public.company_reviews(source);

-- ============================================
-- 履歷資料表
-- ============================================
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',  -- TipTap JSON 格式
  plain_text TEXT,  -- 純文字版本，用於 ATS 分析
  ats_score INT CHECK (ats_score >= 0 AND ats_score <= 100),
  keywords TEXT[] DEFAULT '{}',
  target_position TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX resumes_user_id_idx ON public.resumes(user_id);

-- ============================================
-- 求職追蹤資料表
-- ============================================
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,  -- 冗餘欄位，確保公司刪除後仍有資料
  position TEXT NOT NULL,
  jd_url TEXT,
  jd_content JSONB,  -- 解析後的 JD 內容
  jd_keywords TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'wishlist' CHECK (status IN (
    'wishlist', 'editing', 'applied',
    'interview_1', 'interview_2', 'interview_3', 'interview_4',
    'interview_5', 'interview_6', 'interview_7', 'interview_8',
    'verbal_offer', 'written_offer', 'rejected', 'ghosted'
  )),
  -- 個人對這份工作的評分
  rating_happiness INT CHECK (rating_happiness >= 1 AND rating_happiness <= 5),
  rating_salary_match INT CHECK (rating_salary_match >= 1 AND rating_salary_match <= 5),
  rating_colleagues INT CHECK (rating_colleagues >= 1 AND rating_colleagues <= 5),
  rating_pressure INT CHECK (rating_pressure >= 1 AND rating_pressure <= 5),
  notes TEXT,
  display_order INT DEFAULT 0,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX job_applications_user_id_idx ON public.job_applications(user_id);
CREATE INDEX job_applications_status_idx ON public.job_applications(status);
CREATE INDEX job_applications_company_id_idx ON public.job_applications(company_id);

-- ============================================
-- 面試題目資料表
-- ============================================
CREATE TABLE public.interview_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,  -- NULL = 公開題庫
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  category TEXT CHECK (category IN (
    'behavioral', 'technical', 'situational', 'culture_fit',
    'leadership', 'problem_solving', 'self_introduction', 'other'
  )),
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_public BOOLEAN DEFAULT false,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX interview_questions_user_id_idx ON public.interview_questions(user_id);
CREATE INDEX interview_questions_company_id_idx ON public.interview_questions(company_id);
CREATE INDEX interview_questions_category_idx ON public.interview_questions(category);

-- ============================================
-- 面試回答資料表 (不儲存錄音)
-- ============================================
CREATE TABLE public.interview_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES public.interview_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,  -- Whisper 轉譯結果
  duration_seconds INT,
  word_count INT,
  ai_feedback JSONB,  -- { strengths: [], improvements: [], suggestions: [] }
  ai_score INT CHECK (ai_score >= 0 AND ai_score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX interview_answers_question_id_idx ON public.interview_answers(question_id);
CREATE INDEX interview_answers_user_id_idx ON public.interview_answers(user_id);

-- ============================================
-- 價值觀排序資料表
-- ============================================
CREATE TABLE public.value_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  top_values TEXT[] NOT NULL DEFAULT '{}',  -- 最重視的前 5-10 個價值
  full_ranking TEXT[] DEFAULT '{}',  -- 完整排序
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LinkedIn 生成記錄
-- ============================================
CREATE TABLE public.linkedin_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('headline', 'about', 'experience', 'summary')),
  input_data JSONB,  -- 用戶輸入的原始資料
  generated_content TEXT NOT NULL,
  keywords_used TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX linkedin_generations_user_id_idx ON public.linkedin_generations(user_id);

-- ============================================
-- AI 使用記錄 (用於費用追蹤)
-- ============================================
CREATE TABLE public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model TEXT NOT NULL,  -- gemini-flash, gemini-pro, gpt-4, whisper
  task_type TEXT NOT NULL,  -- keyword_extraction, resume_optimization, etc.
  input_tokens INT,
  output_tokens INT,
  cost_usd DECIMAL(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ai_usage_logs_user_id_idx ON public.ai_usage_logs(user_id);
CREATE INDEX ai_usage_logs_created_at_idx ON public.ai_usage_logs(created_at);

-- ============================================
-- Row Level Security (RLS) 政策
-- ============================================

-- 啟用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.value_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: 用戶只能看到和修改自己的資料
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Companies: 所有人都可以讀取公司資料
CREATE POLICY "Anyone can view companies" ON public.companies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert companies" ON public.companies
  FOR INSERT TO authenticated WITH CHECK (true);

-- Company Reviews: 所有人都可以讀取評論
CREATE POLICY "Anyone can view company reviews" ON public.company_reviews
  FOR SELECT TO authenticated USING (true);

-- Resumes: 用戶只能看到和修改自己的履歷
CREATE POLICY "Users can view own resumes" ON public.resumes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes" ON public.resumes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes" ON public.resumes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes" ON public.resumes
  FOR DELETE USING (auth.uid() = user_id);

-- Job Applications: 用戶只能看到和修改自己的求職追蹤
CREATE POLICY "Users can view own applications" ON public.job_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications" ON public.job_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications" ON public.job_applications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own applications" ON public.job_applications
  FOR DELETE USING (auth.uid() = user_id);

-- Interview Questions: 公開題目所有人可見，私人題目只有自己可見
CREATE POLICY "Users can view public or own questions" ON public.interview_questions
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own questions" ON public.interview_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own questions" ON public.interview_questions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own questions" ON public.interview_questions
  FOR DELETE USING (auth.uid() = user_id);

-- Interview Answers: 用戶只能看到和修改自己的回答
CREATE POLICY "Users can view own answers" ON public.interview_answers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answers" ON public.interview_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own answers" ON public.interview_answers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own answers" ON public.interview_answers
  FOR DELETE USING (auth.uid() = user_id);

-- Value Rankings: 用戶只能看到和修改自己的排序
CREATE POLICY "Users can view own value rankings" ON public.value_rankings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own value rankings" ON public.value_rankings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own value rankings" ON public.value_rankings
  FOR UPDATE USING (auth.uid() = user_id);

-- LinkedIn Generations: 用戶只能看到和修改自己的生成記錄
CREATE POLICY "Users can view own linkedin generations" ON public.linkedin_generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own linkedin generations" ON public.linkedin_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AI Usage Logs: 用戶只能看到自己的使用記錄
CREATE POLICY "Users can view own ai usage logs" ON public.ai_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai usage logs" ON public.ai_usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 輔助函數
-- ============================================

-- 更新 updated_at 的觸發器函數
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為需要的表添加 updated_at 觸發器
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resumes_updated_at
  BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_value_rankings_updated_at
  BEFORE UPDATE ON public.value_rankings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 初始資料：工作價值觀卡片
-- ============================================
CREATE TABLE public.value_cards (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT CHECK (category IN ('work_environment', 'personal_growth', 'relationships', 'rewards', 'lifestyle'))
);

INSERT INTO public.value_cards (name, description, category) VALUES
  ('成就感', '完成任務後的滿足感', 'personal_growth'),
  ('自主性', '能夠自己決定工作方式', 'work_environment'),
  ('工作生活平衡', '工作與私人生活的平衡', 'lifestyle'),
  ('薪資待遇', '合理的薪資報酬', 'rewards'),
  ('職涯發展', '有明確的晉升機會', 'personal_growth'),
  ('團隊合作', '與同事良好的協作關係', 'relationships'),
  ('創意發揮', '能夠展現創意的空間', 'personal_growth'),
  ('穩定性', '工作的穩定與安全感', 'lifestyle'),
  ('學習成長', '持續學習新技能的機會', 'personal_growth'),
  ('彈性工時', '靈活的工作時間安排', 'lifestyle'),
  ('遠端工作', '可以在家或遠端工作', 'lifestyle'),
  ('社會影響力', '工作對社會有正面影響', 'personal_growth'),
  ('專業認可', '專業能力受到肯定', 'rewards'),
  ('同事關係', '良好的同事情誼', 'relationships'),
  ('主管支持', '主管的信任與支持', 'relationships'),
  ('公司文化', '認同公司的價值觀', 'work_environment'),
  ('挑戰性', '工作具有適度挑戰', 'personal_growth'),
  ('獨立工作', '能夠獨立完成任務', 'work_environment'),
  ('福利制度', '完善的員工福利', 'rewards'),
  ('地理位置', '便利的工作地點', 'lifestyle');

-- Value cards 所有人可讀
ALTER TABLE public.value_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view value cards" ON public.value_cards
  FOR SELECT TO authenticated USING (true);
