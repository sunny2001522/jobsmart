import { NextResponse } from "next/server";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";
import { searchGoogle } from "@/lib/crawler/google-search";

const demoJobs = [
  { company: "Nebius", role: "AI Product Manager", url: "https://careers.nebius.com/", source: "demo", snippet: "Build AI products on open infrastructure." },
  { company: "NVIDIA", role: "Technical Product Manager, AI", url: "https://www.nvidia.com/en-us/about-nvidia/careers/", source: "demo", snippet: "Shape the next generation of accelerated computing." },
];

function normalizeSearchResult(result: { title: string; link: string; snippet: string }) {
  const match = result.title.match(/^(.+?)\s+at\s+(.+?)(?:\s+[—|-].*)?$/i);
  return {
    company: match?.[2]?.trim() || "LinkedIn 職缺",
    role: match?.[1]?.trim() || result.title,
    url: result.link,
    source: "linkedin",
    snippet: result.snippet,
  };
}

async function fetchPublicJd(url: string, fallback: string) {
  try {
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 JobSmart/1.0", Accept: "text/html, text/plain" }, signal: AbortSignal.timeout(7000) });
    if (!response.ok) return fallback;
    const html = await response.text();
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return text.length > 200 ? text.slice(0, 12000) : fallback;
  } catch { return fallback; }
}

export async function POST() {
  const db = getTursoClient(); if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  const settingsResult = await db.execute({ sql: "SELECT * FROM job_automation_settings WHERE user_id = ?", args: ["demo-user"] });
  const settings = settingsResult.rows[0]; const query = String(settings?.query || "AI product manager"); const mode = String(settings?.mode || "review") === "ask" ? "ask" : "review";
  const results = await searchGoogle(query, { site: "linkedin.com/jobs", limit: 5 });
  const jobs = results.length ? results.map(normalizeSearchResult) : demoJobs;
  const now = new Date().toISOString(); const runId = crypto.randomUUID(); let promoted = 0;
  for (const job of jobs) {
    const id = crypto.randomUUID();
    const jdText = await fetchPublicJd(job.url, job.snippet);
    await db.execute({ sql: "INSERT OR IGNORE INTO job_leads (id, user_id, company, role, url, source, snippet, status, mode, cover_letter_status, discovered_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [id, "demo-user", job.company, job.role, job.url, job.source, jdText, "queued", mode, "pending", now, now] });
    promoted++;
  }
  await db.execute({ sql: "INSERT INTO job_automation_runs (id, user_id, provider, query, discovered_count, promoted_count, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: [runId, "demo-user", results.length ? "google-linkedin" : "demo-provider", query, jobs.length, promoted, "completed", now] });
  return NextResponse.json({ data: { runId, provider: results.length ? "google-linkedin" : "demo-provider", discovered: jobs.length, promoted, mode, note: results.length ? "已透過搜尋 API 找到公開職缺結果" : "未設定搜尋 API，已使用 Demo provider 驗證流程" } });
}
