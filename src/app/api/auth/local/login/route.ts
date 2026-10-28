import { NextResponse } from "next/server";
import { authenticateLocalUser, setLocalSession } from "@/lib/auth/local";

export async function POST(request: Request) {
  let isEnglish = false;
  try {
    const body = await request.json();
    isEnglish = body.locale === "en";
    const user = await authenticateLocalUser(String(body.email || ""), String(body.password || ""));
    if (!user) return NextResponse.json({ error: isEnglish ? "Email or password is incorrect" : "Email 或密碼不正確" }, { status: 401 });
    await setLocalSession(user);
    return NextResponse.json({ user: { email: user.email, name: user.displayName } });
  } catch {
    return NextResponse.json({ error: isEnglish ? "Sign in failed. Please try again." : "登入失敗，請稍後再試" }, { status: 500 });
  }
}
