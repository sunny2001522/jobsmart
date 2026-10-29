import { NextResponse } from "next/server";
import { getCompanionSettings, getCompanionUserId } from "@/lib/linkedin-companion/auth";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

type RouteContext = { params: Promise<{ id: string }> };

function cors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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
  if (!row) return cors(NextResponse.json({ error: "填表任務不存在或已逾期" }, { status: 404 }));
  try { return cors(NextResponse.json({ data: JSON.parse(String(row.payload_json)) })); }
  catch { return cors(NextResponse.json({ error: "填表資料格式錯誤" }, { status: 500 })); }
}

export async function POST(request: Request, context: RouteContext) {
  const userId = await getCompanionUserId(request);
  if (!userId) return cors(NextResponse.json({ error: "外掛尚未配對或已解除配對" }, { status: 401 }));
  if (!(await getCompanionSettings(userId)).enabled) return cors(NextResponse.json({ error: "LinkedIn Companion 已停用" }, { status: 403 }));
  const { id } = await context.params;
  const db = getTursoClient();
  if (!db) return cors(NextResponse.json({ error: "Turso is not configured" }, { status: 503 }));
  await ensureTursoSchema();
  const updated = await db.execute({
    sql: "UPDATE linkedin_fill_tasks SET status = 'active', updated_at = ? WHERE id = ? AND user_id = ? AND status IN ('pending', 'active') AND expires_at > ?",
    args: [new Date().toISOString(), id, userId, new Date().toISOString()],
  });
  if (!updated.rowsAffected) return cors(NextResponse.json({ error: "填表任務不存在或已逾期" }, { status: 404 }));
  return cors(NextResponse.json({ data: { active: true } }));
}
