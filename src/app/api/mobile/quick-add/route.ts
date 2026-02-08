/**
 * Mobile Webhook API - Quick Add
 * 從 Apple 捷徑接收職缺 URL，自動完成：
 * 1. 解析職缺內容
 * 2. 查詢公司評價
 * 3. AI 判斷類別
 * 4. 客製化履歷
 * 5. 建立 Gmail 草稿
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { aiGateway } from "@/lib/ai/gateway";
import { crawlCompanyReviews, calculateCompanyRatings } from "@/lib/crawler";
import {
  parseSocialPost,
  isSocialPlatformUrl,
  isJobSiteUrl,
  extractEmailsFromText,
  extractJobUrls,
} from "@/lib/ai/social-post-parser";
import { classifyAndMatch } from "@/lib/ai/category-classifier";
import { customizeResume } from "@/lib/ai/gateway";
import { createJobApplicationDraft } from "@/lib/gmail/draft";
import { isGmailConnected } from "@/lib/gmail/oauth";
import {
  createJobApplication,
  getJobCategories,
  getResumeVersions,
  addJobToVersion,
  updateVersionJobResume,
  getVersionJobResume,
  getProfile,
} from "@/lib/supabase/db";

// 請求 schema
const quickAddSchema = z.object({
  url: z.string().min(1, "URL is required"),
  content: z.string().optional(), // 社群貼文內容（選填）
  autoCustomize: z.boolean().default(true),
  autoCompanyReview: z.boolean().default(true),
  autoDraftEmail: z.boolean().default(true),
});

// 支援的求職網站
const SUPPORTED_JOB_SITES = [
  { domain: "cakeresume.com", name: "CakeResume" },
  { domain: "cake.me", name: "CakeResume" },
  { domain: "104.com.tw", name: "104人力銀行" },
  { domain: "yourator.co", name: "Yourator" },
  { domain: "meet.jobs", name: "Meet.jobs" },
  { domain: "linkedin.com/jobs", name: "LinkedIn" },
];

function getSiteName(url: string): string | null {
  for (const site of SUPPORTED_JOB_SITES) {
    if (url.includes(site.domain)) {
      return site.name;
    }
  }
  return null;
}

// 清理 HTML
function extractTextFromHTML(html: string): string {
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  text = text.replace(/<!--[\s\S]*?-->/g, "");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/\s+/g, " ");
  text = text.replace(/\n\s*\n/g, "\n\n");
  return text.trim();
}

// 從求職網站抓取 JD
async function fetchJobFromUrl(url: string) {
  const siteName = getSiteName(url);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!response.ok) {
    throw new Error(`無法存取網頁 (${response.status})`);
  }

  const html = await response.text();
  const textContent = extractTextFromHTML(html);

  if (textContent.length < 100) {
    throw new Error("網頁內容太少，可能需要登入");
  }

  // AI 提取 JD
  const result = await aiGateway("jd_analysis", textContent.slice(0, 15000), {
    systemPrompt: `你是一個專業的職缺資訊提取專家。請從以下網頁內容中提取職缺資訊。
這是來自 ${siteName || "求職網站"} 的職缺頁面。

請返回 JSON 格式：
{
  "companyName": "公司名稱",
  "position": "職位名稱",
  "description": "完整的職缺描述",
  "requirements": ["要求1", "要求2"],
  "responsibilities": ["職責1", "職責2"],
  "benefits": ["福利1", "福利2"],
  "keywords": ["關鍵字1", "關鍵字2"],
  "salary": "薪資範圍",
  "location": "工作地點",
  "contactEmail": "聯絡 Email（如有）",
  "applicationInstruction": "應徵方式說明（如有）"
}

只返回 JSON，不要包含其他文字。`,
    temperature: 0.3,
    maxTokens: 4096,
  });

  let jsonStr = result.text.trim();
  if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
  if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);

  const parsed = JSON.parse(jsonStr.trim());

  return {
    companyName: parsed.companyName || "未知公司",
    position: parsed.position || "未知職位",
    description: parsed.description || "",
    requirements: parsed.requirements || [],
    responsibilities: parsed.responsibilities || [],
    benefits: parsed.benefits || [],
    keywords: parsed.keywords || [],
    salary: parsed.salary,
    location: parsed.location,
    contactEmail: parsed.contactEmail,
    applicationInstruction: parsed.applicationInstruction,
    sourceUrl: url,
    sourceSite: siteName,
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. 驗證用戶
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "AUTH_REQUIRED", message: "請先登入 JobSmart" },
        { status: 401 }
      );
    }

    // 2. 解析請求
    const body = await request.json();
    const { url, content, autoCustomize, autoCompanyReview, autoDraftEmail } =
      quickAddSchema.parse(body);

    // 3. 判斷 URL 類型並解析職缺
    let jobData: {
      companyName: string;
      position: string;
      description: string;
      requirements: string[];
      responsibilities: string[];
      benefits: string[];
      keywords: string[];
      salary?: string;
      location?: string;
      contactEmail?: string;
      applicationInstruction?: string;
      sourceUrl: string;
      sourceSite?: string | null;
      sourceType: string;
      sourceContent?: string;
    };

    if (isSocialPlatformUrl(url) || content) {
      // 社群貼文解析
      const postContent = content || url;
      const socialData = await parseSocialPost(postContent, url);

      // 檢查是否有職缺連結
      const jobUrls = socialData.jobUrls.length > 0 ? socialData.jobUrls : extractJobUrls(postContent);

      if (jobUrls.length > 0 && isJobSiteUrl(jobUrls[0])) {
        // 有職缺連結，抓取詳細 JD
        const detailedJD = await fetchJobFromUrl(jobUrls[0]);
        jobData = {
          ...detailedJD,
          contactEmail: socialData.contacts.emails[0] || detailedJD.contactEmail,
          applicationInstruction:
            socialData.applicationMethod?.instruction || detailedJD.applicationInstruction,
          sourceType: "threads",
          sourceContent: content,
        };
      } else {
        // 純社群貼文
        jobData = {
          companyName: socialData.companyName,
          position: socialData.position,
          description: content || "",
          requirements: [],
          responsibilities: [],
          benefits: [],
          keywords: socialData.skills,
          salary: socialData.salary
            ? `${socialData.salary.min}-${socialData.salary.max} ${socialData.salary.currency}`
            : undefined,
          location: socialData.location ?? undefined,
          contactEmail: socialData.contacts.emails[0] ?? undefined,
          applicationInstruction: socialData.applicationMethod?.instruction ?? undefined,
          sourceUrl: url,
          sourceType: socialData.sourceType === "unknown" ? "other_social" : "threads",
          sourceContent: content,
        };
      }
    } else if (isJobSiteUrl(url)) {
      // 求職網站直接抓取
      const jd = await fetchJobFromUrl(url);
      jobData = {
        ...jd,
        sourceType: "webhook",
      };
    } else {
      // 嘗試抓取任意 URL
      try {
        const jd = await fetchJobFromUrl(url);
        jobData = {
          ...jd,
          sourceType: "webhook",
        };
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: "UNSUPPORTED_URL",
            message: "無法解析此網址，請確認是求職網站或社群貼文",
          },
          { status: 400 }
        );
      }
    }

    // 4. 取得用戶的類別和履歷版本
    const [categories, versions, profile] = await Promise.all([
      getJobCategories(),
      getResumeVersions(),
      getProfile(),
    ]);

    // 5. AI 判斷類別並匹配履歷版本
    const classification = await classifyAndMatch(
      {
        companyName: jobData.companyName,
        position: jobData.position,
        skills: jobData.keywords,
        description: jobData.description,
      },
      categories,
      versions
    );

    // 6. 建立 job_application
    // 注意: source_type 等欄位需要透過 Supabase client 直接插入
    // 因為 JobApplicationInsert 類型尚未包含這些欄位
    const jobApp = await createJobApplication({
      company_name: jobData.companyName,
      position: jobData.position,
      jd_url: jobData.sourceUrl,
      jd_content: {
        description: jobData.description,
        requirements: jobData.requirements,
        responsibilities: jobData.responsibilities,
        benefits: jobData.benefits,
      },
      jd_keywords: jobData.keywords,
      status: "wishlist",
      benefits: jobData.benefits,
      salary_min: null,
      salary_max: null,
      salary_currency: "TWD",
      salary_period: "monthly",
      work_location: jobData.location || null,
      category_id: classification.category.categoryId,
      // 必填欄位
      company_id: null,
      jd_content_zh: null,
      rating_happiness: null,
      rating_salary_match: null,
      rating_colleagues: null,
      rating_pressure: null,
      notes: null,
      display_order: 0,
      applied_at: null,
      commute_cost: 0,
      rent_estimate: null,
      meal_allowance: 0,
      other_allowance: 0,
      value_scores: null,
    } as Parameters<typeof createJobApplication>[0]);

    // 更新擴展欄位（透過 Supabase 直接更新）
    if (jobApp) {
      const supabaseForUpdate = await createClient();
      await supabaseForUpdate.from("job_applications").update({
        source_type: jobData.sourceType,
        source_content: jobData.sourceContent || null,
        source_post_url: jobData.sourceUrl,
        contact_email: jobData.contactEmail || null,
        application_instruction: jobData.applicationInstruction || null,
      }).eq("id", jobApp.id);
    }

    if (!jobApp) {
      return NextResponse.json(
        { success: false, error: "CREATE_FAILED", message: "建立職缺追蹤失敗" },
        { status: 500 }
      );
    }

    // 7. 並行處理：查詢公司評價
    let companyReview = null;
    if (autoCompanyReview) {
      try {
        const crawlResult = await crawlCompanyReviews(jobData.companyName, {
          sources: ["dcard", "ptt", "qollie"],
          limit: 10,
        });
        const ratings = calculateCompanyRatings(crawlResult.reviews);
        companyReview = {
          avgSentiment: ratings.avgSentiment,
          reviewCount: ratings.totalCount,
          positiveCount: ratings.positiveCount,
          negativeCount: ratings.negativeCount,
        };
      } catch (error) {
        console.error("Company review fetch failed:", error);
        // 不阻斷流程
      }
    }

    // 8. 客製化履歷
    let customizedResume = null;
    if (autoCustomize && classification.resumeVersion.versionId) {
      try {
        // 將職缺添加到版本
        await addJobToVersion(classification.resumeVersion.versionId, jobApp.id);

        // 取得版本的基礎履歷
        const version = versions.find(
          (v) => v.id === classification.resumeVersion.versionId
        );
        if (version?.base_plain_text) {
          // 呼叫 AI 客製化
          const customization = await customizeResume(
            version.base_plain_text,
            jobData.description,
            jobData.companyName,
            jobData.position
          );

          // 更新 version_job_resume
          const vjr = await getVersionJobResume(
            classification.resumeVersion.versionId,
            jobApp.id
          );
          if (vjr) {
            await updateVersionJobResume(vjr.id, {
              customized_plain_text: customization.customizedContent,
              ats_score: customization.atsScore,
              matched_keywords: customization.matchedKeywords,
              missing_keywords: customization.missingKeywords,
              ai_suggestions: { suggestions: customization.suggestions },
              generation_status: "completed",
              generated_at: new Date().toISOString(),
            });
          }

          customizedResume = {
            versionId: classification.resumeVersion.versionId,
            versionName: classification.resumeVersion.versionName,
            atsScore: customization.atsScore,
            matchedKeywords: customization.matchedKeywords,
          };
        }
      } catch (error) {
        console.error("Resume customization failed:", error);
        // 不阻斷流程
      }
    }

    // 9. 建立 Gmail 草稿
    let emailDraft = null;
    if (autoDraftEmail && jobData.contactEmail) {
      try {
        const gmailConnected = await isGmailConnected(user.id);
        if (gmailConnected) {
          const draftResult = await createJobApplicationDraft({
            userId: user.id,
            companyName: jobData.companyName,
            position: jobData.position,
            contactEmail: jobData.contactEmail,
            jobDescription: jobData.description,
            applicationInstruction: jobData.applicationInstruction,
            resumePlainText: customizedResume
              ? versions.find((v) => v.id === customizedResume.versionId)
                  ?.base_plain_text || undefined
              : undefined,
            applicantName: profile?.name || undefined,
          });

          if (draftResult.success) {
            emailDraft = {
              created: true,
              draftId: draftResult.draftId,
              gmailUrl: draftResult.gmailUrl,
            };
          }
        }
      } catch (error) {
        console.error("Gmail draft creation failed:", error);
        // 不阻斷流程
      }
    }

    // 10. 返回結果
    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      processingTimeMs: processingTime,
      jobApplication: {
        id: jobApp.id,
        companyName: jobApp.company_name,
        position: jobApp.position,
        status: jobApp.status,
        categoryId: classification.category.categoryId,
        categoryName: classification.category.categoryName,
      },
      classification: {
        confidence: classification.category.confidence,
        reasoning: classification.category.reasoning,
      },
      companyReview,
      customizedResume,
      emailDraft: emailDraft || {
        created: false,
        reason: !jobData.contactEmail
          ? "NO_CONTACT_EMAIL"
          : !(await isGmailConnected(user.id))
          ? "GMAIL_NOT_CONNECTED"
          : "UNKNOWN",
      },
      viewUrl: `/applications?highlight=${jobApp.id}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: error.issues[0]?.message ?? "驗證錯誤",
        },
        { status: 400 }
      );
    }

    console.error("Quick add error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "處理失敗，請稍後再試",
      },
      { status: 500 }
    );
  }
}
