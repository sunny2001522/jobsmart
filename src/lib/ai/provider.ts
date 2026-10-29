import { GoogleGenerativeAI } from "@google/generative-ai";

export type AIProvider = "nebius" | "gemini" | "openai";

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

/**
 * Server-only model routing. Nebius remains the default for backwards
 * compatibility; any OpenAI-compatible endpoint can be selected with AI_*.
 */
export function getAIProviderConfig(): AIProviderConfig {
  const provider = process.env.AI_PROVIDER === "gemini"
    ? "gemini"
    : process.env.AI_PROVIDER === "openai"
      ? "openai"
      : "nebius";
  const isNebius = provider === "nebius";
  const isGemini = provider === "gemini";
  return {
    provider,
    apiKey: process.env.AI_API_KEY
      || (isNebius ? process.env.NEBIUS_API_KEY : "")
      || (isGemini ? process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY : "")
      || (provider === "openai" ? process.env.OPENAI_API_KEY : "")
      || "",
    baseUrl: (process.env.AI_BASE_URL || (isNebius ? process.env.NEBIUS_BASE_URL : "") || "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.AI_MODEL
      || (isNebius ? process.env.NEBIUS_MODEL : "")
      || (isGemini ? process.env.GOOGLE_AI_MODEL || process.env.GEMINI_MODEL : "")
      || (provider === "openai" ? process.env.OPENAI_MODEL || "gpt-4o-mini" : "gemini-2.5-flash"),
  };
}

export async function callConfiguredChat(
  prompt: string,
  options?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    json?: boolean;
    signal?: AbortSignal;
  }
) {
  const config = getAIProviderConfig();
  if (!config.apiKey) {
    const keyName = config.provider === "nebius" ? "NEBIUS_API_KEY" : config.provider === "gemini" ? "GOOGLE_AI_API_KEY" : "OPENAI_API_KEY";
    throw new Error(`${keyName} is not set`);
  }

  if (config.provider === "gemini") {
    const gemini = new GoogleGenerativeAI(config.apiKey);
    const model = gemini.getGenerativeModel({
      model: config.model,
      ...(options?.systemPrompt ? { systemInstruction: options.systemPrompt } : {}),
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 2048,
        ...(options?.json ? { responseMimeType: "application/json" } : {}),
      },
    });
    const result = await model.generateContent(options?.systemPrompt ? prompt : prompt);
    const text = result.response.text();
    if (!text.trim()) throw new Error("Gemini returned an empty response");
    const usage = result.response.usageMetadata;
    return {
      text,
      model: config.model,
      provider: config.provider,
      usage: {
        input: usage?.promptTokenCount ?? 0,
        output: usage?.candidatesTokenCount ?? 0,
      },
    };
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        ...(options?.systemPrompt ? [{ role: "system", content: options.systemPrompt }] : []),
        { role: "user", content: prompt },
      ],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      ...(options?.json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: options?.signal ?? AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`${config.provider === "nebius" ? "Nebius" : "OpenAI"} authentication failed`);
    }
    throw new Error(`${config.provider === "nebius" ? "Nebius" : "OpenAI"} inference failed (${response.status})`);
  }

  const body = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = body.choices?.[0]?.message?.content;
  if (!text?.trim()) throw new Error(`${config.provider === "nebius" ? "Nebius" : "OpenAI"} returned an empty response`);

  return {
    text,
    model: config.model,
    provider: config.provider,
    usage: {
      input: body.usage?.prompt_tokens ?? 0,
      output: body.usage?.completion_tokens ?? 0,
    },
  };
}
