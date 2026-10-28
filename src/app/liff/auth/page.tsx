"use client";

/**
 * LIFF 登入頁面
 * 用戶在 LINE 內開啟此頁面，完成 JobSmart 帳號綁定
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/turso/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Smartphone } from "lucide-react";

type LiffState =
  | "loading"
  | "not_in_line"
  | "ready"
  | "logging_in"
  | "binding"
  | "success"
  | "error";

interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

declare global {
  interface Window {
    liff: {
      init: (config: { liffId: string }) => Promise<void>;
      isLoggedIn: () => boolean;
      login: () => void;
      getProfile: () => Promise<LiffProfile>;
      isInClient: () => boolean;
      closeWindow: () => void;
    };
  }
}

export default function LiffAuthPage() {
  const [state, setState] = useState<LiffState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [lineProfile, setLineProfile] = useState<LiffProfile | null>(null);
  const [jobsmartUser, setJobsmartUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    initLiff();
  }, []);

  async function initLiff() {
    try {
      // 載入 LIFF SDK
      if (!window.liff) {
        const script = document.createElement("script");
        script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
        script.onload = () => initLiffSdk();
        document.head.appendChild(script);
      } else {
        await initLiffSdk();
      }
    } catch (err) {
      console.error("LIFF init error:", err);
      setError("無法載入 LINE LIFF SDK");
      setState("error");
    }
  }

  async function initLiffSdk() {
    const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID;
    if (!liffId) {
      setError("LIFF ID 未設定");
      setState("error");
      return;
    }

    try {
      await window.liff.init({ liffId });

      // 檢查是否在 LINE 內開啟
      if (!window.liff.isInClient()) {
        setState("not_in_line");
        return;
      }

      // 檢查 LINE 登入狀態
      if (!window.liff.isLoggedIn()) {
        window.liff.login();
        return;
      }

      // 取得 LINE 用戶資料
      const profile = await window.liff.getProfile();
      setLineProfile(profile);
      setState("ready");
    } catch (err) {
      console.error("LIFF SDK init error:", err);
      setError("LIFF 初始化失敗");
      setState("error");
    }
  }



  async function bindAccount() {
    if (!lineProfile) {
      setError("無法取得 LINE 用戶資料");
      setState("error");
      return;
    }

    setState("binding");

    try {
      const tursoClient = createClient();
      const { data: { user } } = await tursoClient.auth.getUser();

      if (!user) {
        setError("請先登入 JobSmart");
        setState("ready");
        return;
      }

      setJobsmartUser({ email: user.email || "" });

      // 呼叫 API 綁定帳號
      const response = await fetch("/api/line/liff/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId: lineProfile.userId,
          displayName: lineProfile.displayName,
          pictureUrl: lineProfile.pictureUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "綁定失敗");
      }

      setState("success");

      // 3 秒後關閉視窗
      setTimeout(() => {
        if (window.liff.isInClient()) {
          window.liff.closeWindow();
        }
      }, 3000);
    } catch (err) {
      console.error("Bind error:", err);
      setError(err instanceof Error ? err.message : "綁定失敗");
      setState("error");
    }
  }

  // 檢查是否已登入並自動綁定
  useEffect(() => {
    if (state === "ready" && lineProfile) {
      checkAndBind();
    }
  }, [state, lineProfile]);

  async function checkAndBind() {
    const tursoClient = createClient();
    const { data: { user } } = await tursoClient.auth.getUser();

    if (user) {
      setJobsmartUser({ email: user.email || "" });
      await bindAccount();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">連結 JobSmart</CardTitle>
          <CardDescription>
            連結你的 LINE 帳號以使用職缺追蹤功能
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Loading */}
          {state === "loading" && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              <p className="mt-4 text-sm text-muted-foreground">載入中...</p>
            </div>
          )}

          {/* Not in LINE */}
          {state === "not_in_line" && (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 text-amber-500 mx-auto" />
              <p className="mt-4 text-sm text-muted-foreground">
                請在 LINE App 中開啟此頁面
              </p>
            </div>
          )}

          {/* Ready to login */}
          {state === "ready" && lineProfile && !jobsmartUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                {lineProfile.pictureUrl && (
                  <img
                    src={lineProfile.pictureUrl}
                    alt={lineProfile.displayName}
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">{lineProfile.displayName}</p>
                  <p className="text-sm text-muted-foreground">LINE 帳號</p>
                </div>
              </div>

              <p className="text-sm text-center text-muted-foreground">
                Account linking is temporarily unavailable. Please try again later.
              </p>
            </div>
          )}

          {/* Logging in */}
          {state === "logging_in" && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              <p className="mt-4 text-sm text-muted-foreground">正在登入...</p>
            </div>
          )}

          {/* Binding */}
          {state === "binding" && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              <p className="mt-4 text-sm text-muted-foreground">正在連結帳號...</p>
            </div>
          )}

          {/* Success */}
          {state === "success" && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h3 className="mt-4 text-lg font-semibold text-green-700">連結成功！</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                你可以回到 LINE 聊天室，直接分享職缺連結開始使用
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                此視窗將在 3 秒後關閉...
              </p>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 text-red-500 mx-auto" />
              <p className="mt-4 text-sm text-red-600">{error}</p>
              <Button
                onClick={() => {
                  setError(null);
                  setState("loading");
                  initLiff();
                }}
                variant="outline"
                className="mt-4"
              >
                重試
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
