import OpenAI from "openai";

const url = process.argv[2];
if (!url || !/linkedin\.com\/jobs\//i.test(url)) {
  throw new Error("Usage: node scripts/test-linkedin-job.mjs <public LinkedIn job URL>");
}
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

const response = await fetch(url, {
  headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36", Accept: "text/html,application/xhtml+xml" },
});
if (!response.ok) throw new Error(`LinkedIn returned HTTP ${response.status}`);

const html = await response.text();
const text = html
  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
  .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 18000);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const completion = await openai.chat.completions.create({
  model: process.env.OPENAI_JOB_MODEL ?? "gpt-4o-mini",
  temperature: 0,
  response_format: { type: "json_object" },
  messages: [
    { role: "system", content: "Extract a job listing for a dry-run application assistant. Never invent missing facts. Return JSON only." },
    { role: "user", content: `URL: ${url}\n\nReturn {company, title, location, description, requirements, apply_url, application_method, confidence}.\nPage text:\n${text}` },
  ],
});

const job = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
console.log(JSON.stringify({
  mode: "dry-run",
  source: url,
  job,
  application: {
    status: "awaiting_user_confirmation",
    message: "已解析職缺；尚未送出申請。確認後才允許開啟 apply_url 或寄送申請資料。",
  },
}, null, 2));
