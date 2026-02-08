-- 面試經驗資料表
-- 儲存從各來源爬取的面試經驗分享

CREATE TABLE IF NOT EXISTS public.interview_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('dcard', 'ptt', 'medium', 'qollie')),
  source_url TEXT,
  title TEXT,
  content TEXT NOT NULL,
  position TEXT,

  -- AI 提取的結構化資料
  stages JSONB DEFAULT '[]',           -- 面試關卡 [{order, name, description}]
  questions TEXT[] DEFAULT '{}',        -- 面試題目
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  outcome TEXT CHECK (outcome IN ('offer', 'rejected', 'ghosted', 'unknown')),
  tips TEXT[] DEFAULT '{}',            -- 面試建議

  -- 情緒分析
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score DECIMAL(5,2),         -- 0-100

  -- 元資料
  author TEXT,
  published_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_interview_exp_company_name ON public.interview_experiences(company_name);
CREATE INDEX IF NOT EXISTS idx_interview_exp_source ON public.interview_experiences(source);
CREATE INDEX IF NOT EXISTS idx_interview_exp_company_id ON public.interview_experiences(company_id);
CREATE INDEX IF NOT EXISTS idx_interview_exp_scraped_at ON public.interview_experiences(scraped_at DESC);

-- RLS 政策
ALTER TABLE public.interview_experiences ENABLE ROW LEVEL SECURITY;

-- 允許所有已認證用戶讀取面試經驗
CREATE POLICY "Anyone can view interview experiences"
  ON public.interview_experiences
  FOR SELECT
  TO authenticated
  USING (true);

-- 允許 service role 寫入（用於爬蟲）
CREATE POLICY "Service role can insert interview experiences"
  ON public.interview_experiences
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update interview experiences"
  ON public.interview_experiences
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 註解
COMMENT ON TABLE public.interview_experiences IS '面試經驗資料表，儲存從 Dcard、PTT、Qollie、Medium 爬取的面試分享';
COMMENT ON COLUMN public.interview_experiences.stages IS '面試關卡 JSON 陣列，格式: [{order: number, name: string, description?: string}]';
COMMENT ON COLUMN public.interview_experiences.questions IS '面試題目陣列';
COMMENT ON COLUMN public.interview_experiences.outcome IS '面試結果: offer(錄取), rejected(被拒), ghosted(無聲卡), unknown(未知)';
