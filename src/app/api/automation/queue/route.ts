import { NextResponse } from "next/server";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

export async function GET() {
  const db = getTursoClient(); if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  const result = await db.execute({ sql: "SELECT * FROM job_leads WHERE user_id = ? ORDER BY discovered_at DESC LIMIT 50", args: ["demo-user"] });
  return NextResponse.json({ data: result.rows });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const db = getTursoClient(); if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  if (!id) return NextResponse.json({ error: "缺少職缺 ID" }, { status: 400 });
  await ensureTursoSchema();
  await db.execute({ sql: "DELETE FROM job_leads WHERE id = ? AND user_id = ?", args: [id, "demo-user"] });
  return NextResponse.json({ data: { deleted: true } });
}
