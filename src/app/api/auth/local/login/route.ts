import { NextResponse } from "next/server";
import { authenticateLocalUser, setLocalSession } from "@/lib/auth/local";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await authenticateLocalUser(String(body.email || ""), String(body.password || ""));
    if (!user) return NextResponse.json({ error: "Email 或密碼不正確" }, { status: 401 });
    await setLocalSession(user);
    return NextResponse.json({ user: { email: user.email, name: user.displayName } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "登入失敗" }, { status: 500 }); }
}
