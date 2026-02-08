/**
 * Gmail OAuth 工具模組
 * 處理 Gmail API 的 OAuth 2.0 認證流程
 */

import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

// Gmail OAuth 設定
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.compose", // 建立和編輯草稿
  "https://www.googleapis.com/auth/userinfo.email", // 取得用戶 email
];

// 加密金鑰（從環境變數取得）
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || "";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";

/**
 * 取得 OAuth2 客戶端
 */
export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth credentials");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * 生成 OAuth 授權 URL
 */
export function getAuthUrl(state?: string): string {
  const oauth2Client = getOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: "offline", // 需要 refresh_token
    scope: GMAIL_SCOPES,
    prompt: "consent", // 強制顯示同意頁面以取得 refresh_token
    state: state || "",
  });
}

/**
 * 使用授權碼交換 tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error("No refresh token received. Please revoke access and try again.");
  }

  return tokens;
}

/**
 * 加密 token
 */
export function encryptToken(token: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  }

  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // 格式：iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * 解密 token
 */
export function decryptToken(encryptedData: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  }

  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");
  const key = Buffer.from(ENCRYPTION_KEY, "hex");

  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * 儲存 Gmail tokens 到資料庫
 */
export async function saveGmailTokens(
  userId: string,
  tokens: {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
  },
  gmailEmail: string
) {
  const supabase = await createClient();

  // 加密 tokens
  const accessTokenEncrypted = encryptToken(tokens.access_token);
  const refreshTokenEncrypted = encryptToken(tokens.refresh_token);

  // Upsert 到資料庫
  const { error } = await supabase.from("gmail_oauth_tokens").upsert(
    {
      user_id: userId,
      access_token_encrypted: accessTokenEncrypted,
      refresh_token_encrypted: refreshTokenEncrypted,
      token_expires_at: new Date(tokens.expiry_date).toISOString(),
      gmail_email: gmailEmail,
      is_active: true,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw new Error(`Failed to save Gmail tokens: ${error.message}`);
  }

  // 更新 profile
  await supabase
    .from("profiles")
    .update({
      gmail_connected: true,
      gmail_email: gmailEmail,
    })
    .eq("id", userId);
}

/**
 * 從資料庫取得 Gmail tokens
 */
export async function getGmailTokens(userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  gmailEmail: string;
} | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gmail_oauth_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    accessToken: decryptToken(data.access_token_encrypted),
    refreshToken: decryptToken(data.refresh_token_encrypted),
    expiresAt: new Date(data.token_expires_at),
    gmailEmail: data.gmail_email,
  };
}

/**
 * 取得已認證的 Gmail API 客戶端
 */
export async function getGmailClient(userId: string) {
  const tokens = await getGmailTokens(userId);

  if (!tokens) {
    return null;
  }

  const oauth2Client = getOAuth2Client();

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiresAt.getTime(),
  });

  // 如果 token 已過期，自動刷新
  if (tokens.expiresAt.getTime() < Date.now()) {
    const { credentials } = await oauth2Client.refreshAccessToken();

    // 更新資料庫中的 token
    if (credentials.access_token && credentials.expiry_date) {
      const supabase = await createClient();
      await supabase
        .from("gmail_oauth_tokens")
        .update({
          access_token_encrypted: encryptToken(credentials.access_token),
          token_expires_at: new Date(credentials.expiry_date).toISOString(),
        })
        .eq("user_id", userId);
    }
  }

  return google.gmail({ version: "v1", auth: oauth2Client });
}

/**
 * 取得用戶的 Gmail 地址
 */
export async function getGmailEmail(userId: string): Promise<string | null> {
  const tokens = await getGmailTokens(userId);
  return tokens?.gmailEmail || null;
}

/**
 * 檢查用戶是否已連結 Gmail
 */
export async function isGmailConnected(userId: string): Promise<boolean> {
  const tokens = await getGmailTokens(userId);
  return tokens !== null;
}

/**
 * 斷開 Gmail 連結
 */
export async function disconnectGmail(userId: string): Promise<void> {
  const supabase = await createClient();

  // 刪除 token 記錄
  await supabase.from("gmail_oauth_tokens").delete().eq("user_id", userId);

  // 更新 profile
  await supabase
    .from("profiles")
    .update({
      gmail_connected: false,
      gmail_email: null,
    })
    .eq("id", userId);
}
