import { NextResponse } from "next/server";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

export async function GET() {
  const db = getTursoClient(); if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema(); const r = await db.execute({ sql: "SELECT * FROM external_connections WHERE user_id = ? AND provider = ?", args: ["demo-user", "linkedin"] });
  return NextResponse.json({ data: r.rows[0] || { provider: "linkedin", status: "disconnected", account_label: null } });
}

export async function POST(request: Request) {
  const body = await request.json(); const status = body.status === "connected" ? "connected" : "disconnected";
  const db = getTursoClient(); if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema(); const now = new Date().toISOString();
  await db.execute({ sql: "INSERT OR REPLACE INTO external_connections (user_id, provider, status, account_label, scopes_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)", args: ["demo-user", "linkedin", status, body.accountLabel || null, JSON.stringify(status === "connected" ? ["profile:read", "job:review"] : []), now] });
  return NextResponse.json({ data: { provider: "linkedin", status, accountLabel: body.accountLabel || null, updatedAt: now } });
}
