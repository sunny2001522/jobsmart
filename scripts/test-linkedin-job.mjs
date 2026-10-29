const url = process.argv[2];
if (!url || !/linkedin\.com\/jobs\//i.test(url)) {
  throw new Error("Usage: node scripts/test-linkedin-job.mjs <public LinkedIn job URL>");
}
if (!process.env.NEBIUS_API_KEY) throw new Error("NEBIUS_API_KEY is not configured");

const linkedinResponse = await fetch(url, {
  headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36", Accept: "text/html,application/xhtml+xml" },
});
if (!linkedinResponse.ok) throw new Error(`LinkedIn returned HTTP ${linkedinResponse.status}`);

const html = await linkedinResponse.text();
const text = html
  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
  .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 18000);

const baseUrl = (process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1").replace(/\/$/, "");
const nebiusResponse = await fetch(`${baseUrl}/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEBIUS_API_KEY}` },
  body: JSON.stringify({
    model: process.env.NEBIUS_MODEL ?? "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
    temperature: 0,
    messages: [
      { role: "system", content: "Extract a job listing for a dry-run application assistant. Never invent missing facts. Return JSON only." },
      { role: "user", content: `URL: ${url}\n\nReturn {company, title, location, description, requirements, apply_url, application_method, confidence}.\nPage text:\n${text}` },
    ],
  }),
});
if (!nebiusResponse.ok) throw new Error(`Nebius request failed (${nebiusResponse.status})`);
const completion = await nebiusResponse.json();

const job = JSON.parse(completion.choices?.[0]?.message?.content ?? "{}");
console.log(JSON.stringify({
  mode: "dry-run",
  source: url,
  job,
  application: {
    status: "awaiting_user_confirmation",
    message: "已解析職缺；尚未送出申請。確認後才允許開啟 apply_url 或寄送申請資料。",
  },
}, null, 2));
