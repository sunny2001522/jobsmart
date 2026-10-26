/**
 * LINE LIFF 綁定 API
 * 將 LINE 用戶與 JobSmart 帳號綁定
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/turso/compat";
import { pushMessage } from "@/lib/line/client";
import { createBindingSuccessMessage } from "@/lib/line/messages";

const bindSchema = z.object({
  lineUserId: z.string().min(1, "LINE User ID is required"),
  displayName: z.string().optional(),
  pictureUrl: z.string().optional(),
});

/**
 * POST /api/line/liff/bind
 * 綁定 LINE 帳號
 */
export async function POST(request: NextRequest) {
  try {
    // 驗證用戶
    const tursoClient = await createClient();
    const {
      data: { user },
    } = await tursoClient.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "請先登入 JobSmart" },
        { status: 401 }
      );
    }

    // 解析請求
    const body = await request.json();
    const { lineUserId, displayName, pictureUrl } = bindSchema.parse(body);

    // 檢查是否已有綁定
    const { data: existingBinding } = await tursoClient
      .from("line_user_bindings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (existingBinding) {
      // 更新現有綁定
      const { error: updateError } = await tursoClient
        .from("line_user_bindings")
        .update({
          line_user_id: lineUserId,
          display_name: displayName || null,
          picture_url: pictureUrl || null,
          is_active: true,
          linked_at: new Date().toISOString(),
        })
        .eq("id", existingBinding.id);

      if (updateError) {
        console.error("Update binding error:", updateError);
        return NextResponse.json(
          { error: "更新綁定失敗" },
          { status: 500 }
        );
      }
    } else {
      // 檢查此 LINE 帳號是否已綁定其他用戶
      const { data: lineBinding } = await tursoClient
        .from("line_user_bindings")
        .select("*")
        .eq("line_user_id", lineUserId)
        .single();

      if (lineBinding) {
        return NextResponse.json(
          { error: "此 LINE 帳號已綁定其他用戶" },
          { status: 400 }
        );
      }

      // 建立新綁定
      const { error: insertError } = await tursoClient
        .from("line_user_bindings")
        .insert({
          user_id: user.id,
          line_user_id: lineUserId,
          display_name: displayName || null,
          picture_url: pictureUrl || null,
          is_active: true,
          notification_enabled: true,
        });

      if (insertError) {
        console.error("Insert binding error:", insertError);
        return NextResponse.json(
          { error: "建立綁定失敗" },
          { status: 500 }
        );
      }
    }

    // 推送綁定成功通知到 LINE
    try {
      const userName = user.user_metadata?.name || displayName || "用戶";
      await pushMessage(
        lineUserId,
        createBindingSuccessMessage(userName)
      );
    } catch (error) {
      console.error("Failed to push binding success message:", error);
      // 不阻斷流程
    }

    return NextResponse.json({
      success: true,
      message: "綁定成功",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "驗證錯誤" },
        { status: 400 }
      );
    }

    console.error("LIFF bind error:", error);
    return NextResponse.json(
      { error: "綁定失敗，請稍後再試" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/line/liff/bind
 * 解除 LINE 綁定
 */
export async function DELETE() {
  try {
    const tursoClient = await createClient();
    const {
      data: { user },
    } = await tursoClient.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "請先登入" },
        { status: 401 }
      );
    }

    // 停用綁定（不刪除，保留紀錄）
    const { error } = await tursoClient
      .from("line_user_bindings")
      .update({ is_active: false })
      .eq("user_id", user.id);

    if (error) {
      console.error("Unbind error:", error);
      return NextResponse.json(
        { error: "解除綁定失敗" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "已解除綁定",
    });
  } catch (error) {
    console.error("LIFF unbind error:", error);
    return NextResponse.json(
      { error: "解除綁定失敗" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/line/liff/bind
 * 取得綁定狀態
 */
export async function GET() {
  try {
    const tursoClient = await createClient();
    const {
      data: { user },
    } = await tursoClient.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "請先登入" },
        { status: 401 }
      );
    }

    const { data: binding } = await tursoClient
      .from("line_user_bindings")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    return NextResponse.json({
      connected: !!binding,
      binding: binding
        ? {
            displayName: binding.display_name,
            pictureUrl: binding.picture_url,
            linkedAt: binding.linked_at,
            notificationEnabled: binding.notification_enabled,
          }
        : null,
    });
  } catch (error) {
    console.error("Get binding status error:", error);
    return NextResponse.json(
      { error: "取得綁定狀態失敗" },
      { status: 500 }
    );
  }
}
