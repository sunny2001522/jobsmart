/**
 * LINE Webhook API
 * 接收 LINE 平台的 Webhook 事件
 */

import { NextRequest, NextResponse } from "next/server";
import { WebhookEvent, MessageEvent, TextEventMessage } from "@line/bot-sdk";
import {
  verifyLineSignature,
  replyMessage,
  getLineUserProfile,
  createTextMessage,
} from "@/lib/line/client";
import {
  createProcessingMessage,
  createBindingRequiredMessage,
  createHelpMessage,
  createErrorMessage,
} from "@/lib/line/messages";
import { enqueueJobProcess } from "@/lib/queue/qstash";
import { createClient } from "@/lib/supabase/server";
import { LineUserBinding } from "@/lib/supabase/types";

const LIFF_URL = process.env.LINE_LIFF_ID
  ? `https://liff.line.me/${process.env.LINE_LIFF_ID}`
  : null;

/**
 * 從資料庫取得 LINE 用戶綁定
 */
async function getLineUserBinding(
  lineUserId: string
): Promise<LineUserBinding | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("line_user_bindings")
    .select("*")
    .eq("line_user_id", lineUserId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as LineUserBinding;
}

/**
 * 更新最後互動時間
 */
async function updateLastInteraction(lineUserId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("line_user_bindings")
    .update({ last_interaction_at: new Date().toISOString() })
    .eq("line_user_id", lineUserId);
}

/**
 * 從文字中提取 URL
 */
function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  return text.match(urlRegex) || [];
}

/**
 * 檢查是否為幫助指令
 */
function isHelpCommand(text: string): boolean {
  const helpCommands = ["幫助", "help", "說明", "?", "？"];
  return helpCommands.includes(text.toLowerCase().trim());
}

/**
 * 處理文字訊息
 */
async function handleTextMessage(
  event: MessageEvent,
  message: TextEventMessage
): Promise<void> {
  const lineUserId = event.source.userId;
  if (!lineUserId) {
    console.error("No userId in event source");
    return;
  }

  const text = message.text;

  // 檢查是否為幫助指令
  if (isHelpCommand(text)) {
    await replyMessage(event.replyToken, createHelpMessage());
    return;
  }

  // 檢查用戶是否已綁定
  const binding = await getLineUserBinding(lineUserId);

  if (!binding) {
    // 用戶未綁定，提示綁定
    if (LIFF_URL) {
      await replyMessage(
        event.replyToken,
        createBindingRequiredMessage(LIFF_URL)
      );
    } else {
      await replyMessage(
        event.replyToken,
        createTextMessage(
          "請先在 JobSmart 網站的設定頁面連結你的 LINE 帳號"
        )
      );
    }
    return;
  }

  // 更新最後互動時間
  await updateLastInteraction(lineUserId);

  // 檢查訊息中是否包含 URL
  const urls = extractUrls(text);

  if (urls.length === 0) {
    // 沒有 URL，回覆提示
    await replyMessage(
      event.replyToken,
      createTextMessage(
        "請分享職缺連結或社群貼文，我會自動幫你追蹤！\n\n輸入「幫助」查看更多說明"
      )
    );
    return;
  }

  // 有 URL，開始處理
  // 立即回覆「處理中」訊息
  await replyMessage(event.replyToken, createProcessingMessage());

  // 推送任務到 QStash 佇列
  try {
    await enqueueJobProcess({
      jobId: `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      userId: binding.user_id,
      lineUserId: lineUserId,
      url: urls[0], // 只處理第一個 URL
      content: text,
      options: {
        autoCustomize: true,
        autoCompanyReview: true,
        autoDraftEmail: true,
      },
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to enqueue job:", error);
    // 注意：此時已經回覆「處理中」，無法再次回覆
    // 錯誤會在任務處理器中處理，並透過 pushMessage 通知用戶
  }
}

/**
 * 處理 Follow 事件（用戶加入好友）
 */
async function handleFollowEvent(event: WebhookEvent): Promise<void> {
  if (event.type !== "follow") return;

  const lineUserId = event.source.userId;
  if (!lineUserId) return;

  try {
    const profile = await getLineUserProfile(lineUserId);
    console.log(`New follower: ${profile.displayName} (${lineUserId})`);

    // 檢查是否已綁定
    const binding = await getLineUserBinding(lineUserId);

    if (binding) {
      // 已綁定，歡迎回來
      await replyMessage(
        event.replyToken,
        createTextMessage(
          `歡迎回來 ${profile.displayName}！\n\n直接分享職缺連結，我就會幫你追蹤 🚀`
        )
      );
    } else if (LIFF_URL) {
      // 未綁定，引導綁定
      await replyMessage(
        event.replyToken,
        createBindingRequiredMessage(LIFF_URL)
      );
    }
  } catch (error) {
    console.error("Error handling follow event:", error);
  }
}

/**
 * POST /api/line/webhook
 * 接收 LINE Webhook 事件
 */
export async function POST(request: NextRequest) {
  try {
    // 取得簽名和 body
    const signature = request.headers.get("x-line-signature");
    const body = await request.text();

    // 驗證簽名
    if (!signature || !verifyLineSignature(body, signature)) {
      console.error("Invalid LINE signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // 解析事件
    const { events }: { events: WebhookEvent[] } = JSON.parse(body);

    // 處理每個事件
    for (const event of events) {
      try {
        switch (event.type) {
          case "message":
            if (event.message.type === "text") {
              await handleTextMessage(
                event,
                event.message as TextEventMessage
              );
            }
            break;

          case "follow":
            await handleFollowEvent(event);
            break;

          case "unfollow":
            // 用戶取消關注，可以選擇停用綁定
            console.log(`User unfollowed: ${event.source.userId}`);
            break;

          default:
            console.log(`Unhandled event type: ${event.type}`);
        }
      } catch (error) {
        console.error(`Error processing event ${event.type}:`, error);
        // 繼續處理其他事件
      }
    }

    // LINE 要求回傳 200
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LINE Webhook error:", error);
    // 即使發生錯誤，也回傳 200 以避免 LINE 重試
    return NextResponse.json({ success: false });
  }
}

/**
 * GET /api/line/webhook
 * 用於 LINE 平台驗證 Webhook URL
 */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
