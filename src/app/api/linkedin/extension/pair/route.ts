import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { hashCompanionSecret } from "@/lib/linkedin-companion/auth";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

function cors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return response;
}

export async function OPTIONS() { return cors(new NextResponse(null, { status: 204 })); }

export async function POST(request: Request) {
  const db = getTursoClient();
  if (!db) return cors(NextResponse.json({ error: "Turso is not configured" }, { status: 503 }));
  await ensureTursoSchema();
  const body = await request.json().catch(() => ({}));
  const code = String(body.code || "").trim().toUpperCase();
  if (code.length < 16 || code.length > 32) return cors(NextResponse.json({ error: "配對碼無效或已逾期" }, { status: 400 }));
  const codeHash = hashCompanionSecret(code);
  const now = new Date().toISOString();
  const pairing = await db.execute({
    sql: "SELECT user_id FROM linkedin_companion_pairings WHERE code_hash = ? AND used_at IS NULL AND expires_at > ? LIMIT 1",
    args: [codeHash, now],
  });
  const userId = pairing.rows[0]?.user_id;
  if (!userId) return cors(NextResponse.json({ error: "配對碼無效或已逾期，請在 JobSmart 重新產生" }, { status: 400 }));
  const claimed = await db.execute({
    sql: "UPDATE linkedin_companion_pairings SET used_at = ? WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?",
    args: [now, codeHash, now],
  });
  if (claimed.rowsAffected !== 1) return cors(NextResponse.json({ error: "配對碼已使用，請重新產生" }, { status: 409 }));
  const token = randomBytes(32).toString("base64url");
  await db.execute({
    sql: "INSERT INTO linkedin_companion_tokens (id, user_id, token_hash, created_at) VALUES (?, ?, ?, ?)",
    args: [crypto.randomUUID(), String(userId), hashCompanionSecret(token), now],
  });
  return cors(NextResponse.json({ data: { token } }));
}
