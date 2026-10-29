import { createHash } from "node:crypto";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

export function hashCompanionSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function getCompanionSettings(userId: string) {
  const defaults = { enabled: true, syncProfile: false, syncJobs: false };
  if (!userId) return { enabled: false, syncProfile: false, syncJobs: false };
  const db = getTursoClient();
  if (!db) return { enabled: false, syncProfile: false, syncJobs: false };
  await ensureTursoSchema();
  const result = await db.execute({
    sql: "SELECT enabled, sync_profile, sync_jobs FROM linkedin_sync_settings WHERE user_id = ?",
    args: [userId],
  });
  const row = result.rows[0];
  return row ? {
    enabled: Boolean(row.enabled),
    syncProfile: Boolean(row.sync_profile),
    syncJobs: Boolean(row.sync_jobs),
  } : defaults;
}

export async function getCompanionUserId(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return null;
  const db = getTursoClient();
  if (!db) return null;
  await ensureTursoSchema();
  const tokenHash = hashCompanionSecret(token);
  const result = await db.execute({
    sql: "SELECT id, user_id, last_used_at FROM linkedin_companion_tokens WHERE token_hash = ? AND revoked_at IS NULL LIMIT 1",
    args: [tokenHash],
  });
  const row = result.rows[0];
  if (!row) return null;
  const now = new Date();
  const lastUsedAt = row.last_used_at ? Date.parse(String(row.last_used_at)) : 0;
  if (!Number.isFinite(lastUsedAt) || now.getTime() - lastUsedAt >= 5 * 60_000) {
    await db.execute({
      sql: "UPDATE linkedin_companion_tokens SET last_used_at = ? WHERE id = ? AND revoked_at IS NULL",
      args: [now.toISOString(), String(row.id)],
    });
  }
  return String(row.user_id);
}

export function isLinkedInUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com"));
  } catch {
    return false;
  }
}

export function canonicalJobUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  url.search = "";
  return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
}
