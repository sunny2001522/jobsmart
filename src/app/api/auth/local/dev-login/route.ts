import { NextResponse } from "next/server";
import { authenticateLocalUser, registerLocalUser, setLocalSession } from "@/lib/auth/local";

export async function POST() {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Legacy NEXT_PUBLIC_* names are accepted only on the server for migration.
  // Rename them in .env.local to DEV_AUTO_LOGIN_* before deployment.
  const email = process.env.DEV_AUTO_LOGIN_EMAIL || process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN_EMAIL;
  const password = process.env.DEV_AUTO_LOGIN_PASSWORD || process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN_PASSWORD;
  if (!email || !password) return NextResponse.json({ error: "未設定開發自動登入帳號" }, { status: 404 });
  let user = await authenticateLocalUser(email, password);
  if (!user) {
    try { user = await registerLocalUser({ email, password, displayName: process.env.DEV_AUTO_LOGIN_NAME }); }
    catch { user = await authenticateLocalUser(email, password); }
  }
  if (!user) return NextResponse.json({ error: "開發帳號登入失敗" }, { status: 401 });
  await setLocalSession(user);
  return NextResponse.json({ ok: true });
}
