import { NextResponse } from "next/server";
import { getLocalUser } from "@/lib/auth/local";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

// Legacy status endpoint. LinkedIn cannot be connected through the official
// API here; report only the user's actual Chrome Companion pairing state.
export async function GET() {
  const user = await getLocalUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const db = getTursoClient();
  if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  const result = await db.execute({
    sql: "SELECT MAX(created_at) AS connected_at FROM linkedin_companion_tokens WHERE user_id = ? AND revoked_at IS NULL",
    args: [user.id],
  });
  const connectedAt = result.rows[0]?.connected_at ?? null;
  return NextResponse.json({ data: { provider: "linkedin", status: connectedAt ? "connected" : "disconnected", connectedAt } });
}

export async function POST() {
  return NextResponse.json({
    error: "LinkedIn OAuth 連線未提供。請使用 JobSmart LinkedIn Companion 配對外掛。",
  }, { status: 410 });
}
