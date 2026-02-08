-- ============================================
-- 職位類別功能數據庫遷移
-- 用戶可自定義職位類別，在求職追蹤和履歷管理頁面共享
-- ============================================

-- 1. 職位類別表 (job_categories)
CREATE TABLE public.job_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 類別資訊
  name TEXT NOT NULL,                          -- 類別名稱，如「前端工程師」
  color TEXT DEFAULT '#6366f1',                -- Tab 顏色（hex）

  -- 狀態
  is_active BOOLEAN DEFAULT true,              -- 是否啟用（軟刪除）
  display_order INT DEFAULT 0,                 -- 顯示順序

  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 確保同一用戶下名稱唯一（不區分大小寫）
  UNIQUE (user_id, name)
);

-- 索引
CREATE INDEX job_categories_user_id_idx ON public.job_categories(user_id);
CREATE INDEX job_categories_display_order_idx ON public.job_categories(user_id, display_order);
CREATE INDEX job_categories_is_active_idx ON public.job_categories(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.job_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own job categories" ON public.job_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own job categories" ON public.job_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own job categories" ON public.job_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own job categories" ON public.job_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at 觸發器
CREATE TRIGGER update_job_categories_updated_at
  BEFORE UPDATE ON public.job_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================
-- 2. 擴展 job_applications 表：新增類別關聯
-- ============================================
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.job_categories(id) ON DELETE SET NULL;

-- 索引：加速按類別查詢
CREATE INDEX IF NOT EXISTS job_applications_category_id_idx ON public.job_applications(category_id);


-- ============================================
-- 3. 擴展 resume_versions 表：新增類別關聯
-- ============================================
ALTER TABLE public.resume_versions
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.job_categories(id) ON DELETE SET NULL;

-- 索引
CREATE INDEX IF NOT EXISTS resume_versions_category_id_idx ON public.resume_versions(category_id);
