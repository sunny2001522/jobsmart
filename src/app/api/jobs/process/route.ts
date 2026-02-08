/**
 * Job Process API
 * QStash 回調端點，處理從 LINE 接收的職缺
 * 複用 /api/mobile/quick-add 的核心邏輯
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyQStashSignature } from "@/lib/queue/qstash";
import { pushMessage } from "@/lib/line/client";
import { createJobAddedMessage, createErrorMessage } from "@/lib/line/messages";
import { ProcessJobPayload } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/server";
import { aiGateway } from "@/lib/ai/gateway";
import { crawlCompanyReviews, calculateCompanyRatings } from "@/lib/crawler";
import {
  parseSocialPost,
  isSocialPlatformUrl,
  isJobSiteUrl,
  extractJobUrls,
} from "@/lib/ai/social-post-parser";
import { classifyAndMatch } from "@/lib/ai/category-classifier";
import { customizeResume } from "@/lib/ai/gateway";
import { createJobApplicationDraft } from "@/lib/gmail/draft";
import { isGmailConnected } from "@/lib/gmail/oauth";

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
  let text = html.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );
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

/**
 * POST /api/jobs/process
 * QStash 回調端點
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 驗證 QStash 簽名
    const signature = request.headers.get("upstash-signature");
    const body = await request.text();

    if (signature) {
      const isValid = await verifyQStashSignature(signature, body);
      if (!isValid) {
        console.error("Invalid QStash signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    // 解析 payload
    const payload: ProcessJobPayload = JSON.parse(body);
    const { jobId, userId, lineUserId, url, content, options } = payload;

    console.log(`Processing job ${jobId} for user ${userId}`);

    // 使用 Admin Client（因為這是背景任務，沒有用戶 session）
    const supabase = createAdminClient();

    // 取得用戶資料
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!profile) {
      throw new Error("User not found");
    }

    // 判斷 URL 類型並解析職缺
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
      const jobUrls =
        socialData.jobUrls.length > 0
          ? socialData.jobUrls
          : extractJobUrls(postContent);

      if (jobUrls.length > 0 && isJobSiteUrl(jobUrls[0])) {
        // 有職缺連結，抓取詳細 JD
        const detailedJD = await fetchJobFromUrl(jobUrls[0]);
        jobData = {
          ...detailedJD,
          contactEmail:
            socialData.contacts.emails[0] || detailedJD.contactEmail,
          applicationInstruction:
            socialData.applicationMethod?.instruction ||
            detailedJD.applicationInstruction,
          sourceType: "line",
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
          applicationInstruction:
            socialData.applicationMethod?.instruction ?? undefined,
          sourceUrl: url,
          sourceType: "line",
          sourceContent: content,
        };
      }
    } else if (isJobSiteUrl(url)) {
      // 求職網站直接抓取
      const jd = await fetchJobFromUrl(url);
      jobData = {
        ...jd,
        sourceType: "line",
      };
    } else {
      // 嘗試抓取任意 URL
      const jd = await fetchJobFromUrl(url);
      jobData = {
        ...jd,
        sourceType: "line",
      };
    }

    // 取得用戶的類別和履歷版本
    const [categoriesResult, versionsResult] = await Promise.all([
      supabase
        .from("job_categories")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("display_order"),
      supabase
        .from("resume_versions")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("display_order"),
    ]);

    const categories = categoriesResult.data || [];
    const versions = versionsResult.data || [];

    // AI 判斷類別並匹配履歷版本
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

    // 建立 job_application
    const { data: jobApp, error: insertError } = await supabase
      .from("job_applications")
      .insert({
        user_id: userId,
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
        work_location: jobData.location || null,
        category_id: classification.category.categoryId,
        source_type: jobData.sourceType,
        source_content: jobData.sourceContent || null,
        source_post_url: jobData.sourceUrl,
        contact_email: jobData.contactEmail || null,
        application_instruction: jobData.applicationInstruction || null,
        salary_currency: "TWD",
        salary_period: "monthly",
        display_order: 0,
        commute_cost: 0,
        meal_allowance: 0,
        other_allowance: 0,
      })
      .select()
      .single();

    if (insertError || !jobApp) {
      throw new Error(`Failed to create job application: ${insertError?.message}`);
    }

    // 並行處理：查詢公司評價
    let companyReview = null;
    if (options.autoCompanyReview) {
      try {
        const crawlResult = await crawlCompanyReviews(jobData.companyName, {
          sources: ["dcard", "ptt", "qollie"],
          limit: 10,
        });
        const ratings = calculateCompanyRatings(crawlResult.reviews);
        companyReview = {
          positiveRate:
            ratings.totalCount > 0
              ? (ratings.positiveCount / ratings.totalCount) * 100
              : 0,
          count: ratings.totalCount,
        };
      } catch (error) {
        console.error("Company review fetch failed:", error);
      }
    }

    // 客製化履歷
    let customizedResume = null;
    if (options.autoCustomize && classification.resumeVersion.versionId) {
      try {
        // 將職缺添加到版本
        await supabase.from("version_job_resumes").insert({
          version_id: classification.resumeVersion.versionId,
          job_application_id: jobApp.id,
          generation_status: "generating",
          display_order: 0,
        });

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
          await supabase
            .from("version_job_resumes")
            .update({
              customized_plain_text: customization.customizedContent,
              ats_score: customization.atsScore,
              matched_keywords: customization.matchedKeywords,
              missing_keywords: customization.missingKeywords,
              ai_suggestions: { suggestions: customization.suggestions },
              generation_status: "completed",
              generated_at: new Date().toISOString(),
            })
            .eq("version_id", classification.resumeVersion.versionId)
            .eq("job_application_id", jobApp.id);

          customizedResume = {
            versionId: classification.resumeVersion.versionId,
            versionName: classification.resumeVersion.versionName,
            atsScore: customization.atsScore,
          };
        }
      } catch (error) {
        console.error("Resume customization failed:", error);
      }
    }

    // 建立 Gmail 草稿
    let emailDraft = null;
    if (options.autoDraftEmail && jobData.contactEmail) {
      try {
        const gmailConnected = await isGmailConnected(userId);
        if (gmailConnected) {
          const draftResult = await createJobApplicationDraft({
            userId: userId,
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
              gmailUrl: draftResult.gmailUrl,
            };
          }
        }
      } catch (error) {
        console.error("Gmail draft creation failed:", error);
      }
    }

    // 推送 LINE 通知
    try {
      const notificationMessage = createJobAddedMessage({
        companyName: jobData.companyName,
        position: jobData.position,
        atsScore: customizedResume?.atsScore,
        companyReview: companyReview,
        resumeVersion: customizedResume?.versionName || undefined,
        category: classification.category.categoryName || undefined,
        hasEmailDraft: !!emailDraft?.created,
        jobApplicationId: jobApp.id,
        gmailUrl: emailDraft?.gmailUrl,
      });

      await pushMessage(lineUserId, notificationMessage);
    } catch (error) {
      console.error("Failed to push LINE notification:", error);
    }

    const processingTime = Date.now() - startTime;
    console.log(`Job ${jobId} completed in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      jobId,
      jobApplicationId: jobApp.id,
      processingTimeMs: processingTime,
    });
  } catch (error) {
    console.error("Job processing error:", error);

    // 嘗試推送錯誤通知
    try {
      const payload: ProcessJobPayload = JSON.parse(await request.clone().text());
      if (payload.lineUserId) {
        await pushMessage(
          payload.lineUserId,
          createErrorMessage("PARSE_FAILED")
        );
      }
    } catch {
      // 忽略通知錯誤
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
