# JobSmart API 文件

## 1. API 端點總覽

| 端點 | 方法 | 描述 | 認證 |
|------|------|------|------|
| `/api/jd/parse` | POST | 解析 JD 內容，提取關鍵字 | 需要 |
| `/api/jd/fetch` | POST | 從 URL 抓取 JD 內容 | 需要 |
| `/api/resume/optimize` | POST | AI 優化履歷，計算 ATS 分數 | 需要 |
| `/api/resume/customize` | POST | 針對特定 JD 客製化履歷 | 需要 |
| `/api/resume/export-pdf` | POST | 匯出履歷為 PDF | 需要 |
| `/api/interview/transcribe` | POST | 語音轉文字 (Whisper) | 需要 |
| `/api/interview/evaluate` | POST | AI 評估面試回答 | 需要 |
| `/api/linkedin/generate` | POST | 生成 LinkedIn 內容 | 需要 |
| `/api/linkedin/parse-experiences` | POST | 解析 LinkedIn 經歷 | 需要 |
| `/api/linkedin/optimize-experience` | POST | 優化經歷描述 | 需要 |
| `/api/companies/reviews` | POST | 爬取公司評價 | 需要 |

---

## 2. API 詳細規格

### 2.1 JD 解析 API

#### `POST /api/jd/parse`
解析 JD 內容，使用 Gemini AI 提取結構化資訊。

**Request Body:**
```json
{
  "content": "string (JD 原始文字內容)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "keywords": ["React", "TypeScript", "Node.js"],
    "requirements": ["3+ 年經驗", "熟悉 Git"],
    "responsibilities": ["開發前端功能", "維護程式碼品質"],
    "benefits": ["年終獎金", "彈性工時"]
  }
}
```

---

#### `POST /api/jd/fetch`
從 URL 抓取 JD 內容。

**Request Body:**
```json
{
  "url": "https://example.com/job/123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Frontend Engineer",
    "content": "...(JD 文字內容)",
    "company": "Example Corp"
  }
}
```

---

### 2.2 履歷 API

#### `POST /api/resume/optimize`
使用 GPT-4 分析並優化履歷。

**Request Body:**
```json
{
  "content": "string (履歷純文字)",
  "targetJD": "string (optional, 目標 JD 內容)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 75,
    "suggestions": [
      "建議加入量化成果",
      "可使用更強的動詞"
    ],
    "strongVerbs": ["領導", "優化", "推動"],
    "keywordMatches": {
      "matched": ["React", "TypeScript"],
      "missing": ["GraphQL", "AWS"]
    }
  }
}
```

---

#### `POST /api/resume/customize`
針對特定職缺客製化履歷。

**Request Body:**
```json
{
  "baseResume": "string (基礎履歷內容)",
  "jd": "string (JD 內容)",
  "company": "string (公司名稱)",
  "position": "string (職位名稱)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customizedContent": "...(客製化履歷)",
    "atsScore": 85,
    "matchedKeywords": ["React", "TypeScript"],
    "missingKeywords": ["AWS"],
    "suggestions": ["建議強調專案成果"]
  }
}
```

---

#### `POST /api/resume/export-pdf`
將履歷匯出為 PDF 檔案。

**Request Body:**
```json
{
  "content": "object (TipTap JSON 格式)",
  "metadata": {
    "name": "王小明",
    "email": "ming@example.com"
  }
}
```

**Response:**
- Content-Type: `application/pdf`
- Binary PDF 檔案

---

### 2.3 面試 API

#### `POST /api/interview/transcribe`
使用 Whisper 將語音轉為文字。

**Request Body:**
- Content-Type: `multipart/form-data`
- `audio`: 音訊檔案 (webm/wav/mp3)

**Response:**
```json
{
  "success": true,
  "data": {
    "transcript": "我認為團隊合作很重要..."
  }
}
```

---

#### `POST /api/interview/evaluate`
AI 評估面試回答。

**Request Body:**
```json
{
  "question": "請描述一個你克服困難的經歷",
  "answer": "在上一份工作中..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 78,
    "strengths": [
      "清楚描述情境",
      "結果有具體數據"
    ],
    "improvements": [
      "可以更詳細說明採取的行動"
    ],
    "suggestions": [
      "使用 STAR 方法結構回答"
    ]
  }
}
```

---

### 2.4 LinkedIn API

#### `POST /api/linkedin/generate`
生成 LinkedIn 內容。

**Request Body:**
```json
{
  "type": "headline | about | experience | summary",
  "resumeContent": "string (履歷內容)",
  "targetRole": "string (optional, 目標職位)",
  "keywords": ["string"] // optional, 關鍵字
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "content": "資深前端工程師 | React & TypeScript 專家 | 5年電商經驗",
    "keywordsUsed": ["React", "TypeScript", "前端"]
  }
}
```

---

### 2.5 公司評價 API

#### `POST /api/companies/reviews`
爬取並分析公司評價。

**Request Body:**
```json
{
  "companyName": "台積電",
  "sources": ["dcard", "ptt", "qollie"]
}
```

**Response:**
```json
{
  "success": true,
  "cached": false,
  "data": {
    "company": "台積電",
    "reviews": [
      {
        "source": "dcard",
        "title": "台積電工作經驗分享",
        "content": "...",
        "sentiment": "positive",
        "sentimentScore": 0.85,
        "publishedAt": "2024-01-15"
      }
    ],
    "summary": {
      "totalReviews": 15,
      "positiveCount": 10,
      "neutralCount": 3,
      "negativeCount": 2,
      "avgSentiment": 0.72
    }
  }
}
```

---

## 3. 錯誤處理

所有 API 錯誤回傳統一格式：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body"
  }
}
```

**錯誤代碼:**
| Code | HTTP Status | 描述 |
|------|-------------|------|
| VALIDATION_ERROR | 400 | 請求參數驗證失敗 |
| UNAUTHORIZED | 401 | 未認證或 Token 無效 |
| FORBIDDEN | 403 | 無權限存取資源 |
| NOT_FOUND | 404 | 資源不存在 |
| RATE_LIMITED | 429 | 超過請求限制 |
| AI_ERROR | 500 | AI 服務錯誤 |
| INTERNAL_ERROR | 500 | 伺服器內部錯誤 |

---

## 4. 認證

所有 API 端點都需要認證。請在 Request Header 中加入：

```
Authorization: Bearer <session_token>
```

Token 透過 NextAuth.js 登入後取得。

---

## 5. 速率限制

| 端點類型 | 限制 |
|---------|------|
| AI 相關 API | 10 次/分鐘 |
| 爬蟲 API | 5 次/分鐘 |
| 一般 API | 60 次/分鐘 |

超過限制將回傳 `429 RATE_LIMITED` 錯誤。
