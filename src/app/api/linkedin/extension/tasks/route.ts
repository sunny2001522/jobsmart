import { NextResponse } from "next/server";
import { getLocalUser } from "@/lib/auth/local";
import { canonicalJobUrl, getCompanionSettings, getCompanionUserId, isLinkedInUrl } from "@/lib/linkedin-companion/auth";
import { dispatch } from "@/lib/turso/repository";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

function cors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return response;
}

export async function OPTIONS() { return cors(new NextResponse(null, { status: 204 })); }

export async function GET(request: Request) {
  const userId = await getCompanionUserId(request);
  if (!userId) return cors(NextResponse.json({ error: "外掛尚未配對或已解除配對" }, { status: 401 }));
  const rawUrl = new URL(request.url).searchParams.get("url") || "";
  if (!isLinkedInUrl(rawUrl)) return cors(NextResponse.json({ error: "只支援 LinkedIn 職缺頁面" }, { status: 400 }));
  if (!(await getCompanionSettings(userId)).enabled) return cors(NextResponse.json({ error: "LinkedIn Companion 已停用" }, { status: 403 }));
  const db = getTursoClient();
  if (!db) return cors(NextResponse.json({ error: "Turso is not configured" }, { status: 503 }));
  await ensureTursoSchema();
  const url = canonicalJobUrl(rawUrl);
  const now = new Date().toISOString();
  const result = await db.execute({
    sql: "SELECT id, application_id, payload_json FROM linkedin_fill_tasks WHERE user_id = ? AND job_url = ? AND status IN ('pending', 'active') AND expires_at > ? ORDER BY created_at DESC LIMIT 3",
    args: [userId, url, now],
  });
  const tasks = result.rows.map((row) => {
    let payload: Record<string, unknown> = {};
    try { payload = JSON.parse(String(row.payload_json || "{}")); } catch { /* ignore invalid task data */ }
    return { id: String(row.id), companyName: String(payload.companyName || ""), position: String(payload.position || "") };
  });
  return cors(NextResponse.json({ data: tasks }));
}

export async function POST(request: Request) {
  const user = await getLocalUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (!(await getCompanionSettings(user.id)).enabled) return NextResponse.json({ error: "請先在 LinkedIn 外掛設定中啟用 Companion" }, { status: 409 });
  const body = await request.json().catch(() => ({}));
  if (body.approved !== true) return NextResponse.json({ error: "請先確認並授權外掛填表" }, { status: 400 });
  const db = getTursoClient();
  if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  const appId = String(body.applicationId || "");
  const applications = await dispatch("getJobApplications") as Array<Record<string, unknown>>;
  const application = applications.find((item) => String(item.id) === appId);
  if (!application) return NextResponse.json({ error: "找不到這份應徵資料" }, { status: 404 });
  if (application.status !== "editing" || application.applied_at) return NextResponse.json({ error: "只有尚未投遞的編輯中職缺能建立填表任務" }, { status: 409 });
  const jobUrl = String(application.jd_url || "");
  if (!isLinkedInUrl(jobUrl)) return NextResponse.json({ error: "只有 LinkedIn 職缺能交給 Companion 填表" }, { status: 400 });
  const activeToken = await db.execute({ sql: "SELECT id FROM linkedin_companion_tokens WHERE user_id = ? AND revoked_at IS NULL LIMIT 1", args: [user.id] });
  if (!activeToken.rows.length) return NextResponse.json({ error: "請先到 LinkedIn 設定配對 Chrome 外掛" }, { status: 409 });

  const versionId = String(application.resume_version_id || "");
  const relation = versionId ? await dispatch("getVersionJobResume", [versionId, appId]) as Record<string, unknown> | null : null;
  const resumeText = String(relation?.customized_plain_text || "").trim();
  const coverLetter = application.cover_letter && typeof application.cover_letter === "object"
    ? application.cover_letter as Record<string, unknown>
    : null;
  if (!resumeText || !coverLetter?.body) return NextResponse.json({ error: "請先產生並儲存客製履歷與求職信" }, { status: 400 });

  const profile = await dispatch("getProfile") as Record<string, unknown> | null;
  const payload = {
    applicationId: appId,
    companyName: String(application.company_name || ""),
    position: String(application.position || ""),
    jobUrl: canonicalJobUrl(jobUrl),
    resumeText,
    coverLetter: { subject: String(coverLetter.subject || ""), body: String(coverLetter.body || ""), attachmentNote: String(coverLetter.attachmentNote || "") },
    applicant: { name: String(profile?.name || user.displayName), email: user.email, phone: String(profile?.phone || ""), linkedinUrl: String(profile?.linkedin_url || "") },
  };
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 2 * 60 * 60_000).toISOString();
  const taskId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO linkedin_fill_tasks (id, user_id, application_id, job_url, payload_json, status, created_at, updated_at, expires_at)
          VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    args: [taskId, user.id, appId, payload.jobUrl, JSON.stringify(payload), createdAt, createdAt, expiresAt],
  });
  await dispatch("updateJobApplication", [appId, { resume_status: "approved", cover_letter_status: "approved" }]);
  return NextResponse.json({ data: { taskId, jobUrl: payload.jobUrl, expiresAt } });
}
