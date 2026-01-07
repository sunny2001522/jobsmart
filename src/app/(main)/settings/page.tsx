"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getProfile, updateProfile } from "@/lib/supabase/db";
import type { Profile } from "@/lib/supabase/types";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
        setProfile(data);
        setName(data.name || "");
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, []);

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
      </Tabs>
    </div>
  );
}
