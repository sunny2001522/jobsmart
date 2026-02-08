/**
 * Upstash QStash 客戶端
 * 用於處理長時間運行的任務（如職缺解析、爬蟲等）
 */

import { Client, Receiver } from "@upstash/qstash";
import { ProcessJobPayload } from "@/lib/supabase/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// QStash 客戶端（單例）
let qstashClient: Client | null = null;

/**
 * 取得 QStash 客戶端
 */
export function getQStashClient(): Client {
  if (!qstashClient) {
    const token = process.env.QSTASH_TOKEN;
    if (!token) {
      throw new Error("Missing QSTASH_TOKEN");
    }
    qstashClient = new Client({ token });
  }
  return qstashClient;
}

/**
 * 驗證 QStash 請求簽名
 */
export async function verifyQStashSignature(
  signature: string,
  body: string
): Promise<boolean> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentSigningKey || !nextSigningKey) {
    console.error("Missing QStash signing keys");
    return false;
  }

  const receiver = new Receiver({
    currentSigningKey,
    nextSigningKey,
  });

  try {
    await receiver.verify({
      signature,
      body,
    });
    return true;
  } catch (error) {
    console.error("QStash signature verification failed:", error);
    return false;
  }
}

/**
 * 將職缺處理任務推送到佇列
 */
export async function enqueueJobProcess(
  payload: ProcessJobPayload
): Promise<string> {
  const client = getQStashClient();

  const result = await client.publishJSON({
    url: `${APP_URL}/api/jobs/process`,
    body: payload,
    retries: 3,
    // 設定延遲，避免立即處理（給 LINE 回覆時間）
    delay: 1,
  });

  console.log(`Job enqueued: ${payload.jobId}, messageId: ${result.messageId}`);
  return result.messageId;
}

/**
 * 檢查 QStash 是否已設定
 */
export function isQStashConfigured(): boolean {
  return !!(
    process.env.QSTASH_TOKEN &&
    process.env.QSTASH_CURRENT_SIGNING_KEY &&
    process.env.QSTASH_NEXT_SIGNING_KEY
  );
}
