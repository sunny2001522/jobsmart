import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getLocalUser } from "@/lib/auth/local";
import { hashCompanionSecret } from "@/lib/linkedin-companion/auth";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

export async function POST() {
  const user = await getLocalUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const db = getTursoClient();
  if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
  await ensureTursoSchema();
  const code = randomBytes(16).toString("base64url").slice(0, 20).toUpperCase();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60_000).toISOString();
  await db.execute({ sql: "UPDATE linkedin_companion_pairings SET used_at = ? WHERE user_id = ? AND used_at IS NULL", args: [now.toISOString(), user.id] });
  await db.execute({ sql: "INSERT INTO linkedin_companion_pairings (code_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)", args: [hashCompanionSecret(code), user.id, expiresAt, now.toISOString()] });
  return NextResponse.json({ data: { code, expiresAt } });
}
