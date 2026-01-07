import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

// AI 任務類型
export type AITaskType =
  | "keyword_extraction"      // 關鍵字提取 -> Gemini
  | "sentiment_analysis"      // 情緒分析 -> Gemini
  | "text_summary"            // 文字摘要 -> Gemini
  | "resume_draft"            // 履歷草稿 -> Gemini Pro
  | "resume_optimization"     // 履歷優化 -> GPT-4
  | "interview_feedback"      // 面試評分 -> GPT-4
  | "linkedin_generate"       // LinkedIn 生成 -> GPT-4
  | "jd_analysis";            // JD 分析 -> Gemini

// 模型路由映射
const TASK_MODEL_MAPPING: Record<AITaskType, string> = {
  keyword_extraction: "gemini-1.5-flash",
  sentiment_analysis: "gemini-1.5-flash",
  text_summary: "gemini-1.5-flash",
  resume_draft: "gemini-1.5-pro",
  resume_optimization: "gpt-4-turbo",
  interview_feedback: "gpt-4-turbo",
  linkedin_generate: "gpt-4-turbo",
  jd_analysis: "gemini-1.5-flash",
};

// 初始化 Gemini
function getGeminiClient() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not set");
  }
  return new GoogleGenerativeAI(apiKey);
}

// 初始化 OpenAI
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

// AI Gateway 主函數
export async function aiGateway(
  taskType: AITaskType,
  prompt: string,
  options?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
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
  }
): Promise<{ text: string; model: string; usage?: { input: number; output: number } }> {
  const openai = getOpenAIClient();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  if (options?.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
  });

  const text = response.choices[0]?.message?.content ?? "";

  return {
    text,
    model,
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
