import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

// AI 任務類型
export type AITaskType =
  | "keyword_extraction"           // 關鍵字提取 -> Gemini
  | "sentiment_analysis"           // 情緒分析 -> Gemini
  | "text_summary"                 // 文字摘要 -> Gemini
  | "resume_draft"                 // 履歷草稿 -> Gemini Pro
  | "resume_optimization"          // 履歷優化 -> GPT-4
  | "resume_customization"         // 履歷客製化 -> GPT-4
  | "interview_feedback"           // 面試評分 -> GPT-4
  | "linkedin_generate"            // LinkedIn 生成 -> GPT-4
  | "jd_analysis"                  // JD 分析 -> Gemini
  | "jd_value_analysis"            // JD 價值觀分析 -> Gemini
  | "jd_translation"               // JD 中文翻譯 -> Gemini
  | "interview_extraction"         // 面試經驗提取 -> Gemini
  | "social_post_extraction"       // 社群貼文職缺提取 -> Gemini
  | "job_category_classification"  // 職缺類別判斷 -> Gemini
  | "cover_letter_generation";     // 求職信生成 -> GPT-4

// 模型路由映射
const TASK_MODEL_MAPPING: Record<AITaskType, string> = {
  keyword_extraction: "gemini-2.0-flash",
  sentiment_analysis: "gemini-2.0-flash",
  text_summary: "gemini-2.0-flash",
  resume_draft: "gemini-2.0-flash",
  resume_optimization: "gpt-4-turbo",
  resume_customization: "gpt-4-turbo",
  interview_feedback: "gpt-4-turbo",
  linkedin_generate: "gpt-4-turbo",
  jd_analysis: "gemini-2.0-flash",
  jd_value_analysis: "gemini-2.0-flash",
  jd_translation: "gemini-2.0-flash",
  interview_extraction: "gemini-2.0-flash",
  social_post_extraction: "gemini-2.0-flash",
  job_category_classification: "gemini-2.0-flash",
  cover_letter_generation: "gpt-4-turbo",
};

// 初始化 Gemini
function getGeminiClient() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not set");
  }
  return new GoogleGenerativeAI(apiKey);
}

// 初始化 OpenAI 相容端點：優先使用 OpenAI，未設定時改用 Nebius Token Factory
function getOpenAIClient(): { client: OpenAI; provider: "openai" | "nebius" } {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) return { client: new OpenAI({ apiKey }), provider: "openai" };
  const nebiusKey = process.env.NEBIUS_API_KEY;
  if (nebiusKey) {
    return {
      client: new OpenAI({ apiKey: nebiusKey, baseURL: process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1" }),
      provider: "nebius",
    };
  }
  throw new Error("尚未設定 AI 金鑰：請在環境變數設定 OPENAI_API_KEY 或 NEBIUS_API_KEY");
}

// 從模型輸出取出 JSON：容忍 ```json 區塊、<think> 推理段落與前後說明文字
export function parseJsonResponse<T = Record<string, unknown>>(text: string): T {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```(?:json)?/gi, "").trim();
  try { return JSON.parse(cleaned) as T; } catch { /* fall through */ }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("AI 回傳內容不是 JSON");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

// AI Gateway 主函數
export async function aiGateway(
  taskType: AITaskType,
  prompt: string,
  options?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    json?: boolean;
  }
): Promise<{ text: string; model: string; usage?: { input: number; output: number } }> {
  const model = TASK_MODEL_MAPPING[taskType];
  const isGemini = model.startsWith("gemini");

  if (isGemini) {
    return callGemini(model, prompt, options);
  } else {
    return callOpenAI(model, prompt, options);
  }
}

// Gemini API 調用
async function callGemini(
  model: string,
  prompt: string,
  options?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{ text: string; model: string; usage?: { input: number; output: number } }> {
  const genAI = getGeminiClient();
  const geminiModel = genAI.getGenerativeModel({
    model,
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 2048,
    },
  });

  const fullPrompt = options?.systemPrompt
    ? `${options.systemPrompt}\n\n${prompt}`
    : prompt;

  const result = await geminiModel.generateContent(fullPrompt);
  const response = result.response;
  const text = response.text();

  return {
    text,
    model,
    usage: {
      input: response.usageMetadata?.promptTokenCount ?? 0,
      output: response.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

// OpenAI API 調用
async function callOpenAI(
  model: string,
  prompt: string,
  options?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    json?: boolean;
  }
): Promise<{ text: string; model: string; usage?: { input: number; output: number } }> {
  const { client: openai, provider } = getOpenAIClient();
  const resolvedModel = provider === "nebius"
    ? process.env.NEBIUS_MODEL ?? "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16"
    : model;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  if (options?.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  const response = await openai.chat.completions.create({
    model: resolvedModel,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
    // JSON mode 只在 OpenAI 上啟用；其他相容端點不一定支援
    ...(options?.json && provider === "openai" ? { response_format: { type: "json_object" as const } } : {}),
  });

  const choice = response.choices[0];
  const text = choice?.message?.content ?? "";
  if (choice?.finish_reason === "length") {
    console.warn(`[aiGateway] ${resolvedModel} output truncated at max_tokens`);
  }

  return {
    text,
    model: resolvedModel,
    usage: {
      input: response.usage?.prompt_tokens ?? 0,
      output: response.usage?.completion_tokens ?? 0,
    },
  };
}

// 便捷函數：關鍵字提取
export async function extractKeywords(text: string): Promise<string[]> {
  const result = await aiGateway("keyword_extraction", text, {
    systemPrompt: `你是一個專業的 HR 和職缺分析專家。請從以下職缺描述中提取關鍵技能和要求。
只返回 JSON 陣列格式，例如：["React", "TypeScript", "團隊合作"]
不要包含任何其他文字或解釋。`,
    temperature: 0.3,
  });

  try {
    const keywords = JSON.parse(result.text);
    return Array.isArray(keywords) ? keywords : [];
  } catch {
    // 如果解析失敗，嘗試手動提取
    const matches = result.text.match(/["']([^"']+)["']/g);
    return matches ? matches.map((m) => m.replace(/["']/g, "")) : [];
  }
}

// 便捷函數：JD 分析
export async function analyzeJD(jdContent: string): Promise<{
  keywords: string[];
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
}> {
  const result = await aiGateway("jd_analysis", jdContent, {
    systemPrompt: `你是一個專業的職缺分析專家。請分析以下職缺描述並提取結構化資訊。
請返回 JSON 格式：
{
  "keywords": ["技能1", "技能2"],
  "requirements": ["要求1", "要求2"],
  "responsibilities": ["職責1", "職責2"],
  "benefits": ["福利1", "福利2"]
}
只返回 JSON，不要包含任何其他文字。`,
    temperature: 0.3,
  });

  try {
    return JSON.parse(result.text);
  } catch {
    return {
      keywords: [],
      requirements: [],
      responsibilities: [],
      benefits: [],
    };
  }
}

// 便捷函數：履歷優化建議
export async function optimizeResume(
  resumeContent: string,
  targetJD?: string
): Promise<{
  score: number;
  suggestions: string[];
  strongVerbs: string[];
  keywordMatches: string[];
}> {
  const prompt = targetJD
    ? `以下是履歷內容：\n${resumeContent}\n\n以下是目標職缺：\n${targetJD}`
    : `以下是履歷內容：\n${resumeContent}`;

  const result = await aiGateway("resume_optimization", prompt, {
    systemPrompt: `你是一個專業的履歷顧問，專精於 ATS (Applicant Tracking System) 優化。
請分析這份履歷並提供改善建議。

請返回 JSON 格式：
{
  "score": 0-100 的整數分數,
  "suggestions": ["建議1", "建議2", "建議3"],
  "strongVerbs": ["建議使用的強動詞1", "強動詞2"],
  "keywordMatches": ["匹配的關鍵字1", "關鍵字2"]
}
只返回 JSON，不要包含任何其他文字。`,
    temperature: 0.5,
  });

  try {
    return JSON.parse(result.text);
  } catch {
    return {
      score: 50,
      suggestions: ["無法分析履歷，請稍後再試"],
      strongVerbs: [],
      keywordMatches: [],
    };
  }
}

// 便捷函數：面試回答評分
export async function evaluateInterviewAnswer(
  question: string,
  answer: string
): Promise<{
  score: number;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
}> {
  const prompt = `面試問題：${question}\n\n回答內容：${answer}`;

  const result = await aiGateway("interview_feedback", prompt, {
    systemPrompt: `你是一個專業的面試教練。請評估這個面試回答的品質。

評分標準：
- 內容相關性和完整性
- 使用 STAR 方法（情境、任務、行動、結果）
- 表達清晰度
- 專業度

請返回 JSON 格式：
{
  "score": 0-100 的整數分數,
  "strengths": ["優點1", "優點2"],
  "improvements": ["改進建議1", "改進建議2"],
  "suggestions": ["具體建議1", "具體建議2"]
}
只返回 JSON，不要包含任何其他文字。`,
    temperature: 0.5,
  });

  try {
    return JSON.parse(result.text);
  } catch {
    return {
      score: 50,
      strengths: [],
      improvements: ["無法分析回答，請稍後再試"],
      suggestions: [],
    };
  }
}

// 便捷函數：履歷客製化（根據 JD 微調履歷）
export async function customizeResume(
  baseResume: string,
  jobDescription: string,
  companyName: string,
  position: string,
  additionalContext?: string
): Promise<{
  customizedContent: string;
  atsScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  audit: ResumeAudit;
}> {
  const prompt = `
## 基礎履歷
${baseResume}

## 目標職缺資訊
公司名稱：${companyName}
職位名稱：${position}
職缺描述：
${jobDescription}
${additionalContext ? `\n## 使用者補充的真實經驗（只能在內容有明確支持時採用）\n${additionalContext}` : ""}
`;

  const result = await aiGateway("resume_customization", prompt, {
    systemPrompt: `你是一個嚴謹的履歷顧問。只依據基礎履歷改寫，不得補造任何能力、年資、雇主、職稱、責任、數字或成果。先拆解 JD 必要條件與加分條件；必要條件權重 2、加分條件權重 1。每項條件都要記錄履歷原文證據；沒有證據就列為缺口，不得把關鍵字硬塞進履歷。保留原文責任程度（協助不可改成主導）。

任務：
1. 根據目標職缺的 JD，微調基礎履歷的內容
2. 保持履歷的真實性，只調整措辭和重點，不要捏造經歷
3. 突顯與職缺相關的技能和經驗
4. 使用 JD 中出現的關鍵字（自然地融入，不要堆砌）
5. 針對性地調整工作經歷描述，強調相關成就

輸出要求：
請返回 JSON 格式：
{
  "customizedContent": "完整的客製化履歷純文字內容（使用 Markdown 格式）",
  "atsScore": 0-100 的整數分數（預估 ATS 通過率）,
  "matchedKeywords": ["已匹配的關鍵字1", "關鍵字2"],
  "missingKeywords": ["建議補充的關鍵字1", "關鍵字2"],
  "suggestions": ["額外改善建議1", "建議2"],
  "requirements": [{"requirement":"JD 條件","priority":"required|preferred","evidence":"履歷原文或空字串","status":"supported|partial|missing"}]
}

重要：
- customizedContent 必須是完整可用的履歷內容
- 維持原本履歷的結構和格式
- 只返回 JSON，不要包含任何其他文字`,
    temperature: 0.6,
    maxTokens: 4096,
    json: true,
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = parseJsonResponse(result.text);
  } catch (error) {
    console.error("[customizeResume] invalid JSON from model", error, result.text.slice(0, 500));
    throw new Error("AI 回傳的履歷格式無法解析（可能是履歷太長被截斷），請稍後重試");
  }
  const content = String(parsed.customizedContent || "");
  if (content.trim().length < Math.min(80, baseResume.trim().length * 0.4)) throw new Error("客製履歷輸出不完整，請稍後重試");
  const requirements = (Array.isArray(parsed.requirements) ? parsed.requirements : []) as ResumeAudit["requirements"];
  let audit: ResumeAudit;
  try {
    audit = await reviewResumeClaims(baseResume, content, jobDescription, requirements);
  } catch (error) {
    console.error("[customizeResume] fact review failed", error);
    throw new Error("履歷事實審核失敗，請稍後重試");
  }
  return {
    customizedContent: content,
    atsScore: Math.max(0, Math.min(100, Number(parsed.atsScore) || 0)),
    matchedKeywords: Array.isArray(parsed.matchedKeywords) ? parsed.matchedKeywords as string[] : [],
    missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords as string[] : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions as string[] : [],
    audit: { ...audit, requirements },
  };
}

export type ResumeAudit = {
  status: "passed" | "needs_attention";
  findings: Array<{ claim: string; status: "supported" | "exaggerated" | "unsupported"; evidence: string; reason: string }>;
  requirements: Array<{ requirement: string; priority: "required" | "preferred"; evidence: string; status: "supported" | "partial" | "missing" }>;
  summary: string;
};

export async function reviewResumeClaims(baseResume: string, draft: string, jobDescription: string, requirements: ResumeAudit["requirements"] = []): Promise<ResumeAudit> {
  const result = await aiGateway("resume_customization", `基礎履歷：\n${baseResume}\n\n客製草稿：\n${draft}\n\nJD：\n${jobDescription}\n\n條件分析：${JSON.stringify(requirements)}`, {
    systemPrompt: `你是獨立履歷事實審核員，與改寫者分開審核。逐項檢查草稿中的具體事實與責任強度是否能由基礎履歷支持。只將清楚可對照的原文放入 evidence；不能支持的數字、成果、技能、責任或資格標為 unsupported；原文被升級為更大責任或成果標為 exaggerated。通用自我描述不必列。status 有任何 exaggerated/unsupported 即 needs_attention。回傳純 JSON：{"status":"passed|needs_attention","summary":"...","findings":[{"claim":"草稿原句","status":"supported|exaggerated|unsupported","evidence":"基礎履歷原文或空字串","reason":"原因"}],"requirements":[{"requirement":"...","priority":"required|preferred","evidence":"...","status":"supported|partial|missing"}]}`,
    temperature: 0.1, maxTokens: 3000, json: true,
  });
  const parsed = parseJsonResponse<ResumeAudit>(result.text);
  if (!Array.isArray(parsed.findings) || !["passed", "needs_attention"].includes(parsed.status)) throw new Error("事實審核格式無效");
  return { ...parsed, requirements: Array.isArray(parsed.requirements) ? parsed.requirements : requirements };
}

// 便捷函數：JD 價值觀分析（20 因素評分）
export async function analyzeJDForValues(jdContent: string): Promise<{
  scores: Record<string, { score: number | null; confidence: string; evidence: string }>;
  extractedData: {
    salaryRange?: { min: number; max: number; currency: string; period: string };
    location?: { address: string; nearMrt?: string };
    benefitsList?: string[];
    remotePolicy?: string;
  };
}> {
  const prompt = `請分析以下職缺描述（JD）：

${jdContent}`;

  const result = await aiGateway("jd_value_analysis", prompt, {
    systemPrompt: `你是一位專業的職缺分析專家。請分析職缺描述，評估 20 個工作價值因素的分數。

## 評分標準
每個因素評分範圍：0-10
- 0-2：明確負面信號或完全沒提及相關資訊
- 3-4：資訊不足，略有暗示但不明確
- 5：中性或無法判斷
- 6-7：有正面描述或暗示
- 8-10：有明確、具體的正面陳述

## 需要評估的 20 個因素

### A. 可直接從 JD 推斷的因素
1. salary (薪資待遇)：薪資數字、獎金、分紅描述
2. benefits (福利制度)：假期、保險、津貼、員工福利
3. learning (學習成長)：培訓、進修、技術分享機會
4. flexibility (彈性工時)：上下班時間彈性
5. remote (遠端工作)：WFH、混合辦公政策
6. challenge (挑戰性)：技術複雜度、問題規模

### B. 需語意推斷的因素
7. growth (職涯發展)：升遷機會、職涯路徑
8. autonomy (自主性)：工作決策權、獨立負責程度
9. teamwork (團隊合作)：協作需求、團隊氛圍描述
10. creativity (創意發揮)：創新空間、實驗機會
11. achievement (成就感)：產品影響力、用戶規模
12. impact (社會影響力)：社會價值、使命感
13. independence (獨立工作)：獨立作業 vs 密切協作

### C. JD 難以判斷的因素（僅在有明確線索時評分，否則設為 null）
14. stability (穩定性)
15. balance (工作生活平衡)
16. colleagues (同事關係)
17. manager (主管支持)
18. recognition (專業認可)
19. culture (公司文化)
20. location (地理位置)：提取地址但不評分

## 輸出格式
請返回純 JSON（不要有 markdown 代碼塊）：
{
  "scores": {
    "salary": { "score": 7, "confidence": "high", "evidence": "明確標示年薪 120-150 萬" },
    "benefits": { "score": 8, "confidence": "high", "evidence": "列出 15 天年假、員工旅遊" },
    "growth": { "score": null, "confidence": "none", "evidence": "JD 未提及升遷管道" },
    ...（其餘 17 個因素）
  },
  "extractedData": {
    "salaryRange": { "min": 1200000, "max": 1500000, "currency": "TWD", "period": "yearly" },
    "location": { "address": "台北市信義區...", "nearMrt": "市政府站" },
    "benefitsList": ["15天年假", "員工旅遊", "免費午餐"],
    "remotePolicy": "hybrid"
  }
}

## 重要規則
1. confidence 可為 "high"、"medium"、"low"、"none"
2. 如果完全沒有相關資訊，score 設為 null，confidence 設為 "none"
3. evidence 必須引用 JD 中的原文或說明推斷依據
4. 不要過度推測，保守評分
5. 只返回 JSON，不要包含其他文字`,
    temperature: 0.3,
    maxTokens: 4096,
  });

  try {
    // 嘗試解析 JSON，處理可能的 markdown 代碼塊
    let jsonText = result.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }
    return JSON.parse(jsonText);
  } catch {
    // 返回預設結果
    return {
      scores: {},
      extractedData: {},
    };
  }
}

// 便捷函數：JD 中文翻譯
export async function translateJD(jdContent: {
  description: string;
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  keywords?: string[];
}): Promise<{
  summary: string;
  summary_tags: string[];
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  keywords_zh: string[];
}> {
  const prompt = `
## 職缺描述
${jdContent.description || "無"}

## 職位要求
${jdContent.requirements?.join("\n") || "無"}

## 工作職責
${jdContent.responsibilities?.join("\n") || "無"}

## 福利待遇
${jdContent.benefits?.join("\n") || "無"}

## 關鍵技能
${jdContent.keywords?.join(", ") || "無"}
`;

  const result = await aiGateway("jd_translation", prompt, {
    systemPrompt: `你是一位專業的職缺翻譯專家。請將以下職缺內容翻譯並整理成繁體中文重點摘要。

任務：
1. 提供一段簡潔的職缺摘要（2-3句話，描述這份工作的核心內容）
2. 提供 3-5 個簡短標籤（每個 2-8 字），描述這份工作的核心任務與技能
   - 格式範例：["前端(React)", "API串接", "建資料庫", "帶團隊"]
   - 應包含：主要技術、核心任務、特殊職責
   - 避免太籠統的詞如「開發」「工程」
3. 將職位要求整理成中文重點條列（每項 15-25 字）
4. 將工作職責整理成中文重點條列（每項 15-25 字）
5. 將福利待遇整理成中文重點條列（每項 15-25 字）
6. 提供中文關鍵技能標籤

規則：
- 使用繁體中文
- 保留專業技術名詞（如 React、TypeScript、AWS 等）
- 每項重點精簡扼要
- 如果原文已是中文，則直接整理重點即可
- 保持原意，不要過度推測

請返回 JSON 格式：
{
  "summary": "職缺摘要（2-3句話）",
  "summary_tags": ["標籤1", "標籤2", "標籤3"],
  "requirements": ["要求1", "要求2", ...],
  "responsibilities": ["職責1", "職責2", ...],
  "benefits": ["福利1", "福利2", ...],
  "keywords_zh": ["技能1", "技能2", ...]
}

只返回 JSON，不要包含任何其他文字或 markdown 代碼塊。`,
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

    return JSON.parse(jsonStr);
  } catch {
    return {
      summary: "",
      summary_tags: [],
      requirements: [],
      responsibilities: [],
      benefits: [],
      keywords_zh: [],
    };
  }
}

// 面試資料提取結果
export interface ExtractedInterviewData {
  stages: {
    order: number;
    name: string;
    description?: string;
  }[];
  questions: string[];
  difficulty: "easy" | "medium" | "hard" | null;
  outcome: "offer" | "rejected" | "ghosted" | "unknown" | null;
  tips: string[];
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
}

// 便捷函數：面試經驗提取
export async function extractInterviewData(
  content: string
): Promise<ExtractedInterviewData> {
  const result = await aiGateway("interview_extraction", content, {
    systemPrompt: `你是一位專業的面試經驗分析專家。請從以下面試經驗分享中提取結構化資訊。

請分析並提取：
1. 面試關卡/流程（例如：電話面試、線上測驗、技術面、主管面、HR面）
2. 被問到的面試題目（技術題、行為題、情境題等）
3. 面試難度（easy/medium/hard）
4. 面試結果（offer/rejected/ghosted/unknown）
5. 實用的面試建議或技巧
6. 整體體驗情緒（positive/neutral/negative）

輸出 JSON 格式：
{
  "stages": [
    { "order": 1, "name": "電話面試", "description": "HR 初步了解背景，約 20 分鐘" },
    { "order": 2, "name": "技術面試", "description": "系統設計 + 實作題" }
  ],
  "questions": [
    "請解釋 React 的 Virtual DOM 原理",
    "設計一個 URL 縮短服務",
    "為什麼想加入我們公司"
  ],
  "difficulty": "medium",
  "outcome": "offer",
  "tips": [
    "準備系統設計很重要",
    "面試官很友善，不會太刁難"
  ],
  "sentiment": "positive",
  "sentimentScore": 75
}

規則：
- 如果無法判斷面試關卡，stages 設為空陣列
- 如果沒有提到具體題目，questions 設為空陣列
- 如果無法判斷難度，difficulty 設為 null
- 如果沒有明確說結果，outcome 設為 "unknown"
- sentimentScore 範圍 0-100，50 為中性，越高越正面
- 只返回 JSON，不要包含 markdown 代碼塊或其他文字`,
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
      stages: parsed.stages || [],
      questions: parsed.questions || [],
      difficulty: parsed.difficulty || null,
      outcome: parsed.outcome || "unknown",
      tips: parsed.tips || [],
      sentiment: parsed.sentiment || "neutral",
      sentimentScore: parsed.sentimentScore ?? 50,
    };
  } catch {
    return {
      stages: [],
      questions: [],
      difficulty: null,
      outcome: "unknown",
      tips: [],
      sentiment: "neutral",
      sentimentScore: 50,
    };
  }
}
