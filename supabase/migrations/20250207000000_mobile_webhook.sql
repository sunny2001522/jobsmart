-- ============================================
-- Mobile Webhook 功能所需的資料庫變更
-- ============================================

-- 1. 新增 gmail_oauth_tokens 表
CREATE TABLE IF NOT EXISTS public.gmail_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- OAuth tokens (加密儲存)
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Gmail 帳號資訊
  gmail_email TEXT NOT NULL,

  -- 狀態
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,

  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 每個用戶只能有一個 Gmail 連結
  UNIQUE(user_id)
);

-- RLS for gmail_oauth_tokens
ALTER TABLE public.gmail_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gmail tokens" ON public.gmail_oauth_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gmail tokens" ON public.gmail_oauth_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gmail tokens" ON public.gmail_oauth_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gmail tokens" ON public.gmail_oauth_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- 2. 擴展 job_applications 表：新增社群貼文來源欄位
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_content TEXT,
  ADD COLUMN IF NOT EXISTS source_post_url TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS application_instruction TEXT;

-- 新增 CHECK constraint for source_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_applications_source_type_check'
  ) THEN
    ALTER TABLE public.job_applications
      ADD CONSTRAINT job_applications_source_type_check
      CHECK (source_type IN ('manual', 'webhook', 'threads', 'facebook', 'linkedin', 'other_social'));
  END IF;
END $$;

-- 3. 擴展 profiles 表
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gmail_connected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gmail_email TEXT,
  ADD COLUMN IF NOT EXISTS webhook_settings JSONB DEFAULT '{
    "autoCustomize": true,
    "autoCompanyReview": true,
    "autoDraftEmail": true
  }';

-- 4. 建立更新 updated_at 的 trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 為 gmail_oauth_tokens 建立 trigger
DROP TRIGGER IF EXISTS update_gmail_oauth_tokens_updated_at ON public.gmail_oauth_tokens;
CREATE TRIGGER update_gmail_oauth_tokens_updated_at
  BEFORE UPDATE ON public.gmail_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. 索引
CREATE INDEX IF NOT EXISTS idx_job_applications_source_type ON public.job_applications(source_type);
CREATE INDEX IF NOT EXISTS idx_gmail_oauth_tokens_user_id ON public.gmail_oauth_tokens(user_id);
