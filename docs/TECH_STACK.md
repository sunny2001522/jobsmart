# JobSmart Tech Stack 文件

## 1. 系統架構概覽

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  Next.js 16 + React 19 + TypeScript + Tailwind CSS 4        │
├─────────────────────────────────────────────────────────────┤
│                        Backend                               │
│  Next.js API Routes + Turso (PostgreSQL + Auth)          │
├─────────────────────────────────────────────────────────────┤
│                      AI Services                             │
│  Google Gemini 2.0 Flash | OpenAI GPT-4 Turbo | Whisper     │
├─────────────────────────────────────────────────────────────┤
│                      Data Layer                              │
│  Turso (DB + RLS) | Upstash Redis (Cache)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 前端技術棧

### 2.1 核心框架
| 技術 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.1.1 | React 全端框架，App Router |
| React | 19.2.3 | UI 組件庫 |
| TypeScript | 5.x | 型別安全 |

### 2.2 樣式與 UI
| 技術 | 版本 | 用途 |
|------|------|------|
| Tailwind CSS | 4.x | 原子化 CSS |
| Radix UI | 最新 | 無障礙 Headless 組件 |
| Lucide React | 最新 | Icon 圖示庫 |
| next-themes | 最新 | 深色模式支援 |

### 2.3 狀態管理與資料獲取
| 技術 | 版本 | 用途 |
|------|------|------|
| Zustand | 5.0.9 | 輕量狀態管理 |
| React Query | 5.90.16 | 伺服器狀態管理、快取 |
| React Hook Form | 7.70.0 | 表單處理 |
| Zod | 最新 | Schema 驗證 |

### 2.4 互動功能
| 技術 | 版本 | 用途 |
|------|------|------|
| @dnd-kit | 最新 | 拖拉功能 (Kanban、價值卡) |
| TipTap | 3.15.1 | 富文本編輯器 (履歷) |
| Sonner | 最新 | Toast 通知 |

### 2.5 文件處理
| 技術 | 版本 | 用途 |
|------|------|------|
| @react-pdf/renderer | 最新 | PDF 生成匯出 |

---

## 3. 後端技術棧

### 3.1 API 層
| 技術 | 用途 |
|------|------|
| Next.js API Routes | RESTful API 端點 |
| Zod | 請求驗證 |

### 3.2 資料庫
| 技術 | 用途 |
|------|------|
| Turso (PostgreSQL) | 主資料庫 |
| Row-Level Security (RLS) | 多租戶資料隔離 |
| Database Triggers | 自動化 (建立 profile、更新時間戳) |

### 3.3 認證
| 技術 | 版本 | 用途 |
|------|------|------|
| NextAuth.js | 5.0.0-beta.30 | 身份驗證 |
| Turso Auth | 最新 | OAuth Provider |

### 3.4 快取
| 技術 | 用途 |
|------|------|
| Upstash Redis | 公司評價快取 |

---

## 4. AI 服務整合

### 4.1 模型路由策略
```typescript
// 快速任務 → Gemini 2.0 Flash (低成本)
- keyword_extraction
- sentiment_analysis
- text_summary
- jd_analysis

// 複雜任務 → GPT-4 Turbo (高品質)
- resume_optimization
- resume_customization
- interview_feedback
- linkedin_generate
```

### 4.2 API 整合
| 服務 | 模型 | 用途 |
|------|------|------|
| Google AI | Gemini 2.0 Flash | 關鍵字提取、情感分析、JD 分析 |
| OpenAI | GPT-4 Turbo | 履歷優化、面試評分、LinkedIn 生成 |
| OpenAI | Whisper | 語音轉文字 |

---

## 5. 資料模型

### 5.1 核心表格
```
profiles          → 用戶資料、訂閱方案
job_applications  → 職缺追蹤 (Kanban)
resumes           → 履歷內容
resume_versions   → 履歷版本
version_job_resumes → 客製化履歷 (版本 × 職缺)
companies         → 公司資料
company_reviews   → 公司評價
interview_questions → 面試題庫
interview_answers → 練習記錄
value_rankings    → 價值觀排序
linkedin_generations → LinkedIn 內容生成記錄
ai_usage_logs     → AI 用量追蹤
```

### 5.2 關鍵欄位類型
- `JSONB`: TipTap 內容、AI 回饋、JD 分析結果
- `TEXT[]`: 關鍵字陣列、匹配關鍵字
- `DECIMAL(3,2)`: 評分 (0.00-5.00)
- `ENUM`: 狀態欄位 (status, sentiment, difficulty)

---

## 6. 網頁爬蟲架構

### 6.1 爬蟲來源
| 來源 | 檔案 | 狀態 |
|------|------|------|
| Dcard | `/lib/crawler/dcard.ts` | ✅ 啟用 |
| PTT | `/lib/crawler/ptt.ts` | ✅ 啟用 |
| Qollie | `/lib/crawler/qollie.ts` | ✅ 啟用 |
| Medium | `/lib/crawler/google-search.ts` | 🚧 開發中 |

### 6.2 爬蟲流程
```
用戶搜尋公司 → 檢查 Redis 快取 →
若無快取 → 並行爬取多來源 →
AI 情感分析 → 儲存 Turso → 回傳結果
```

---

## 7. 專案結構

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # 登入/註冊頁面
│   ├── (main)/             # 主功能頁面 (需登入)
│   │   ├── dashboard/
│   │   ├── applications/
│   │   ├── resume/
│   │   ├── interview/
│   │   ├── companies/
│   │   ├── jd-analyzer/
│   │   ├── linkedin/
│   │   ├── values/
│   │   └── settings/
│   └── api/                # API 路由
│       ├── jd/
│       ├── resume/
│       ├── interview/
│       ├── linkedin/
│       └── companies/
│
├── components/
│   ├── ui/                 # shadcn/ui 組件
│   ├── kanban/             # Kanban 相關組件
│   ├── resume-editor/      # 履歷編輯器
│   └── resume-version/     # 版本管理
│
├── lib/
│   ├── ai/                 # AI Gateway
│   ├── crawler/            # 網頁爬蟲
│   ├── turso/           # 資料庫操作
│   ├── redis/              # 快取
│   └── utils.ts
│
├── hooks/                  # Custom React Hooks
│   ├── use-job-applications.ts
│   ├── use-resumes.ts
│   ├── use-dashboard.ts
│   └── use-audio-recorder.ts
│
└── types/                  # TypeScript 型別定義
    └── index.ts
```

---

## 8. 環境變數

```env
# Turso
 TURSO_DATABASE_URL=
 TURSO_AUTH_TOKEN=

# AI Services
GOOGLE_AI_API_KEY=
OPENAI_API_KEY=

# Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

---

## 9. 開發指令

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 建置
npm run build

# Lint 檢查
npm run lint

# 型別檢查
npx tsc --noEmit
```

---

## 10. 部署架構

| 服務 | 平台 | 備註 |
|------|------|------|
| Frontend | Vercel | Next.js 原生支援 |
| Database | Turso | PostgreSQL + Auth |
| Cache | Upstash Redis | Serverless Redis |
| AI | Google Cloud / OpenAI | API 呼叫 |
