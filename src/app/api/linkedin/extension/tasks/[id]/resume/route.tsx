import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ResumeTemplate } from "@/lib/pdf/resume-template";
import { getCompanionSettings, getCompanionUserId } from "@/lib/linkedin-companion/auth";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

type RouteContext = { params: Promise<{ id: string }> };

function cors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  return response;
}

export async function OPTIONS() { return cors(new NextResponse(null, { status: 204 })); }

export async function GET(request: Request, context: RouteContext) {
  const userId = await getCompanionUserId(request);
  if (!userId) return cors(NextResponse.json({ error: "外掛尚未配對或已解除配對" }, { status: 401 }));
  if (!(await getCompanionSettings(userId)).enabled) return cors(NextResponse.json({ error: "LinkedIn Companion 已停用" }, { status: 403 }));
  const { id } = await context.params;
  const db = getTursoClient();
  if (!db) return cors(NextResponse.json({ error: "Turso is not configured" }, { status: 503 }));
  await ensureTursoSchema();
  const result = await db.execute({
    sql: "SELECT payload_json FROM linkedin_fill_tasks WHERE id = ? AND user_id = ? AND status IN ('pending', 'active') AND expires_at > ? LIMIT 1",
    args: [id, userId, new Date().toISOString()],
  });
  const row = result.rows[0];
  if (!row) return cors(NextResponse.json({ error: "履歷檔案不存在或任務已逾期" }, { status: 404 }));
  try {
    const payload = JSON.parse(String(row.payload_json)) as { resumeText?: string; companyName?: string; position?: string };
    const pdf = await renderToBuffer(createElement(ResumeTemplate, { content: String(payload.resumeText || ""), title: `${payload.companyName || "JobSmart"}-${payload.position || "Resume"}` }));
    const response = new NextResponse(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=JobSmart-resume.pdf" },
    });
    return cors(response);
  } catch (error) {
    console.error("LinkedIn companion resume PDF generation failed", error);
    return cors(NextResponse.json({ error: "履歷 PDF 產生失敗，請在 LinkedIn 頁面手動附上履歷" }, { status: 500 }));
  }
}
