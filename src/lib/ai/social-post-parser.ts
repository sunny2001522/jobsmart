/**
 * 社群貼文職缺解析模組
 * 從 Threads、Facebook、LinkedIn 等社群平台的非結構化貼文中提取職缺資訊
 */

import { aiGateway } from "./gateway";

// 社群貼文解析結果
export interface SocialPostJobInfo {
  companyName: string;
  position: string;
  jobType: "full_time" | "part_time" | "internship" | "contract" | null;
  contacts: {
    emails: string[];
    phones: string[];
    contactPerson: string | null;
  };
  jobUrls: string[];
  skills: string[];
  salary: {
    min: number | null;
    max: number | null;
    currency: string;
    period: "hourly" | "monthly" | "yearly";
  } | null;
  location: string | null;
  remotePolicy: "onsite" | "remote" | "hybrid" | null;
  applicationMethod: {
    type: "email" | "dm" | "form" | "apply_url" | "other";
    instruction: string | null;
  } | null;
  confidence: number;
  sourceType: "hr_post" | "headhunter" | "referral" | "company_official" | "unknown";
  rawKeywords: string[];
}

const SOCIAL_POST_SYSTEM_PROMPT = `你是一個專業的求職資訊提取專家，專精於從社群媒體貼文中提取職缺資訊。

請從以下貼文內容中提取結構化資訊。這可能是來自 Threads、Facebook、LinkedIn 或其他社群平台的職缺分享貼文。

## 提取規則
1. 公司名稱：尋找明確的公司名稱或品牌名
2. 職位名稱：識別工作職稱（如「前端工程師」「Product Manager」等）
3. 工作類型：判斷是全職/兼職/實習/約聘
4. 聯絡方式：
   - Email：提取所有郵箱地址，優先辨識 HR/招聘相關郵箱
   - 電話：提取電話號碼（如有）
   - 聯絡人：提取人名（如「找 XXX」「聯繫 XXX」）
5. 職缺連結：識別 104、CakeResume、Yourator、LinkedIn 等求職網站連結
6. 技能關鍵字：提取技術棧、工具、技能要求
7. 薪資資訊：提取薪資範圍（如有提及）
8. 工作地點：提取城市、區域或遠端工作資訊
9. 應徵方式：識別「請寄履歷到」「私訊」「填表單」等指示

## 特別注意
- Threads 貼文可能有 @ 標記、# 標籤，請正確解析
- 有些貼文會使用「徵」「找」「缺」等開頭
- 注意區分貼文發布者是 HR、獵頭還是內推員工
- 如果是轉發/分享，需要識別原始來源

請返回 JSON 格式：
{
  "companyName": "公司名稱（必填，如無法確定請填 '未知公司'）",
  "position": "職位名稱（必填，如無法確定請填 '未知職位'）",
  "jobType": "full_time" | "part_time" | "internship" | "contract" | null,
  "contacts": {
    "emails": ["email1@company.com"],
    "phones": ["0912-345-678"],
    "contactPerson": "聯絡人姓名或 null"
  },
  "jobUrls": ["https://104.com.tw/job/xxx"],
  "skills": ["React", "TypeScript"],
  "salary": {
    "min": 50000,
    "max": 80000,
    "currency": "TWD",
    "period": "monthly"
  } | null,
  "location": "台北市信義區" | null,
  "remotePolicy": "onsite" | "remote" | "hybrid" | null,
  "applicationMethod": {
    "type": "email" | "dm" | "form" | "apply_url" | "other",
    "instruction": "請將履歷寄至 hr@company.com，主旨標明應徵職位"
  } | null,
  "confidence": 0.0-1.0,
  "sourceType": "hr_post" | "headhunter" | "referral" | "company_official" | "unknown",
  "rawKeywords": ["#徵才", "#前端工程師"]
}

只返回 JSON，不要包含任何其他文字或 markdown 代碼塊。`;

/**
 * 從社群貼文中提取職缺資訊
 */
export async function parseSocialPost(
  content: string,
  sourceUrl?: string
): Promise<SocialPostJobInfo> {
  const prompt = sourceUrl
    ? `來源網址：${sourceUrl}\n\n貼文內容：\n${content}`
    : `貼文內容：\n${content}`;

  const result = await aiGateway("social_post_extraction", prompt, {
    systemPrompt: SOCIAL_POST_SYSTEM_PROMPT,
    temperature: 0.3,
    maxTokens: 2048,
  });

  try {
    let jsonStr = result.text.trim();
    // 處理可能的 markdown 代碼塊
    if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    return {
      companyName: parsed.companyName || "未知公司",
      position: parsed.position || "未知職位",
      jobType: parsed.jobType || null,
      contacts: {
        emails: parsed.contacts?.emails || [],
        phones: parsed.contacts?.phones || [],
        contactPerson: parsed.contacts?.contactPerson || null,
      },
      jobUrls: parsed.jobUrls || [],
      skills: parsed.skills || [],
      salary: parsed.salary || null,
      location: parsed.location || null,
      remotePolicy: parsed.remotePolicy || null,
      applicationMethod: parsed.applicationMethod || null,
      confidence: parsed.confidence ?? 0.5,
      sourceType: parsed.sourceType || "unknown",
      rawKeywords: parsed.rawKeywords || [],
    };
  } catch {
    // 解析失敗時返回預設值
    return {
      companyName: "未知公司",
      position: "未知職位",
      jobType: null,
      contacts: { emails: [], phones: [], contactPerson: null },
      jobUrls: [],
      skills: [],
      salary: null,
      location: null,
      remotePolicy: null,
      applicationMethod: null,
      confidence: 0,
      sourceType: "unknown",
      rawKeywords: [],
    };
  }
}

/**
 * 從貼文中直接提取 Email 地址（正則表達式方式）
 * 用於快速提取，不需要 AI
 */
export function extractEmailsFromText(text: string): string[] {
  const patterns = [
    // 標準 email
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    // 中文格式 (xxx 小老鼠 company.com)
    /([A-Za-z0-9._%+-]+)\s*[小@]老鼠\s*([A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi,
    // 反爬蟲格式 (hr [at] company [dot] com)
    /([A-Za-z0-9._%+-]+)\s*\[at\]\s*([A-Za-z0-9.-]+)\s*\[dot\]\s*([A-Z|a-z]{2,})/gi,
  ];

  const emails: string[] = [];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[0].includes("@")) {
        emails.push(match[0].toLowerCase());
      } else if (match[1] && match[2]) {
        // 處理特殊格式
        const email = match[3]
          ? `${match[1]}@${match[2]}.${match[3]}`
          : `${match[1]}@${match[2]}`;
        emails.push(email.toLowerCase());
      }
    }
  }

  // 去重
  return [...new Set(emails)];
}

/**
 * 從貼文中提取職缺網站連結
 */
export function extractJobUrls(text: string): string[] {
  const jobSites = [
    "104.com.tw",
    "1111.com.tw",
    "cakeresume.com",
    "yourator.co",
    "linkedin.com/jobs",
    "meet.jobs",
    "cake.me",
    "www.104.com.tw",
  ];

  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const matches = text.matchAll(urlPattern);
  const urls: string[] = [];

  for (const match of matches) {
    const url = match[0].replace(/[.,;:!?]+$/, ""); // 移除尾部標點
    if (jobSites.some((site) => url.includes(site))) {
      urls.push(url);
    }
  }

  return [...new Set(urls)];
}

/**
 * 判斷 URL 是否為社群平台
 */
export function isSocialPlatformUrl(url: string): boolean {
  const socialPlatforms = [
    "threads.net",
    "facebook.com",
    "fb.com",
    "linkedin.com/posts",
    "linkedin.com/feed",
    "twitter.com",
    "x.com",
    "instagram.com",
  ];

  return socialPlatforms.some((platform) => url.includes(platform));
}

/**
 * 判斷 URL 是否為求職網站
 */
export function isJobSiteUrl(url: string): boolean {
  const jobSites = [
    "104.com.tw",
    "1111.com.tw",
    "cakeresume.com",
    "yourator.co",
    "linkedin.com/jobs",
    "meet.jobs",
    "cake.me",
  ];

  return jobSites.some((site) => url.includes(site));
}
