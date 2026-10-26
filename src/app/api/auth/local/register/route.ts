import { NextResponse } from "next/server";
import { registerLocalUser, setLocalSession } from "@/lib/auth/local";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    if (!email || !email.includes("@") || password.length < 6) return NextResponse.json({ error: "請輸入有效 Email，密碼至少 6 個字元" }, { status: 400 });
    const user = await registerLocalUser({ email, password, displayName: String(body.name || "") });
    await setLocalSession(user);
    return NextResponse.json({ user: { email: user.email, name: user.displayName } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "註冊失敗";
    return NextResponse.json({ error: message }, { status: message.includes("已註冊") ? 409 : 500 });
  }
}
