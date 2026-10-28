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
import { createClient } from "@/lib/turso/client";
import { getProfile, updateProfile } from "@/lib/turso/db";
import type { Profile } from "@/lib/turso/types";
import { useI18n } from "@/contexts/i18n-context";
import { LanguageSwitcher } from "@/components/language-switcher";

// 擴展 Profile 類型以包含 Gmail 相關欄位
interface ProfileWithGmail extends Profile {
  gmail_connected?: boolean;
  gmail_email?: string | null;
}

// 主要設定頁面內容組件（使用 useSearchParams）
function SettingsContent() {
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const copy = (zh: string, en: string) => locale === "en" ? en : zh;
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
      const showConnected = window.setTimeout(() => setGmailJustConnected(true), 0);
      const hideConnected = window.setTimeout(() => setGmailJustConnected(false), 5000);
      return () => {
        window.clearTimeout(showConnected);
        window.clearTimeout(hideConnected);
      };
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
    await fetch("/api/auth/local/logout", { method: "POST" });
    const tursoClient = createClient();
    await tursoClient.auth.signOut();
    window.location.href = "/login";
  };

  const aiCreditsPercentage = profile
    ? (profile.ai_credits_remaining / 100) * 100
    : 0;

  const subscriptionLabels = {
    free: copy("免費方案", "Free plan"),
    pro: copy("Pro 方案", "Pro plan"),
    enterprise: copy("企業方案", "Enterprise plan"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
        <p className="text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col items-stretch justify-between gap-4 space-y-0 sm:flex-row sm:items-center">
          <div>
            <CardTitle>{t("language.preference")}</CardTitle>
            <CardDescription>{t("language.description")}</CardDescription>
          </div>
          <LanguageSwitcher />
        </CardHeader>
      </Card>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            {t("settings.profile")}
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <CreditCard className="h-4 w-4 mr-2" />
            {t("settings.subscription")}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            {t("settings.notifications")}
          </TabsTrigger>
          <TabsTrigger value="mobile">
            <Smartphone className="h-4 w-4 mr-2" />
            {t("settings.mobile")}
          </TabsTrigger>
        </TabsList>

        {/* 個人資料 */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{copy("個人資料", "Profile details")}</CardTitle>
              <CardDescription>
                {copy("更新你的個人資訊", "Update your personal information")}
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
                      {copy("Email 無法變更", "Email cannot be changed")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">{copy("姓名", "Name")}</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={copy("輸入你的姓名", "Enter your name")}
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
                    {isSaving ? copy("儲存中...", "Saving...") : saveSuccess ? copy("已儲存", "Saved") : copy("儲存變更", "Save changes")}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{copy("帳戶安全", "Account security")}</CardTitle>
              <CardDescription>
                {copy("管理你的帳戶安全設定", "Manage your account security")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">{copy("登出帳戶", "Sign out")}</p>
                  <p className="text-sm text-muted-foreground">
                    {copy("登出目前的裝置", "Sign out of this device")}
                  </p>
                </div>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {copy("登出", "Sign out")}
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
                {copy("目前方案", "Current plan")}
                {profile && (
                  <Badge variant={profile.subscription_tier === "free" ? "secondary" : "default"}>
                    {subscriptionLabels[profile.subscription_tier]}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {copy("管理你的訂閱和 AI 使用額度", "Manage your plan and AI credits")}
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
                        <span className="font-medium">{copy("AI 使用額度", "AI credits")}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {profile?.ai_credits_remaining} / 100 {copy("點", "credits")}
                      </span>
                    </div>
                    <Progress value={aiCreditsPercentage} />
                    <p className="text-xs text-muted-foreground">
                      {copy("每月重置，用於 AI 優化、JD 分析、面試評分等功能", "Credits reset monthly and are used for resume optimization, job analysis, and interview feedback.")}
                    </p>
                  </div>

                  {/* 使用統計 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">{copy("本月 JD 分析", "Job analyses this month")}</p>
                      <p className="text-2xl font-bold">{profile?.monthly_jd_count || 0}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">{copy("本月公司查詢", "Company lookups this month")}</p>
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
                  {copy("升級到 Pro", "Upgrade to Pro")}
                </CardTitle>
                <CardDescription>
                  {copy("解鎖更多 AI 功能和使用額度", "Unlock more AI features and credits")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {copy("每月 500 AI 使用額度", "500 AI credits per month")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {copy("無限 JD 分析次數", "Unlimited job description analyses")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {copy("GPT-4 深度優化", "Advanced GPT-4 optimization")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {copy("優先客服支援", "Priority support")}
                  </li>
                </ul>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg">$9.99 / {copy("月", "month")}</p>
                    <p className="text-sm text-muted-foreground">{copy("年繳享 8 折優惠", "Save 20% with annual billing")}</p>
                  </div>
                  <Button>
                    {copy("升級方案", "Upgrade plan")}
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
              <CardTitle>{copy("通知偏好", "Notification preferences")}</CardTitle>
              <CardDescription>
                {copy("選擇你想要接收的通知類型", "Choose which notifications you want to receive")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">{copy("Email 通知", "Email notifications")}</p>
                  <p className="text-sm text-muted-foreground">
                    {copy("接收重要更新和提醒的 Email", "Receive important updates and reminders by email")}
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
                  <p className="font-medium">{copy("每週摘要", "Weekly digest")}</p>
                  <p className="text-sm text-muted-foreground">
                    {copy("每週一封求職進度摘要 Email", "A weekly summary of your job search progress")}
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
                  <p className="font-medium">{copy("面試提醒", "Interview reminders")}</p>
                  <p className="text-sm text-muted-foreground">
                    {copy("面試前一天收到提醒", "Get a reminder one day before an interview")}
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
              <CardTitle>{copy("隱私設定", "Privacy")}</CardTitle>
              <CardDescription>
                {copy("控制你的資料隱私", "Control how your data is handled")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>{copy("你的資料使用 AES-256 加密儲存", "Your data is encrypted at rest using AES-256")}</span>
              </div>

              <p className="text-sm text-muted-foreground">
                {copy("我們絕不會將你的個人資料分享給第三方。你的履歷和求職記錄僅供你本人使用。", "We do not share your personal information with third parties. Your resumes and job search records are for your use only.")}
              </p>

              <Button variant="outline" size="sm">
                {copy("下載我的資料", "Download my data")}
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
                {copy("Gmail 已成功連結！現在可以自動建立求職信草稿了。", "Gmail connected. You can now create email drafts.")}
              </AlertDescription>
            </Alert>
          )}

          {/* Apple 捷徑 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Apple Shortcuts
              </CardTitle>
              <CardDescription>
                {copy("在手機上分享職缺連結，自動完成追蹤和履歷客製化", "Share a job link from your phone to track it and tailor a resume.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <h4 className="font-medium">{copy("使用方式", "How it works")}</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>{copy("下載並安裝 Apple 捷徑", "Download and install the Apple Shortcut")}</li>
                  <li>{copy("在 Safari 或任何 App 中看到職缺連結", "Find a job link in Safari or another app")}</li>
                  <li>{copy("點擊「分享」→ 選擇「JobSmart 快速追蹤」", "Tap Share, then choose JobSmart Quick Track")}</li>
                  <li>{copy("系統會自動解析、查評價、客製化履歷", "JobSmart parses the listing, checks company reviews, and tailors your resume")}</li>
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
                    {copy("下載捷徑", "Download shortcut")}
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href="https://support.apple.com/guide/shortcuts/welcome/ios"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {copy("說明文件", "Documentation")}
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
                {copy("Gmail 連結", "Gmail connection")}
                {profile?.gmail_connected && (
                  <Badge variant="secondary" className="ml-2">
                    <Check className="h-3 w-3 mr-1" />
                    {copy("已連結", "Connected")}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {copy("連結 Gmail 後，系統可自動建立求職信草稿", "Connect Gmail to create job application email drafts.")}
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
                          {copy("已連結的 Gmail 帳戶", "Connected Gmail account")}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        // TODO: 實作斷開連結
                        if (confirm(copy("確定要斷開 Gmail 連結嗎？", "Disconnect Gmail?"))) {
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
                      {copy("斷開", "Disconnect")}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {copy("當職缺要求「寄履歷到 xxx@company.com」時，系統會自動在你的 Gmail 草稿中建立求職信。", "When a job asks you to email your resume, JobSmart creates an application email draft in Gmail.")}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {copy("連結後，當系統偵測到職缺要求寄 Email 時，會自動建立草稿供你檢視和發送。", "When a listing asks you to apply by email, JobSmart creates a draft for you to review and send.")}
                  </p>
                  <Button asChild>
                    <a href="/api/auth/gmail">
                      <Link2 className="h-4 w-4 mr-2" />
                      {copy("連結 Gmail", "Connect Gmail")}
                    </a>
                  </Button>
                </>
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
