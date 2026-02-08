/**
 * LINE Messaging API 客戶端
 */

import {
  Client,
  validateSignature,
  TextMessage,
  FlexMessage,
  Message,
  Profile,
} from "@line/bot-sdk";

// LINE 配置
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

// 建立 LINE 客戶端
let lineClient: Client | null = null;

export function getLineClient(): Client {
  if (!lineClient) {
    if (!config.channelAccessToken || !config.channelSecret) {
      throw new Error(
        "Missing LINE_CHANNEL_ACCESS_TOKEN or LINE_CHANNEL_SECRET"
      );
    }
    lineClient = new Client(config);
  }
  return lineClient;
}

/**
 * 驗證 LINE Webhook 簽名
 */
export function verifyLineSignature(body: string, signature: string): boolean {
  if (!config.channelSecret) {
    console.error("LINE_CHANNEL_SECRET is not set");
    return false;
  }
  return validateSignature(body, config.channelSecret, signature);
}

/**
 * 回覆訊息
 */
export async function replyMessage(
  replyToken: string,
  messages: Message | Message[]
): Promise<void> {
  const client = getLineClient();
  const messageArray = Array.isArray(messages) ? messages : [messages];
  await client.replyMessage(replyToken, messageArray);
}

/**
 * 推送訊息給用戶
 */
export async function pushMessage(
  lineUserId: string,
  messages: Message | Message[]
): Promise<void> {
  const client = getLineClient();
  const messageArray = Array.isArray(messages) ? messages : [messages];
  await client.pushMessage(lineUserId, messageArray);
}

/**
 * 取得用戶資料
 */
export async function getLineUserProfile(lineUserId: string): Promise<Profile> {
  const client = getLineClient();
  return client.getProfile(lineUserId);
}

/**
 * 建立純文字訊息
 */
export function createTextMessage(text: string): TextMessage {
  return {
    type: "text",
    text,
  };
}

/**
 * 檢查 LINE 是否已設定
 */
export function isLineConfigured(): boolean {
  return !!(config.channelAccessToken && config.channelSecret);
}
