# JobSmart 資料庫 Schema 文件

## 1. 資料表總覽

```
┌─────────────────────┐      ┌─────────────────────┐
│      profiles       │      │    job_applications │
│  (用戶資料)          │◄─────│   (職缺追蹤)         │
└─────────────────────┘      └─────────────────────┘
         │                            │
         │                            │
         ▼                            ▼
┌─────────────────────┐      ┌─────────────────────┐
│   resume_versions   │      │ version_job_resumes │
│  (履歷版本)          │◄─────│  (客製化履歷)        │
└─────────────────────┘      └─────────────────────┘
         │
         │
         ▼
┌─────────────────────┐      ┌─────────────────────┐
│     companies       │◄─────│  company_reviews    │
│  (公司資料)          │      │   (公司評價)         │
└─────────────────────┘      └─────────────────────┘
```

---

## 2. 詳細 Schema

### 2.1 profiles (用戶資料)
```sql
CREATE TABLE profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT UNIQUE NOT NULL,
  name            TEXT,
  avatar_url      TEXT,

  -- 訂閱相關
  subscription_tier   TEXT DEFAULT 'free'
                      CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  ai_credits_remaining INTEGER DEFAULT 100,
  monthly_jd_count    INTEGER DEFAULT 0,
  monthly_crawl_count INTEGER DEFAULT 0,

  -- 時間戳
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

---

### 2.2 job_applications (職缺追蹤)
```sql
CREATE TABLE job_applications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- 基本資訊
  company_name    TEXT NOT NULL,
  position        TEXT NOT NULL,
  jd_url          TEXT,
  jd_content      JSONB,          -- 原始 JD 內容
  jd_keywords     TEXT[],         -- AI 提取的關鍵字

  -- 狀態管理
  status          TEXT DEFAULT 'wishlist'
                  CHECK (status IN (
                    'wishlist', 'editing', 'applied',
                    'interview_1', 'interview_2', 'interview_3',
                    'interview_4', 'interview_5', 'interview_6',
                    'interview_7', 'interview_8',
                    'verbal_offer', 'written_offer',
                    'rejected', 'ghosted'
                  )),
  display_order   INTEGER DEFAULT 0,

  -- 個人評分 (1-5)
  rating_happiness    INTEGER CHECK (rating_happiness BETWEEN 1 AND 5),
  rating_salary_match INTEGER CHECK (rating_salary_match BETWEEN 1 AND 5),
  rating_colleagues   INTEGER CHECK (rating_colleagues BETWEEN 1 AND 5),
  rating_pressure     INTEGER CHECK (rating_pressure BETWEEN 1 AND 5),

  -- 薪資資訊
  salary_min      INTEGER,
  salary_max      INTEGER,
  salary_currency TEXT DEFAULT 'TWD',
  salary_period   TEXT DEFAULT 'monthly'
                  CHECK (salary_period IN ('hourly', 'monthly', 'yearly')),

  -- 福利與成本
  benefits        TEXT[],
  commute_cost    INTEGER DEFAULT 0,    -- 每月通勤成本
  rent_estimate   INTEGER DEFAULT 0,    -- 預估房租
  meal_allowance  INTEGER DEFAULT 0,    -- 餐費補助
  other_allowance INTEGER DEFAULT 0,    -- 其他補助

  -- 備註
  notes           TEXT,
  applied_at      TIMESTAMP WITH TIME ZONE,

  -- 時間戳
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX idx_job_applications_status ON job_applications(status);

-- RLS Policy
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own applications" ON job_applications
  FOR ALL USING (auth.uid() = user_id);
```

---

### 2.3 resume_versions (履歷版本)
```sql
CREATE TABLE resume_versions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- 版本資訊
  name            TEXT NOT NULL,          -- e.g., "前端工程師版本"
  description     TEXT,
  target_role     TEXT,                   -- 目標職位

  -- 履歷內容
  base_content    JSONB NOT NULL,         -- TipTap JSON 格式
  base_plain_text TEXT,                   -- 純文字版本
  base_ats_score  INTEGER DEFAULT 0,      -- ATS 分數 (0-100)
  base_keywords   TEXT[],                 -- 履歷關鍵字

  -- 管理
  is_active       BOOLEAN DEFAULT true,
  display_order   INTEGER DEFAULT 0,

  -- 時間戳
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE resume_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own resume versions" ON resume_versions
  FOR ALL USING (auth.uid() = user_id);
```

---

### 2.4 version_job_resumes (客製化履歷)
```sql
CREATE TABLE version_job_resumes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id          UUID REFERENCES resume_versions(id) ON DELETE CASCADE,
  job_application_id  UUID REFERENCES job_applications(id) ON DELETE CASCADE,

  -- 生成狀態
  generation_status   TEXT DEFAULT 'pending'
                      CHECK (generation_status IN (
                        'pending', 'generating', 'completed', 'failed'
                      )),

  -- 客製化結果
  customized_content  JSONB,              -- 客製化後的 TipTap JSON
  ats_score          INTEGER,             -- 針對該 JD 的 ATS 分數
  matched_keywords   TEXT[],              -- 匹配的關鍵字
  missing_keywords   TEXT[],              -- 缺少的關鍵字
  ai_suggestions     JSONB,               -- AI 建議

  -- 時間戳
  generated_at       TIMESTAMP WITH TIME ZONE,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 確保一個版本對一個職缺只有一份客製化履歷
  UNIQUE(version_id, job_application_id)
);

-- 索引
CREATE INDEX idx_version_job_resumes_version ON version_job_resumes(version_id);
CREATE INDEX idx_version_job_resumes_job ON version_job_resumes(job_application_id);
```

---

### 2.5 companies (公司資料)
```sql
CREATE TABLE companies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 基本資訊
  name            TEXT UNIQUE NOT NULL,   -- 公司名稱 (唯一)
  logo_url        TEXT,
  industry        TEXT,
  website         TEXT,

  -- 聚合評分 (0.00-5.00)
  avg_happiness    DECIMAL(3,2) DEFAULT 0,
  avg_salary_match DECIMAL(3,2) DEFAULT 0,
  avg_colleagues   DECIMAL(3,2) DEFAULT 0,
  avg_pressure     DECIMAL(3,2) DEFAULT 0,

  -- 統計
  review_count     INTEGER DEFAULT 0,
  last_scraped_at  TIMESTAMP WITH TIME ZONE,

  -- 時間戳
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引 (不分大小寫搜尋)
CREATE INDEX idx_companies_name ON companies(LOWER(name));
```

---

### 2.6 company_reviews (公司評價)
```sql
CREATE TABLE company_reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- 評價內容
  title           TEXT,
  content         TEXT NOT NULL,

  -- 來源
  source          TEXT NOT NULL
                  CHECK (source IN ('dcard', 'ptt', 'qollie', 'medium', 'manual')),
  source_url      TEXT,
  author          TEXT,
  published_at    TIMESTAMP WITH TIME ZONE,

  -- 情感分析
  sentiment       TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score DECIMAL(3,2),           -- -1.00 到 1.00

  -- 時間戳
  scraped_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_company_reviews_company ON company_reviews(company_id);
CREATE INDEX idx_company_reviews_source ON company_reviews(source);
CREATE INDEX idx_company_reviews_sentiment ON company_reviews(sentiment);
```

---

### 2.7 interview_questions (面試題庫)
```sql
CREATE TABLE interview_questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- 題目內容
  question        TEXT NOT NULL,

  -- 分類
  category        TEXT DEFAULT 'other'
                  CHECK (category IN (
                    'behavioral', 'technical', 'situational',
                    'culture_fit', 'leadership', 'problem_solving',
                    'self_introduction', 'other'
                  )),
  difficulty      TEXT DEFAULT 'medium'
                  CHECK (difficulty IN ('easy', 'medium', 'hard')),

  -- 公開性
  is_public       BOOLEAN DEFAULT false,  -- true = 公開題庫

  -- 時間戳
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy (可查看公開題目或自己的題目)
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view public or own questions" ON interview_questions
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can CRUD own questions" ON interview_questions
  FOR ALL USING (auth.uid() = user_id);
```

---

### 2.8 interview_answers (練習記錄)
```sql
CREATE TABLE interview_answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_id     UUID REFERENCES interview_questions(id) ON DELETE CASCADE,

  -- 回答內容
  transcript      TEXT NOT NULL,          -- 轉錄文字
  duration_seconds INTEGER,               -- 回答秒數
  word_count      INTEGER,

  -- AI 評估結果
  ai_score        INTEGER CHECK (ai_score BETWEEN 0 AND 100),
  ai_feedback     JSONB,                  -- { strengths, improvements, suggestions }

  -- 時間戳
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_interview_answers_user ON interview_answers(user_id);
CREATE INDEX idx_interview_answers_question ON interview_answers(question_id);
```

---

### 2.9 value_rankings (價值觀排序)
```sql
CREATE TABLE value_rankings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- 排序結果
  top_values      TEXT[],                 -- 前 5 名
  full_ranking    TEXT[],                 -- 完整排序 (20 項)

  -- 時間戳
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE value_rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own rankings" ON value_rankings
  FOR ALL USING (auth.uid() = user_id);
```

---

### 2.10 linkedin_generations (LinkedIn 生成記錄)
```sql
CREATE TABLE linkedin_generations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- 生成類型
  content_type    TEXT NOT NULL
                  CHECK (content_type IN ('headline', 'about', 'experience', 'summary')),

  -- 輸入輸出
  input_data      JSONB,                  -- 輸入資料
  generated_content TEXT NOT NULL,        -- 生成內容
  keywords_used   TEXT[],                 -- 使用的關鍵字

  -- 時間戳
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_linkedin_generations_user ON linkedin_generations(user_id);
```

---

### 2.11 ai_usage_logs (AI 用量記錄)
```sql
CREATE TABLE ai_usage_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- 使用資訊
  model           TEXT NOT NULL,          -- gemini-flash, gpt-4-turbo, whisper
  task_type       TEXT NOT NULL,          -- jd_analysis, resume_optimization, etc.

  -- Token 統計
  input_tokens    INTEGER DEFAULT 0,
  output_tokens   INTEGER DEFAULT 0,
  cost_usd        DECIMAL(10,6) DEFAULT 0,

  -- 時間戳
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_ai_usage_logs_user ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created ON ai_usage_logs(created_at);
```

---

## 3. Database Triggers

### 自動更新 updated_at
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 套用到所有需要的表格
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resume_versions_updated_at
  BEFORE UPDATE ON resume_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_version_job_resumes_updated_at
  BEFORE UPDATE ON version_job_resumes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_questions_updated_at
  BEFORE UPDATE ON interview_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_value_rankings_updated_at
  BEFORE UPDATE ON value_rankings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 自動建立 Profile
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 4. 值卡定義 (參考用)

```typescript
const VALUE_CARDS = [
  { id: 'salary', name: '薪資報酬', category: 'rewards' },
  { id: 'growth', name: '成長機會', category: 'personal_growth' },
  { id: 'balance', name: '工作生活平衡', category: 'lifestyle' },
  { id: 'impact', name: '社會影響力', category: 'personal_growth' },
  { id: 'team', name: '團隊氛圍', category: 'relationships' },
  { id: 'stability', name: '工作穩定性', category: 'work_environment' },
  { id: 'autonomy', name: '工作自主權', category: 'work_environment' },
  { id: 'recognition', name: '認可與讚賞', category: 'rewards' },
  { id: 'challenge', name: '挑戰性', category: 'personal_growth' },
  { id: 'remote', name: '遠端工作', category: 'lifestyle' },
  { id: 'mentorship', name: '導師指導', category: 'relationships' },
  { id: 'innovation', name: '創新環境', category: 'work_environment' },
  { id: 'mission', name: '公司使命', category: 'personal_growth' },
  { id: 'flexibility', name: '彈性時間', category: 'lifestyle' },
  { id: 'benefits', name: '福利待遇', category: 'rewards' },
  { id: 'diversity', name: '多元包容', category: 'relationships' },
  { id: 'learning', name: '持續學習', category: 'personal_growth' },
  { id: 'location', name: '地點便利', category: 'lifestyle' },
  { id: 'brand', name: '公司品牌', category: 'work_environment' },
  { id: 'ownership', name: '產品主導權', category: 'work_environment' }
];
```

---

## 5. 資料表關係圖

```
profiles (1) ─────────< (N) job_applications
    │                          │
    │                          │
    └───────< (N) resume_versions ───────< (N) version_job_resumes >─────┘
    │
    │
    └───────< (N) interview_questions ───────< (N) interview_answers
    │
    │
    └───────< (1) value_rankings
    │
    │
    └───────< (N) linkedin_generations
    │
    │
    └───────< (N) ai_usage_logs


companies (1) ───────< (N) company_reviews
```

---

## 6. 常用查詢範例

### 取得用戶所有職缺 (按狀態分組)
```sql
SELECT status, COUNT(*) as count
FROM job_applications
WHERE user_id = auth.uid()
GROUP BY status;
```

### 取得用戶最近活動
```sql
SELECT
  ja.company_name,
  ja.position,
  ja.status,
  ja.updated_at
FROM job_applications ja
WHERE ja.user_id = auth.uid()
ORDER BY ja.updated_at DESC
LIMIT 5;
```

### 搜尋公司評價
```sql
SELECT
  cr.*,
  c.name as company_name
FROM company_reviews cr
JOIN companies c ON c.id = cr.company_id
WHERE LOWER(c.name) LIKE LOWER('%台積%')
ORDER BY cr.scraped_at DESC;
```
