"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User,
  CreditCard,
  Bell,
  Shield,
  Sparkles,
  LogOut,
  Save,
  Loader2,
  Check,
  Zap,
  Smartphone,
  Mail,
  ExternalLink,
  Link2,
  Unlink,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getProfile, updateProfile } from "@/lib/supabase/db";
import type { Profile } from "@/lib/supabase/types";

// 擴展 Profile 類型以包含 Gmail 相關欄位
interface ProfileWithGmail extends Profile {
  gmail_connected?: boolean;
  gmail_email?: string | null;
}

// 主要設定頁面內容組件（使用 useSearchParams）
function SettingsContent() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<ProfileWithGmail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [gmailJustConnected, setGmailJustConnected] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [interviewReminders, setInterviewReminders] = useState(true);

  // Webhook settings
  const [autoCustomize, setAutoCustomize] = useState(true);
  const [autoCompanyReview, setAutoCompanyReview] = useState(true);
  const [autoDraftEmail, setAutoDraftEmail] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const data = await getProfile();
      if (data) {
        setProfile(data as ProfileWithGmail);
        setName(data.name || "");
      }
      setIsLoading(false);
    };

    fetchProfile();

    // 檢查是否剛連結 Gmail
    if (searchParams.get("gmail_connected") === "true") {
      setGmailJustConnected(true);
      setTimeout(() => setGmailJustConnected(false), 5000);
    }
  }, [searchParams]);

  const handleSaveProfile = async () => {
    if (!profile) return;

    setIsSaving(true);
    setSaveSuccess(false);

    const updated = await updateProfile({ name });
    if (updated) {
      setProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }

    setIsSaving(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const aiCreditsPercentage = profile
    ? (profile.ai_credits_remaining / 100) * 100
    : 0;

  const subscriptionLabels = {
    free: "免費方案",
    pro: "Pro 方案",
    enterprise: "企業方案",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-muted-foreground">
          管理你的帳戶設定和偏好
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            個人資料
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <CreditCard className="h-4 w-4 mr-2" />
            訂閱方案
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            通知設定
          </TabsTrigger>
          <TabsTrigger value="mobile">
            <Smartphone className="h-4 w-4 mr-2" />
            行動版整合
          </TabsTrigger>
        </TabsList>

        {/* 個人資料 */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>個人資料</CardTitle>
              <CardDescription>
                更新你的個人資訊
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email 無法變更
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">姓名</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="輸入你的姓名"
                    />
                  </div>

                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : saveSuccess ? (
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isSaving ? "儲存中..." : saveSuccess ? "已儲存" : "儲存變更"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>帳戶安全</CardTitle>
              <CardDescription>
                管理你的帳戶安全設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">登出帳戶</p>
                  <p className="text-sm text-muted-foreground">
                    登出目前的裝置
                  </p>
                </div>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  登出
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 訂閱方案 */}
        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                目前方案
                {profile && (
                  <Badge variant={profile.subscription_tier === "free" ? "secondary" : "default"}>
                    {subscriptionLabels[profile.subscription_tier]}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                管理你的訂閱和 AI 使用額度
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <>
                  {/* AI 額度 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="font-medium">AI 使用額度</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {profile?.ai_credits_remaining} / 100 點
                      </span>
                    </div>
                    <Progress value={aiCreditsPercentage} />
                    <p className="text-xs text-muted-foreground">
                      每月重置，用於 AI 優化、JD 分析、面試評分等功能
                    </p>
                  </div>

                  {/* 使用統計 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">本月 JD 分析</p>
                      <p className="text-2xl font-bold">{profile?.monthly_jd_count || 0}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">本月公司查詢</p>
                      <p className="text-2xl font-bold">{profile?.monthly_crawl_count || 0}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 升級方案 */}
          {profile?.subscription_tier === "free" && (
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  升級到 Pro
                </CardTitle>
                <CardDescription>
                  解鎖更多 AI 功能和使用額度
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    每月 500 AI 使用額度
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    無限 JD 分析次數
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    GPT-4 深度優化
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    優先客服支援
                  </li>
                </ul>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg">$9.99 / 月</p>
                    <p className="text-sm text-muted-foreground">年繳享 8 折優惠</p>
                  </div>
                  <Button>
                    升級方案
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 通知設定 */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>通知偏好</CardTitle>
              <CardDescription>
                選擇你想要接收的通知類型
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Email 通知</p>
                  <p className="text-sm text-muted-foreground">
                    接收重要更新和提醒的 Email
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">每週摘要</p>
                  <p className="text-sm text-muted-foreground">
                    每週一封求職進度摘要 Email
                  </p>
                </div>
                <Switch
                  checked={weeklyDigest}
                  onCheckedChange={setWeeklyDigest}
                  disabled={!emailNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">面試提醒</p>
                  <p className="text-sm text-muted-foreground">
                    面試前一天收到提醒
                  </p>
                </div>
                <Switch
                  checked={interviewReminders}
                  onCheckedChange={setInterviewReminders}
                  disabled={!emailNotifications}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>隱私設定</CardTitle>
              <CardDescription>
                控制你的資料隱私
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>你的資料使用 AES-256 加密儲存</span>
              </div>

              <p className="text-sm text-muted-foreground">
                我們絕不會將你的個人資料分享給第三方。你的履歷和求職記錄僅供你本人使用。
              </p>

              <Button variant="outline" size="sm">
                下載我的資料
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 行動版整合 */}
        <TabsContent value="mobile" className="space-y-6">
          {gmailJustConnected && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                Gmail 已成功連結！現在可以自動建立求職信草稿了。
              </AlertDescription>
            </Alert>
          )}

          {/* Apple 捷徑 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Apple 捷徑
              </CardTitle>
              <CardDescription>
                在手機上分享職缺連結，自動完成追蹤和履歷客製化
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <h4 className="font-medium">使用方式</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>下載並安裝 Apple 捷徑</li>
                  <li>在 Safari 或任何 App 中看到職缺連結</li>
                  <li>點擊「分享」→ 選擇「JobSmart 快速追蹤」</li>
                  <li>系統會自動解析、查評價、客製化履歷</li>
                </ol>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" asChild>
                  <a
                    href="https://www.icloud.com/shortcuts/YOUR_SHORTCUT_ID"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    下載捷徑
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href="https://support.apple.com/zh-tw/guide/shortcuts/welcome/ios"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    說明文件
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Gmail 連結 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Gmail 連結
                {profile?.gmail_connected && (
                  <Badge variant="secondary" className="ml-2">
                    <Check className="h-3 w-3 mr-1" />
                    已連結
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                連結 Gmail 後，系統可自動建立求職信草稿
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile?.gmail_connected ? (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{profile.gmail_email}</p>
                        <p className="text-sm text-muted-foreground">
                          已連結的 Gmail 帳戶
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        // TODO: 實作斷開連結
                        if (confirm("確定要斷開 Gmail 連結嗎？")) {
                          const response = await fetch("/api/auth/gmail/disconnect", {
                            method: "POST",
                          });
                          if (response.ok) {
                            setProfile({ ...profile, gmail_connected: false, gmail_email: null });
                          }
                        }
                      }}
                    >
                      <Unlink className="h-4 w-4 mr-1" />
                      斷開
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    當職缺要求「寄履歷到 xxx@company.com」時，系統會自動在你的 Gmail 草稿中建立求職信。
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    連結後，當系統偵測到職缺要求寄 Email 時，會自動建立草稿供你檢視和發送。
                  </p>
                  <Button asChild>
                    <a href="/api/auth/gmail">
                      <Link2 className="h-4 w-4 mr-2" />
                      連結 Gmail
                    </a>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* 自動化設定 */}
          <Card>
            <CardHeader>
              <CardTitle>自動化設定</CardTitle>
              <CardDescription>
                設定透過捷徑新增職缺時的自動化行為
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">自動客製化履歷</p>
                  <p className="text-sm text-muted-foreground">
                    根據職缺自動選擇履歷版本並客製化
                  </p>
                </div>
                <Switch
                  checked={autoCustomize}
                  onCheckedChange={setAutoCustomize}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">自動查詢公司評價</p>
                  <p className="text-sm text-muted-foreground">
                    自動爬取 Dcard、PTT、Qollie 評價
                  </p>
                </div>
                <Switch
                  checked={autoCompanyReview}
                  onCheckedChange={setAutoCompanyReview}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">自動建立 Email 草稿</p>
                  <p className="text-sm text-muted-foreground">
                    偵測到需要寄 Email 時自動建立草稿
                  </p>
                </div>
                <Switch
                  checked={autoDraftEmail}
                  onCheckedChange={setAutoDraftEmail}
                  disabled={!profile?.gmail_connected}
                />
              </div>
              {!profile?.gmail_connected && (
                <p className="text-xs text-muted-foreground">
                  需先連結 Gmail 才能使用此功能
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 導出的頁面組件（包裝 Suspense）
export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}

// 載入骨架
function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48 mt-2" />
      </div>
      <Skeleton className="h-10 w-96" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
