// Dynamic JSON records are decoded into the existing domain types at this boundary.
// @ts-nocheck
import { ensureTursoSchema, getTursoClient } from "./server";
import type { InValue } from "@libsql/client";
import type {
  ApplicationStatus, CategoryStats, CompanyReview, InterviewAnswer, InterviewAnswerInsert,
  InterviewQuestion, InterviewQuestionInsert, JobApplication, JobApplicationInsert,
  JobApplicationUpdate, JobCategory, JobCategoryInsert, JobCategoryUpdate, Profile, ProfileUpdate,
  Resume, ResumeInsert, ResumeUpdate, ResumeVersion, ResumeVersionInsert, ResumeVersionUpdate,
  ValueRanking, ValueRankingInsert, VersionJobResume, VersionJobResumeUpdate, ResumeVersionWithJobs,
} from "@/lib/turso/types";
import type { InterviewExperience } from "@/types";

type AnyRecord = Record<string, unknown>;
const now = () => new Date().toISOString();

async function userId() { return "demo-user"; }

function decode(row: AnyRecord): AnyRecord {
  let data: AnyRecord = {};
  try { data = JSON.parse(String(row.data_json ?? "{}")); } catch { /* keep empty */ }
  return { ...data, id: row.id, user_id: row.user_id, status: row.status ?? data.status, category_id: row.category_id ?? data.category_id, display_order: row.display_order ?? data.display_order, created_at: row.created_at, updated_at: row.updated_at };
}

async function list(table: string, filters: Record<string, unknown> = {}, order = "updated_at DESC") {
  const db = getTursoClient(); if (!db) return [];
  await ensureTursoSchema();
  const clauses = ["1=1"]; const args: (string | number | null)[] = [];
  for (const [key, value] of Object.entries(filters)) { clauses.push(`${key} = ?`); args.push(value == null ? null : String(value)); }
  const result = await db.execute({ sql: `SELECT * FROM ${table} WHERE ${clauses.join(" AND ")} ORDER BY ${order}`, args });
  return result.rows.map((row) => decode(row as unknown as AnyRecord));
}

async function one(table: string, id: string) {
  const rows = await list(table, { id }); return rows[0] ?? null;
}

async function save(table: string, data: AnyRecord, id = String(data.id ?? crypto.randomUUID())) {
  const db = getTursoClient(); if (!db) return null;
  await ensureTursoSchema();
  const timestamp = now(); const uid = String(data.user_id ?? await userId());
  const record: AnyRecord = { ...data, id, user_id: uid, created_at: String(data.created_at ?? timestamp), updated_at: timestamp };
  if (table === "resume_versions") {
    // Keep writes compatible with the legacy resume_versions columns that are
    // still present in existing Turso databases.
    await db.execute({
      sql: `INSERT OR REPLACE INTO resume_versions
        (id, user_id, job_id, title, content_json, ats_score, status, category_id,
         display_order, created_at, updated_at, data_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        uid,
        record.job_id == null ? null : String(record.job_id),
        String(record.title ?? "履歷版本"),
        String(record.content_json ?? JSON.stringify(record.content ?? {})),
        record.ats_score == null ? null : Number(record.ats_score),
        record.status == null ? null : String(record.status),
        record.category_id == null ? null : String(record.category_id),
        Number(record.display_order ?? 0),
        String(record.created_at),
        timestamp,
        JSON.stringify(record),
      ],
    });
    return record;
  }
  const values: InValue[] = [id, uid, record.status == null ? null : String(record.status), record.category_id == null ? null : String(record.category_id), Number(record.display_order ?? 0), String(record.created_at), timestamp, JSON.stringify(record)];
  await db.execute({ sql: `INSERT OR REPLACE INTO ${table} (id, user_id, status, category_id, display_order, created_at, updated_at, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, args: values });
  return record;
}

async function patch(table: string, id: string, updates: AnyRecord) {
  const current = await one(table, id); if (!current) return null;
  return save(table, { ...current, ...updates }, id);
}

async function remove(table: string, id: string) {
  const db = getTursoClient(); if (!db) return false;
  await ensureTursoSchema(); await db.execute({ sql: `DELETE FROM ${table} WHERE id = ?`, args: [id] }); return true;
}

export async function dispatch(action: string, args: unknown[] = []): Promise<unknown> {
  const uid = await userId();
  switch (action) {
    case "getProfile": return (await list("profiles", { user_id: uid }))[0] as Profile | undefined ?? null;
    case "updateProfile": return await save("profiles", { ...(args[0] as AnyRecord), user_id: uid, id: uid }, uid) as Profile;
    case "getResumes": return await list("resumes", { user_id: uid }) as Resume[];
    case "getResume": return await one("resumes", String(args[0])) as Resume | null;
    case "createResume": return await save("resumes", { ...(args[0] as AnyRecord), user_id: uid }) as Resume;
    case "updateResume": return await patch("resumes", String(args[0]), args[1] as AnyRecord) as Resume | null;
    case "deleteResume": return await remove("resumes", String(args[0]));
    case "getJobApplications": return await list("job_applications", { user_id: uid }, "display_order ASC, updated_at DESC") as JobApplication[];
    case "getJobApplicationsByStatus": return await list("job_applications", { user_id: uid, status: String(args[0]) }) as JobApplication[];
    case "getJobApplicationsByCategory": return await list("job_applications", { user_id: uid, category_id: String(args[0]) }) as JobApplication[];
    case "createJobApplication": return await save("job_applications", { ...(args[0] as AnyRecord), user_id: uid }) as JobApplication;
    case "updateJobApplication": return await patch("job_applications", String(args[0]), args[1] as AnyRecord) as JobApplication | null;
    case "deleteJobApplication": return await remove("job_applications", String(args[0]));
    case "getApplicationStats": { const apps = await list("job_applications", { user_id: uid }); const values = apps.map((r) => String(r.status)); return { total: apps.length, wishlist: values.filter((v) => v === "wishlist").length, applied: values.filter((v) => ["editing", "applied"].includes(v)).length, interviews: values.filter((v) => v.startsWith("interview")).length, offers: values.filter((v) => ["verbal_offer", "written_offer"].includes(v)).length, rejected: values.filter((v) => ["rejected", "ghosted"].includes(v)).length }; }
    case "getRecentActivity": return (await list("job_applications", { user_id: uid }, "updated_at DESC")).slice(0, Number(args[0] ?? 5)).map((app) => ({ id: app.id, type: String(app.status).startsWith("interview") ? "interview" : ["verbal_offer", "written_offer"].includes(String(app.status)) ? "offer" : ["applied", "editing"].includes(String(app.status)) ? "applied" : "added", company: app.company_name, position: app.position, date: app.updated_at }));
    case "getInterviewQuestions": { const options = (args[0] ?? {}) as AnyRecord; let rows = await list("interview_questions", { }); if (options.category) rows = rows.filter((r) => r.category === options.category); if (options.difficulty) rows = rows.filter((r) => r.difficulty === options.difficulty); return rows as InterviewQuestion[]; }
    case "createInterviewQuestion": return await save("interview_questions", { ...(args[0] as AnyRecord), user_id: uid }) as InterviewQuestion;
    case "getInterviewAnswers": { const rows = await list("interview_answers", { user_id: uid }); return args[0] ? rows.filter((r) => r.question_id === args[0]) as InterviewAnswer[] : rows as InterviewAnswer[]; }
    case "createInterviewAnswer": return await save("interview_answers", { ...(args[0] as AnyRecord), user_id: uid }) as InterviewAnswer;
    case "getValueRanking": return (await list("value_rankings", { user_id: uid }))[0] as ValueRanking | undefined ?? null;
    case "saveValueRanking": return await save("value_rankings", { ...(args[0] as AnyRecord), user_id: uid, id: uid }, uid) as ValueRanking;
    case "getResumeVersions": return await list("resume_versions", { user_id: uid }, "display_order ASC, updated_at DESC") as ResumeVersion[];
    case "getResumeVersion": return await one("resume_versions", String(args[0])) as ResumeVersion | null;
    case "createResumeVersion": return await save("resume_versions", { ...(args[0] as AnyRecord), user_id: uid }) as ResumeVersion;
    case "updateResumeVersion": return await patch("resume_versions", String(args[0]), args[1] as AnyRecord) as ResumeVersion | null;
    case "deleteResumeVersion": return Boolean(await patch("resume_versions", String(args[0]), { is_active: false }));
    case "addJobToVersion": return await save("version_job_resumes", { version_id: args[0], job_application_id: args[1], generation_status: "pending", user_id: uid }) as VersionJobResume;
    case "removeJobFromVersion": { const rows = await list("version_job_resumes", { version_id: String(args[0]), job_application_id: String(args[1]) }); if (rows[0]) return remove("version_job_resumes", String(rows[0].id)); return true; }
    case "getVersionJobResume": { const rows = await list("version_job_resumes", { version_id: String(args[0]), job_application_id: String(args[1]) }); return rows[0] as VersionJobResume | undefined ?? null; }
    case "updateVersionJobResume": return await patch("version_job_resumes", String(args[0]), args[1] as AnyRecord) as VersionJobResume | null;
    case "getVersionJobResumes": return await list("version_job_resumes", { version_id: String(args[0]) }) as VersionJobResume[];
    case "getCustomizedResumesForJob": return await list("version_job_resumes", { job_application_id: String(args[0]) }) as VersionJobResume[];
    case "getResumeVersionWithJobs": { const version = await one("resume_versions", String(args[0])); if (!version) return null; const jobs = await list("version_job_resumes", { version_id: String(args[0]) }); return { ...version, version_job_resumes: jobs, job_count: jobs.length, completed_count: jobs.filter((j) => j.generation_status === "completed").length } as ResumeVersionWithJobs; }
    case "getJobCategories": return await list("job_categories", { user_id: uid }, "display_order ASC, created_at ASC") as JobCategory[];
    case "getJobCategory": return await one("job_categories", String(args[0])) as JobCategory | null;
    case "createJobCategory": return await save("job_categories", { ...(args[0] as AnyRecord), user_id: uid }) as JobCategory;
    case "updateJobCategory": return await patch("job_categories", String(args[0]), args[1] as AnyRecord) as JobCategory | null;
    case "deleteJobCategory": return await remove("job_categories", String(args[0]));
    case "reorderJobCategories": { for (const item of args[0] as AnyRecord[]) await patch("job_categories", String(item.id), { display_order: item.display_order }); return true; }
    case "getCategoryStats": { const rows = await list("job_applications", { user_id: uid }); const counts = new Map<string, number>(); rows.forEach((r) => r.category_id && counts.set(String(r.category_id), (counts.get(String(r.category_id)) ?? 0) + 1)); return (await list("job_categories", { user_id: uid })).map((c) => ({ ...c, application_count: counts.get(String(c.id)) ?? 0 })) as CategoryStats[]; }
    case "getCompanyReviewsByName": { const term = String(args[0] ?? "").toLowerCase(); return (await list("company_reviews", {})).filter((r) => String(r.company_name ?? "").toLowerCase().includes(term)) as CompanyReview[]; }
    case "getInterviewExperiencesByCompany": { const term = String(args[0] ?? "").toLowerCase(); return (await list("interview_experiences", {})).filter((r) => String(r.company_name ?? "").toLowerCase().includes(term)) as InterviewExperience[]; }
    case "saveInterviewExperiences": { for (const experience of (args[0] as InterviewExperience[])) await save("interview_experiences", experience as unknown as AnyRecord, experience.id); return true; }
    case "getInterviewExperienceStats": { const term = String(args[0] ?? "").toLowerCase(); const rows = (await list("interview_experiences", {})).filter((r) => String(r.company_name ?? "").toLowerCase().includes(term)); const difficulties = rows.map((r) => String(r.difficulty)).filter((d): d is "easy" | "medium" | "hard" => ["easy", "medium", "hard"].includes(d)); const avg = difficulties.length ? difficulties.reduce((sum, d) => sum + (d === "easy" ? 1 : d === "medium" ? 2 : 3), 0) / difficulties.length : 0; return { total: rows.length, offerCount: rows.filter((r) => r.outcome === "offer").length, rejectedCount: rows.filter((r) => r.outcome === "rejected").length, avgDifficulty: avg === 0 ? null : avg < 1.5 ? "easy" : avg < 2.5 ? "medium" : "hard" }; }
    default: throw new Error(`Unsupported Turso data action: ${action}`);
  }
}
