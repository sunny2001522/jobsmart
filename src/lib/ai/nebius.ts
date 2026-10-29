/**
 * Nebius Token Factory adapter.
 *
 * The key is intentionally read only on the server. When credentials are not
 * configured, the demo uses a deterministic local plan so the public preview
 * still works without pretending that an external inference call succeeded.
 */
export type CopilotAction = "scout" | "tailor" | "coach" | "plan";

export interface CopilotInput {
  action: CopilotAction;
  locale?: "zh-TW" | "en";
  profile?: string;
  job?: string;
  transcript?: string;
}

export interface CopilotResult {
  provider: "nebius-token-factory" | "demo-fallback";
  model: string;
  summary: string;
  nextSteps: string[];
  evidence: string[];
}

const MODEL = process.env.NEBIUS_MODEL ?? "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B";
const BASE_URL = process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1";

function demoResult(action: CopilotAction, locale: "zh-TW" | "en"): CopilotResult {
  const results: Record<CopilotAction, CopilotResult> = {
    scout: {
      provider: "demo-fallback",
      model: "Nemotron-ready demo",
      summary: "找到 12 個值得優先研究的職缺，先從 3 個高契合、近期仍在招募的職位開始。",
      nextSteps: ["先研究 AI Platform Engineer（契合度 94%）", "查看公司近期產品與團隊訊號", "為每個職缺建立客製化版本"],
      evidence: ["技能重疊：TypeScript · Next.js · AI agents", "偏好吻合：混合辦公 · 成長型團隊", "風險提示：其中 2 個職缺未公開薪資"],
    },
    tailor: {
      provider: "demo-fallback",
      model: "Nemotron-ready demo",
      summary: "已建立一份針對目標職缺的履歷草稿，保留真實經歷，只調整排序、措辭與可驗證成果。",
      nextSteps: ["補上 2 個可量化成果", "確認關鍵字與 JD 的語境一致", "送出前預覽 ATS 風險"],
      evidence: ["JD 關鍵字覆蓋率：86%", "新增成果導向動詞：4 個", "未捏造經歷：所有建議均標註來源"],
    },
    coach: {
      provider: "demo-fallback",
      model: "Nemotron-ready demo",
      summary: "你的回答有清楚的行動描述；下一輪應把結果提前，並用數字說明影響力。",
      nextSteps: ["用 STAR 結構重錄 60 秒版本", "在開頭 15 秒先說結果", "準備一個失敗後修正的案例"],
      evidence: ["內容相關性：88", "結構清晰度：74", "可改善：結果量化、停頓節奏"],
    },
    plan: {
      provider: "demo-fallback",
      model: "Nemotron-ready demo",
      summary: "已排出今天最值得做的 3 件事，讓你在 45 分鐘內完成一次高品質投遞。",
      nextSteps: ["09:00 研究並確認職缺真實需求", "09:15 產生履歷與求職信差異版", "09:35 進行 1 題錄影面試並複盤"],
      evidence: ["依照職缺新鮮度排序", "優先處理回覆機率較高的職缺", "每一步都保留使用者確認權"],
    },
  };
  if (locale === "zh-TW") return results[action];

  const englishResults: Record<CopilotAction, CopilotResult> = {
    scout: {
      provider: "demo-fallback",
      model: "Nemotron-ready demo",
      summary: "Found 12 roles worth exploring. Start with these 3 high-match openings that are still actively hiring.",
      nextSteps: ["Review the AI Platform Engineer role (94% match)", "Check recent company, product, and team updates", "Create a tailored resume for each role"],
      evidence: ["Skill overlap: TypeScript · Next.js · AI agents", "Preference match: hybrid work · growth-stage teams", "Risk note: 2 roles do not list a salary"],
    },
    tailor: {
      provider: "demo-fallback",
      model: "Nemotron-ready demo",
      summary: "Created a resume draft for the target role. It keeps your experience truthful and only adjusts order, wording, and verifiable results.",
      nextSteps: ["Add 2 measurable achievements", "Check that keywords fit the job description", "Review ATS risks before submitting"],
      evidence: ["JD keyword coverage: 86%", "Added 4 results-focused action verbs", "No experience invented: each suggestion has a source"],
    },
    coach: {
      provider: "demo-fallback",
      model: "Nemotron-ready demo",
      summary: "Your answer clearly describes your actions. Next time, lead with the result and use numbers to show impact.",
      nextSteps: ["Record a 60-second version using the STAR format", "Share the result in the first 15 seconds", "Prepare an example of how you learned from a setback"],
      evidence: ["Content relevance: 88", "Structure clarity: 74", "Areas to improve: quantified results and pacing"],
    },
    plan: {
      provider: "demo-fallback",
      model: "Nemotron-ready demo",
      summary: "Planned the 3 most valuable tasks for today so you can complete one strong application in 45 minutes.",
      nextSteps: ["09:00 Research the role and confirm its requirements", "09:15 Create tailored resume and cover letter drafts", "09:35 Record one mock interview answer and review it"],
      evidence: ["Prioritized by job freshness", "Focused on roles with a higher chance of response", "You stay in control and approve every step"],
    },
  };

  return englishResults[action];
}

export async function runNebiusCopilot(input: CopilotInput): Promise<CopilotResult> {
  const key = process.env.NEBIUS_API_KEY;
  const locale = input.locale ?? "zh-TW";
  if (!key) return demoResult(input.action, locale);

  const prompt = [
    "You are JobSmart Copilot, a careful career agent.",
    "Never invent experience, employers, metrics, or job listings. Return concise JSON with summary, nextSteps, evidence.",
    locale === "en" ? "Respond in English." : "Respond in Traditional Chinese (Taiwan).",
    `Action: ${input.action}`,
    input.profile ? `Profile: ${input.profile}` : "",
    input.job ? `Job: ${input.job}` : "",
    input.transcript ? `Interview transcript: ${input.transcript}` : "",
  ].filter(Boolean).join("\n");

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, temperature: 0.2, messages: [{ role: "user", content: prompt }] }),
  });
  if (!response.ok) throw new Error(`Nebius inference failed (${response.status})`);
  const body = await response.json();
  const raw = body.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
  return { provider: "nebius-token-factory", model: MODEL, ...parsed };
}
