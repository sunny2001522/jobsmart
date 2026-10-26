import { cookies } from "next/headers";
import { createHmac, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

const scrypt = promisify(nodeScrypt);
const SESSION_COOKIE = "jobsmart_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

type LocalUser = { id: string; email: string; displayName: string };

function sessionSecret() {
  return process.env.AUTH_SESSION_SECRET || (process.env.NODE_ENV === "development" ? "jobsmart-local-development-secret" : "");
}

function normalizeEmail(email: string) { return email.trim().toLowerCase(); }

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, encoded: string) {
  const [, salt, expectedHex] = encoded.split(":");
  if (!salt || !expectedHex) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

function encodeSession(user: LocalUser) {
  const secret = sessionSecret();
  if (!secret) throw new Error("AUTH_SESSION_SECRET is required");
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function decodeSession(value: string): LocalUser | null {
  try {
    const [payload, signature] = value.split(".");
    const secret = sessionSecret();
    if (!payload || !signature || !secret) return null;
    const expected = createHmac("sha256", secret).update(payload).digest("base64url");
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const user = JSON.parse(Buffer.from(payload, "base64url").toString()) as LocalUser;
    return user?.id && user?.email ? user : null;
  } catch { return null; }
}

export async function registerLocalUser(input: { email: string; password: string; displayName?: string }) {
  const db = getTursoClient();
  if (!db) throw new Error("Turso 尚未設定");
  await ensureTursoSchema();
  const email = normalizeEmail(input.email);
  const displayName = input.displayName?.trim() || email.split("@")[0];
  const existing = await db.execute({ sql: "SELECT id FROM auth_users WHERE email = ? LIMIT 1", args: [email] });
  if (existing.rows.length) throw new Error("此 Email 已註冊");
  const now = new Date().toISOString();
  const user = { id: crypto.randomUUID(), email, displayName };
  await db.execute({
    sql: "INSERT INTO auth_users (id, email, display_name, password_hash, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)",
    args: [user.id, user.email, user.displayName, await hashPassword(input.password), now, now],
  });
  return user;
}

export async function authenticateLocalUser(emailInput: string, password: string) {
  const db = getTursoClient();
  if (!db) throw new Error("Turso 尚未設定");
  await ensureTursoSchema();
  const result = await db.execute({ sql: "SELECT id, email, display_name, password_hash FROM auth_users WHERE email = ? LIMIT 1", args: [normalizeEmail(emailInput)] });
  const row = result.rows[0];
  if (!row || !(await verifyPassword(password, String(row.password_hash)))) return null;
  return { id: String(row.id), email: String(row.email), displayName: String(row.display_name || "") };
}

export async function setLocalSession(user: LocalUser) {
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession(user), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_MAX_AGE });
}

export async function clearLocalSession() { (await cookies()).delete(SESSION_COOKIE); }

export async function getLocalUser() {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value || "");
}

export { SESSION_COOKIE, decodeSession };
