import { load } from "cheerio";
import { searchGoogle, hasGoogleSearchCredentials } from "@/lib/crawler/google-search";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

export const JOB_SEARCH_SOURCES = {
  linkedin: { label: "LinkedIn", site: "linkedin.com/jobs", host: /(^|\.)linkedin\.com$/i },
  indeed: { label: "Indeed", site: "indeed.com", host: /(^|\.)indeed\.com$/i },
  cake: { label: "Cake", site: "cake.me", host: /(^|\.)cake\.me$/i },
  "104": { label: "104 人力銀行", site: "104.com.tw", host: /(^|\.)104\.com\.tw$/i },
} as const;

export type JobSearchSource = keyof typeof JOB_SEARCH_SOURCES;
export type JobSearchSettings = { query: string; sources: JobSearchSource[]; mode?: string; frequency?: string };
type SearchResult = { title: string; link: string; snippet: string; displayLink: string };

function normalizeResult(result: SearchResult, source: JobSearchSource) {
  let url: URL;
  try { url = new URL(result.link); } catch { return null; }
  if (url.protocol !== "https:" || !JOB_SEARCH_SOURCES[source].host.test(url.hostname)) return null;
  if (source === "linkedin" && !url.pathname.startsWith("/jobs/")) return null;
  const match = result.title.match(/^(.+?)\s+at\s+(.+?)(?:\s+[—|-].*)?$/i);
  const titleParts = result.title.split(/\s+[|—–-]\s+/).map((part) => part.trim()).filter(Boolean);
  return {
    company: match?.[2]?.trim() || "公司與職稱待確認",
    role: match?.[1]?.trim() || titleParts[0] || result.title,
    url: result.link,
    source,
    snippet: result.snippet,
  };
}

export async function searchPublicJobLeads(query: string, sources: JobSearchSource[]) {
  if (!hasGoogleSearchCredentials()) throw new Error("尚未設定 Google Custom Search；請先設定搜尋服務後再找職缺。");
  const safeQuery = query.trim().slice(0, 200);
  if (safeQuery.length < 2) throw new Error("請設定至少 2 個字的職缺搜尋條件。");
  const selectedSources = [...new Set(sources)].filter((source): source is JobSearchSource => source in JOB_SEARCH_SOURCES);
  if (!selectedSources.length) throw new Error("至少選擇一個職缺來源。");

  const batches = await Promise.all(selectedSources.map(async (source) => {
    const config = JOB_SEARCH_SOURCES[source];
    return (await searchGoogle(safeQuery, { site: config.site, limit: Math.max(2, Math.ceil(10 / selectedSources.length)), throwOnError: true }))
      .map((result) => normalizeResult(result, source))
      .filter((job): job is NonNullable<typeof job> => Boolean(job));
  }));
  const unique = new Map<string, (typeof batches)[number][number]>();
  for (const job of batches.flat()) if (!unique.has(job.url)) unique.set(job.url, job);
  return [...unique.values()].slice(0, 10);
}

export async function fetchPublicJobDescription(url: string, fallback: string) {
  try {
    const target = new URL(url);
    const isConfiguredSource = target.protocol === "https:" && Object.values(JOB_SEARCH_SOURCES).some((source) => source.host.test(target.hostname));
    if (!isConfiguredSource) return fallback;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 JobSmart/1.0", Accept: "text/html, text/plain" },
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return fallback;
    const html = await response.text();
    const $ = load(html);
    $("script, style, noscript, svg, nav, footer, header").remove();
    const text = ($("main").text() || $("body").text()).replace(/\s+/g, " ").trim();
    if (text.length < 200 || /sign in to linkedin|加入領英|登入.*LinkedIn/i.test(text.slice(0, 2000))) return fallback;
    return text.slice(0, 12000);
  } catch {
    return fallback;
  }
}

export async function executeJobSearchForUser(userId: string, settings: JobSearchSettings) {
  const db = getTursoClient();
  if (!db) throw new Error("Turso is not configured");
  await ensureTursoSchema();
  const jobs = await searchPublicJobLeads(settings.query, settings.sources);
  const [leadsResult, applicationsResult] = await Promise.all([
    db.execute({ sql: "SELECT url FROM job_leads WHERE user_id = ? AND url IS NOT NULL", args: [userId] }),
    db.execute({ sql: "SELECT data_json FROM job_applications WHERE user_id = ?", args: [userId] }),
  ]);
  const knownUrls = new Set<string>(leadsResult.rows.map((row) => String(row.url)));
  for (const row of applicationsResult.rows) {
    try {
      const application = JSON.parse(String(row.data_json || "{}")) as { jd_url?: string };
      if (application.jd_url) knownUrls.add(application.jd_url);
    } catch { /* ignore malformed legacy records */ }
  }

  const now = new Date().toISOString();
  const newJobs = jobs.filter((job) => {
    if (knownUrls.has(job.url)) return false;
    knownUrls.add(job.url);
    return true;
  });
  const preparedLeads = await Promise.all(newJobs.map(async (job) => ({
    job,
    snippet: await fetchPublicJobDescription(job.url, job.snippet),
  })));
  if (preparedLeads.length) {
    await db.batch(preparedLeads.map(({ job, snippet }) => ({
      sql: `INSERT INTO job_leads (id, user_id, company, role, url, source, snippet, status, mode, cover_letter_status, discovered_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?, 'pending', ?, ?)`,
      args: [crypto.randomUUID(), userId, job.company, job.role, job.url, job.source, snippet, settings.mode === "ask" ? "ask" : "review", now, now],
    })), "write");
  }
  const promoted = preparedLeads.length;
  const runId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO job_automation_runs (id, user_id, provider, query, discovered_count, promoted_count, status, created_at)
          VALUES (?, ?, 'google-custom-search', ?, ?, ?, 'completed', ?)` ,
    args: [runId, userId, settings.query, jobs.length, promoted, now],
  });
  return { runId, provider: "google-custom-search", discovered: jobs.length, promoted };
}
