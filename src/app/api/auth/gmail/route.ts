/**
 * Gmail OAuth 初始化端點
 * 重導向到 Google OAuth 同意頁面
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/turso/compat";
import { getAuthUrl } from "@/lib/gmail/oauth";

export async function GET(request: NextRequest) {
  try {
    // 驗證用戶
    const tursoClient = await createClient();
    const {
      data: { user },
    } = await tursoClient.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/login?redirect=/settings", request.url)
      );
    }

    // 取得 return URL
    const returnUrl = request.nextUrl.searchParams.get("return") || "/settings";

    // 生成 state（用於驗證回調）
    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        returnUrl,
        timestamp: Date.now(),
      })
    ).toString("base64url");

    // 生成授權 URL
    const authUrl = getAuthUrl(state);

    // 重導向到 Google
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Gmail OAuth init error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=gmail_auth_failed", request.url)
    );
  }
}
