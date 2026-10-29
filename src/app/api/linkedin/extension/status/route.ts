import { NextResponse } from "next/server";
import { getLocalUser } from "@/lib/auth/local";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

export async function GET() {
  const user = await getLocalUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const db = getTursoClient();
  if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  const result = await db.execute({
    sql: "SELECT MAX(created_at) AS connected_at, MAX(last_used_at) AS last_used_at FROM linkedin_companion_tokens WHERE user_id = ? AND revoked_at IS NULL",
    args: [user.id],
  });
  const row = result.rows[0];
  return NextResponse.json({ data: { connected: Boolean(row?.connected_at), connectedAt: row?.connected_at ?? null, lastUsedAt: row?.last_used_at ?? null } });
}

export async function DELETE() {
  const user = await getLocalUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const db = getTursoClient();
  if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  await db.execute({ sql: "UPDATE linkedin_companion_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL", args: [new Date().toISOString(), user.id] });
  await db.execute({
    sql: "UPDATE linkedin_fill_tasks SET status = 'revoked', updated_at = ? WHERE user_id = ? AND status IN ('pending', 'active')",
    args: [new Date().toISOString(), user.id],
  });
  return NextResponse.json({ data: { connected: false } });
}
