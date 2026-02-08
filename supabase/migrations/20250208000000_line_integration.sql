-- LINE Integration Migration
-- 為 LINE Bot 整合新增必要的資料庫表和欄位

-- ============================================
-- 1. 建立 line_user_bindings 表
-- ============================================

CREATE TABLE IF NOT EXISTS public.line_user_bindings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- LINE 用戶資訊
  line_user_id TEXT NOT NULL,
  display_name TEXT,
  picture_url TEXT,

  -- 狀態
  is_active BOOLEAN DEFAULT true,
  notification_enabled BOOLEAN DEFAULT true,

  -- 時間戳
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 約束
  CONSTRAINT line_user_bindings_line_user_id_unique UNIQUE (line_user_id),
  CONSTRAINT line_user_bindings_user_id_unique UNIQUE (user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_line_user_bindings_line_user_id
  ON public.line_user_bindings(line_user_id);

CREATE INDEX IF NOT EXISTS idx_line_user_bindings_user_id
  ON public.line_user_bindings(user_id);

-- ============================================
-- 2. RLS 政策
-- ============================================

ALTER TABLE public.line_user_bindings ENABLE ROW LEVEL SECURITY;

-- 用戶可以查看自己的綁定
CREATE POLICY "Users can view own line binding"
  ON public.line_user_bindings
  FOR SELECT
  USING (auth.uid() = user_id);

-- 用戶可以插入自己的綁定
CREATE POLICY "Users can insert own line binding"
  ON public.line_user_bindings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用戶可以更新自己的綁定
CREATE POLICY "Users can update own line binding"
  ON public.line_user_bindings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 用戶可以刪除自己的綁定
CREATE POLICY "Users can delete own line binding"
  ON public.line_user_bindings
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. 擴展 job_applications source_type
-- ============================================

-- 刪除舊的約束（如果存在）
ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_source_type_check;

-- 新增包含 'line' 的約束
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_source_type_check
  CHECK (source_type IS NULL OR source_type IN (
    'manual',
    'webhook',
    'threads',
    'facebook',
    'linkedin',
    'line',
    'other_social'
  ));

-- ============================================
-- 4. 更新時間觸發器
-- ============================================

-- 建立通用的更新時間函數（如果不存在）
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為 line_user_bindings 建立觸發器
DROP TRIGGER IF EXISTS update_line_user_bindings_updated_at ON public.line_user_bindings;

CREATE TRIGGER update_line_user_bindings_updated_at
  BEFORE UPDATE ON public.line_user_bindings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 5. 註解
-- ============================================

COMMENT ON TABLE public.line_user_bindings IS 'LINE 用戶綁定表，儲存 JobSmart 用戶與 LINE 帳號的對應關係';
COMMENT ON COLUMN public.line_user_bindings.line_user_id IS 'LINE 平台的用戶 ID';
COMMENT ON COLUMN public.line_user_bindings.display_name IS 'LINE 用戶的顯示名稱';
COMMENT ON COLUMN public.line_user_bindings.picture_url IS 'LINE 用戶的頭像 URL';
COMMENT ON COLUMN public.line_user_bindings.is_active IS '綁定是否有效';
COMMENT ON COLUMN public.line_user_bindings.notification_enabled IS '是否啟用 LINE 通知';
COMMENT ON COLUMN public.line_user_bindings.linked_at IS '綁定時間';
COMMENT ON COLUMN public.line_user_bindings.last_interaction_at IS '最後互動時間';
