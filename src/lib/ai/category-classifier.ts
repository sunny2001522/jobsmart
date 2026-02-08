/**
 * 職缺類別判斷與履歷版本匹配模組
 * AI 自動判斷職缺屬於哪個類別，並匹配最適合的履歷版本
 */

import { aiGateway } from "./gateway";
import type { JobCategory, ResumeVersion } from "@/lib/supabase/types";

// 職缺類別判斷結果
export interface CategoryClassification {
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
  reasoning: string;
  alternativeCategories: {
    categoryId: string;
    categoryName: string;
    confidence: number;
  }[];
}

// 履歷版本匹配結果
export interface ResumeVersionMatch {
  versionId: string | null;
  versionName: string | null;
  confidence: number;
  matchedBy: "category" | "keywords" | "targetRole" | "none";
  reasoning: string;
}

// 完整的分類和匹配結果
export interface ClassificationResult {
  category: CategoryClassification;
  resumeVersion: ResumeVersionMatch;
}

const CATEGORY_CLASSIFICATION_PROMPT = `你是一個專業的職位分類專家。請根據職位資訊判斷最適合的職位類別。

## 用戶已定義的類別
{categories}

## 職位資訊
公司名稱：{companyName}
職位名稱：{position}
技能要求：{skills}
工作描述：{description}

## 分類規則
1. 優先根據職位名稱判斷（如「前端工程師」應歸類為前端相關類別）
2. 其次考慮技能要求（React/Vue 偏前端，Python/Java 偏後端）
3. 如果無法明確判斷，選擇最相近的類別
4. 如果完全不符合任何類別，categoryId 設為 null

## 常見職位對應
- 前端工程師、Frontend、Web Developer、React/Vue/Angular → 前端類
- 後端工程師、Backend、Server、Java/Python/Node.js → 後端類
- 全端工程師、Fullstack → 全端類
- PM、Product Manager、專案經理 → PM 類
- UI/UX、設計師、Visual Designer → 設計類
- Data、ML、AI、機器學習 → 資料/AI 類
- DevOps、SRE、Cloud → DevOps 類
- iOS、Android、Flutter、RN → 行動開發類

請返回 JSON 格式：
{
  "categoryId": "uuid-of-best-match-category" | null,
  "categoryName": "類別名稱" | null,
  "confidence": 0.0-1.0,
  "reasoning": "判斷依據簡述",
  "alternativeCategories": [
    { "categoryId": "...", "categoryName": "...", "confidence": 0.7 }
  ]
}

只返回 JSON，不要包含其他文字。`;

/**
 * AI 判斷職缺類別
 */
export async function classifyJobCategory(
  jobInfo: {
    companyName: string;
    position: string;
    skills?: string[];
    description?: string;
  },
  userCategories: JobCategory[]
): Promise<CategoryClassification> {
  // 如果用戶沒有定義任何類別，直接返回 null
  if (userCategories.length === 0) {
    return {
      categoryId: null,
      categoryName: null,
      confidence: 0,
      reasoning: "用戶尚未定義任何職位類別",
      alternativeCategories: [],
    };
  }

  // 建構類別清單
  const categoriesStr = userCategories
    .map((c) => `- ${c.name} (ID: ${c.id})`)
    .join("\n");

  // 建構 prompt
  const prompt = CATEGORY_CLASSIFICATION_PROMPT
    .replace("{categories}", categoriesStr)
    .replace("{companyName}", jobInfo.companyName)
    .replace("{position}", jobInfo.position)
    .replace("{skills}", jobInfo.skills?.join(", ") || "未提供")
    .replace("{description}", jobInfo.description?.slice(0, 1000) || "未提供");

  const result = await aiGateway("job_category_classification", prompt, {
    temperature: 0.3,
    maxTokens: 1024,
  });

  try {
    let jsonStr = result.text.trim();
    if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    // 驗證 categoryId 是否存在於用戶的類別中
    const validCategoryId =
      parsed.categoryId &&
      userCategories.some((c) => c.id === parsed.categoryId)
        ? parsed.categoryId
        : null;

    const categoryName = validCategoryId
      ? userCategories.find((c) => c.id === validCategoryId)?.name || null
      : null;

    return {
      categoryId: validCategoryId,
      categoryName,
      confidence: parsed.confidence ?? 0.5,
      reasoning: parsed.reasoning || "",
      alternativeCategories: (parsed.alternativeCategories || [])
        .filter((alt: { categoryId: string }) =>
          userCategories.some((c) => c.id === alt.categoryId)
        )
        .slice(0, 3),
    };
  } catch {
    return {
      categoryId: null,
      categoryName: null,
      confidence: 0,
      reasoning: "AI 分析失敗",
      alternativeCategories: [],
    };
  }
}

// 角色同義詞對照表
const ROLE_SYNONYMS: Record<string, string[]> = {
  前端: ["frontend", "front-end", "web", "react", "vue", "angular", "ui"],
  後端: ["backend", "back-end", "server", "api", "java", "python", "node", "go", "rust"],
  全端: ["fullstack", "full-stack", "全棧"],
  PM: ["product manager", "project manager", "產品經理", "專案經理", "產品"],
  設計: ["design", "ui", "ux", "visual", "視覺", "graphic"],
  資料: ["data", "ml", "ai", "machine learning", "機器學習", "數據", "分析"],
  DevOps: ["sre", "infrastructure", "cloud", "aws", "gcp", "azure", "k8s", "kubernetes"],
  行動: ["mobile", "ios", "android", "flutter", "react native", "app"],
  測試: ["qa", "test", "testing", "品保", "quality"],
};

/**
 * 計算角色相似度（非 AI，用於快速匹配）
 */
function calculateRoleSimilarity(position: string, targetRole: string): number {
  const posLower = position.toLowerCase();
  const targetLower = targetRole.toLowerCase();

  // 直接包含
  if (posLower.includes(targetLower) || targetLower.includes(posLower)) {
    return 0.9;
  }

  // 同義詞匹配
  for (const [, synonyms] of Object.entries(ROLE_SYNONYMS)) {
    const posHasTerm = synonyms.some((s) => posLower.includes(s));
    const targetHasTerm = synonyms.some((s) => targetLower.includes(s));

    if (posHasTerm && targetHasTerm) {
      return 0.8;
    }
  }

  return 0;
}

/**
 * 根據類別和職位資訊匹配最適合的履歷版本
 */
export function findMatchingResumeVersion(
  jobInfo: {
    categoryId: string | null;
    position: string;
    skills?: string[];
  },
  userVersions: ResumeVersion[]
): ResumeVersionMatch {
  // 沒有履歷版本
  if (userVersions.length === 0) {
    return {
      versionId: null,
      versionName: null,
      confidence: 0,
      matchedBy: "none",
      reasoning: "用戶尚未建立任何履歷版本",
    };
  }

  // 1. 優先：按 category_id 匹配
  if (jobInfo.categoryId) {
    const categoryMatch = userVersions.find(
      (v) => v.category_id === jobInfo.categoryId
    );
    if (categoryMatch) {
      return {
        versionId: categoryMatch.id,
        versionName: categoryMatch.name,
        confidence: 0.95,
        matchedBy: "category",
        reasoning: `職缺類別與「${categoryMatch.name}」版本相符`,
      };
    }
  }

  // 2. 次選：按 target_role 語意匹配
  const roleMatches = userVersions
    .filter((v) => v.target_role)
    .map((v) => ({
      version: v,
      similarity: calculateRoleSimilarity(jobInfo.position, v.target_role!),
    }))
    .filter((m) => m.similarity > 0.6)
    .sort((a, b) => b.similarity - a.similarity);

  if (roleMatches.length > 0) {
    const topMatch = roleMatches[0];
    return {
      versionId: topMatch.version.id,
      versionName: topMatch.version.name,
      confidence: topMatch.similarity,
      matchedBy: "targetRole",
      reasoning: `職位「${jobInfo.position}」與「${topMatch.version.name}」目標角色相近`,
    };
  }

  // 3. 備選：按關鍵字匹配
  if (jobInfo.skills && jobInfo.skills.length > 0) {
    const keywordMatches = userVersions
      .filter((v) => v.base_keywords && v.base_keywords.length > 0)
      .map((v) => ({
        version: v,
        matchCount: v.base_keywords.filter((k) =>
          jobInfo.skills!.some(
            (s) =>
              s.toLowerCase().includes(k.toLowerCase()) ||
              k.toLowerCase().includes(s.toLowerCase())
          )
        ).length,
      }))
      .filter((m) => m.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount);

    if (keywordMatches.length > 0) {
      const topMatch = keywordMatches[0];
      return {
        versionId: topMatch.version.id,
        versionName: topMatch.version.name,
        confidence: Math.min(topMatch.matchCount / 5, 0.8),
        matchedBy: "keywords",
        reasoning: `有 ${topMatch.matchCount} 個關鍵字匹配「${topMatch.version.name}」`,
      };
    }
  }

  // 4. 無匹配：使用第一個版本作為預設
  const defaultVersion = userVersions[0];
  return {
    versionId: defaultVersion.id,
    versionName: defaultVersion.name,
    confidence: 0.3,
    matchedBy: "none",
    reasoning: `無精確匹配，使用預設版本「${defaultVersion.name}」`,
  };
}

/**
 * 完整的分類和匹配流程
 */
export async function classifyAndMatch(
  jobInfo: {
    companyName: string;
    position: string;
    skills?: string[];
    description?: string;
  },
  userCategories: JobCategory[],
  userVersions: ResumeVersion[]
): Promise<ClassificationResult> {
  // 1. AI 判斷類別
  const category = await classifyJobCategory(jobInfo, userCategories);

  // 2. 匹配履歷版本
  const resumeVersion = findMatchingResumeVersion(
    {
      categoryId: category.categoryId,
      position: jobInfo.position,
      skills: jobInfo.skills,
    },
    userVersions
  );

  return {
    category,
    resumeVersion,
  };
}
