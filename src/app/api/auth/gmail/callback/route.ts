/**
 * Gmail OAuth Callback 端點
 * 處理 Google OAuth 回調，儲存 tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/turso/compat";
import {
  exchangeCodeForTokens,
  saveGmailTokens,
  getOAuth2Client,
} from "@/lib/gmail/oauth";

export async function GET(request: NextRequest) {
  try {
    // 取得授權碼和 state
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    // 處理用戶拒絕授權
    if (error) {
      return NextResponse.redirect(
        new URL(`/settings?error=gmail_denied&message=${error}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings?error=gmail_invalid_callback", request.url)
      );
    }

    // 解析 state
    let stateData: {
      userId: string;
      returnUrl: string;
      timestamp: number;
    };

    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    } catch {
      return NextResponse.redirect(
        new URL("/settings?error=gmail_invalid_state", request.url)
      );
    }

    // 驗證 state 時效（10 分鐘）
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        new URL("/settings?error=gmail_state_expired", request.url)
      );
    }

    // 驗證當前用戶
    const tursoClient = await createClient();
    const {
      data: { user },
    } = await tursoClient.auth.getUser();

    if (!user || user.id !== stateData.userId) {
      return NextResponse.redirect(
        new URL("/settings?error=gmail_user_mismatch", request.url)
      );
    }

    // 交換授權碼取得 tokens
    const tokens = await exchangeCodeForTokens(code);

    if (
      !tokens.access_token ||
      !tokens.refresh_token ||
      !tokens.expiry_date
    ) {
      return NextResponse.redirect(
        new URL("/settings?error=gmail_no_tokens", request.url)
      );
    }

    // 取得用戶的 Gmail 地址
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const gmailEmail = userInfo.data.email;

    if (!gmailEmail) {
      return NextResponse.redirect(
        new URL("/settings?error=gmail_no_email", request.url)
      );
    }

    // 儲存 tokens
    await saveGmailTokens(
      user.id,
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
      },
      gmailEmail
    );

    // 重導向回設定頁面
    const returnUrl = stateData.returnUrl || "/settings";
    return NextResponse.redirect(
      new URL(`${returnUrl}?gmail_connected=true`, request.url)
    );
  } catch (error) {
    console.error("Gmail OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/settings?error=gmail_callback_failed&message=${encodeURIComponent(
          error instanceof Error ? error.message : "Unknown error"
        )}`,
        request.url
      )
    );
  }
}
