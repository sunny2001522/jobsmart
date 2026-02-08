-- ============================================
-- 履歷版本管理功能數據庫遷移
-- ============================================

-- 1. 履歷版本表 (resume_versions)
-- 每個版本代表一個目標職位方向的基礎履歷
CREATE TABLE public.resume_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 版本資訊
  name TEXT NOT NULL,                        -- 版本名稱，如「前端工程師版」
  description TEXT,                          -- 版本描述
  target_role TEXT,                          -- 目標職位類型

  -- 基礎履歷內容
  base_content JSONB NOT NULL DEFAULT '{}',  -- TipTap JSON 格式的基礎履歷
  base_plain_text TEXT,                      -- 純文字版本，用於 AI 處理

  -- 版本統計
  base_ats_score INT CHECK (base_ats_score >= 0 AND base_ats_score <= 100),
  base_keywords TEXT[] DEFAULT '{}',         -- 此版本的核心關鍵字

  -- 狀態
  is_active BOOLEAN DEFAULT true,            -- 是否啟用（軟刪除）
  display_order INT DEFAULT 0,               -- 顯示順序

  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX resume_versions_user_id_idx ON public.resume_versions(user_id);
CREATE INDEX resume_versions_is_active_idx ON public.resume_versions(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resume versions" ON public.resume_versions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resume versions" ON public.resume_versions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resume versions" ON public.resume_versions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resume versions" ON public.resume_versions
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at 觸發器
CREATE TRIGGER update_resume_versions_updated_at
  BEFORE UPDATE ON public.resume_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================
-- 2. 版本-工作-客製化履歷關聯表 (version_job_resumes)
-- 用戶將工作拖入版本後，可以生成客製化履歷
-- ============================================
CREATE TABLE public.version_job_resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 關聯
  version_id UUID NOT NULL REFERENCES public.resume_versions(id) ON DELETE CASCADE,
  job_application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,

  -- 客製化履歷內容
  customized_content JSONB,                    -- 生成後的客製化履歷 (TipTap JSON)
  customized_plain_text TEXT,                  -- 純文字版本

  -- AI 生成資訊
  generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN (
    'pending',      -- 尚未生成
    'generating',   -- 生成中
    'completed',    -- 已完成
    'failed'        -- 生成失敗
  )),
  generated_at TIMESTAMPTZ,                    -- 生成時間

  -- ATS 分析結果
  ats_score INT CHECK (ats_score >= 0 AND ats_score <= 100),
  matched_keywords TEXT[] DEFAULT '{}',        -- 匹配到的關鍵字
  missing_keywords TEXT[] DEFAULT '{}',        -- 缺少的關鍵字

  -- AI 優化建議
  ai_suggestions JSONB,                        -- { suggestions: [], strongVerbs: [], ... }

  -- 元數據
  display_order INT DEFAULT 0,                 -- 在版本內的顯示順序
  notes TEXT,                                  -- 用戶筆記

  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 確保同一版本下工作不重複
  UNIQUE (version_id, job_application_id)
);

-- 索引
CREATE INDEX vjr_version_id_idx ON public.version_job_resumes(version_id);
CREATE INDEX vjr_job_application_id_idx ON public.version_job_resumes(job_application_id);
CREATE INDEX vjr_generation_status_idx ON public.version_job_resumes(generation_status);

-- RLS（通過版本表的 user_id 驗證）
ALTER TABLE public.version_job_resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own version job resumes" ON public.version_job_resumes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.resume_versions rv
      WHERE rv.id = version_id AND rv.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own version job resumes" ON public.version_job_resumes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resume_versions rv
      WHERE rv.id = version_id AND rv.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own version job resumes" ON public.version_job_resumes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.resume_versions rv
      WHERE rv.id = version_id AND rv.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own version job resumes" ON public.version_job_resumes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.resume_versions rv
      WHERE rv.id = version_id AND rv.user_id = auth.uid()
    )
  );

-- Updated_at 觸發器
CREATE TRIGGER update_version_job_resumes_updated_at
  BEFORE UPDATE ON public.version_job_resumes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================
-- 3. 擴展 job_applications 表：新增薪資和福利欄位
-- ============================================
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS salary_min INT,              -- 最低薪資
  ADD COLUMN IF NOT EXISTS salary_max INT,              -- 最高薪資
  ADD COLUMN IF NOT EXISTS salary_currency TEXT DEFAULT 'TWD',  -- 貨幣
  ADD COLUMN IF NOT EXISTS salary_period TEXT DEFAULT 'monthly' CHECK (salary_period IN ('hourly', 'monthly', 'yearly')),
  ADD COLUMN IF NOT EXISTS benefits TEXT[] DEFAULT '{}', -- 福利列表
  -- 實領薪水計算相關欄位
  ADD COLUMN IF NOT EXISTS work_location TEXT,          -- 工作地點（城市）
  ADD COLUMN IF NOT EXISTS commute_cost INT DEFAULT 0,  -- 月通勤費用
  ADD COLUMN IF NOT EXISTS rent_estimate INT,           -- 預估租金（可自訂或自動帶入）
  ADD COLUMN IF NOT EXISTS meal_allowance INT DEFAULT 0, -- 餐費補助（每月）
  ADD COLUMN IF NOT EXISTS other_allowance INT DEFAULT 0; -- 其他補助（每月）
