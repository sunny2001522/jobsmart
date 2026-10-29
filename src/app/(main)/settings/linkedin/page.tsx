"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Puzzle, ShieldCheck, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

type Settings = { enabled: boolean; syncProfile: boolean; syncJobs: boolean };

export default function LinkedInCompanionSettingsPage() {
  const [settings, setSettings] = useState<Settings>({ enabled: true, syncProfile: false, syncJobs: false });
  const [connected, setConnected] = useState(false);
  const [pairCode, setPairCode] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    const [statusResponse, settingsResponse] = await Promise.all([
      fetch("/api/linkedin/extension/status"),
      fetch("/api/linkedin/settings"),
    ]);
    const [statusBody, settingsBody] = await Promise.all([statusResponse.json(), settingsResponse.json()]);
    if (!statusResponse.ok || !settingsResponse.ok) throw new Error(statusBody.error || settingsBody.error || "讀取設定失敗");
    setConnected(Boolean(statusBody.data?.connected));
    setSettings(settingsBody.data);
  }, []);

  useEffect(() => {
    refresh().catch((error) => toast.error(error instanceof Error ? error.message : "讀取設定失敗")).finally(() => setLoading(false));
  }, [refresh]);

  const pair = async () => {
    setWorking(true);
    try {
      const response = await fetch("/api/linkedin/extension/pairing", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "產生配對碼失敗");
      setPairCode(body.data.code);
      setExpiresAt(body.data.expiresAt);
    } catch (error) { toast.error(error instanceof Error ? error.message : "產生配對碼失敗"); }
    finally { setWorking(false); }
  };

  const disconnect = async () => {
    setWorking(true);
    try {
      const response = await fetch("/api/linkedin/extension/status", { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "解除配對失敗");
      setConnected(false);
      setPairCode("");
      toast.success("已撤銷外掛權限；已配對的外掛無法再讀取資料");
    } catch (error) { toast.error(error instanceof Error ? error.message : "解除配對失敗"); }
    finally { setWorking(false); }
  };

  const updateSettings = async (next: Settings) => {
    setSettings(next);
    setWorking(true);
    try {
      const response = await fetch("/api/linkedin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "設定儲存失敗");
      setSettings(body.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "設定儲存失敗");
      await refresh();
    } finally { setWorking(false); }
  };

  return <div className="mx-auto max-w-4xl space-y-6 pb-10">
    <div className="flex items-center gap-3"><Button variant="ghost" size="sm" asChild><Link href="/settings"><ArrowLeft className="mr-1 h-4 w-4" />返回設定</Link></Button></div>
    <div className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl md:p-9">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-300/10 px-3 py-1 text-sm text-blue-100"><Puzzle className="h-4 w-4" />JobSmart LinkedIn Companion</div><h1 className="mt-4 text-3xl font-semibold">LinkedIn 外掛</h1><p className="mt-3 max-w-xl leading-7 text-slate-300">配對你自己的 Chrome 外掛。核准後，外掛可以把客製履歷和求職信填入 LinkedIn 支援的欄位。</p></div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm">{loading ? "檢查配對狀態…" : connected ? <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" />外掛已配對</span> : <span className="text-slate-300">尚未配對</span>}</div>
      </div>
    </div>

    <Card><CardHeader><CardTitle>配對 Chrome 外掛</CardTitle><CardDescription>配對碼五分鐘內有效且只能使用一次。外掛使用獨立撤銷的存取憑證；JobSmart 不會取得 LinkedIn 密碼或 Cookie。</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground"><li>在 Chrome 開啟 <code>chrome://extensions</code>，啟用開發人員模式。</li><li>選擇「載入未封裝項目」，指定專案的 <code>integrations/linkedin-companion</code> 資料夾。</li><li>按下產生配對碼，在外掛視窗貼上代碼並配對。</li></ol>
        <div className="flex flex-wrap gap-2"><Button onClick={pair} disabled={working}>{working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Puzzle className="mr-2 h-4 w-4" />}{connected ? "再配對一個外掛" : "產生配對碼"}</Button>{connected && <Button variant="outline" onClick={disconnect} disabled={working}><Unlink className="mr-2 h-4 w-4" />撤銷配對</Button>}</div>
        {pairCode && <div className="rounded-xl border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">外掛配對碼 · 到期 {expiresAt ? new Date(expiresAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }) : ""}</p><p className="mt-1 break-all font-mono text-2xl font-semibold tracking-widest">{pairCode}</p></div>}
      </CardContent>
    </Card>

    <Card><CardHeader><CardTitle>外掛頁面權限</CardTitle><CardDescription>填表功能需要你在 JobSmart 核准後才會建立任務。個人頁面和職缺頁面同步預設關閉；開啟後，只會在你造訪對應 LinkedIn 頁面時同步。</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center justify-between gap-4 rounded-xl border p-4"><span><span className="block font-medium">啟用 Companion</span><span className="text-sm text-muted-foreground">關閉後停止同步和填表任務。</span></span><Switch checked={settings.enabled} onCheckedChange={(enabled) => void updateSettings({ ...settings, enabled })} /></label>
        <label className="flex items-center justify-between gap-4 rounded-xl border p-4"><span><span className="block font-medium">同步 LinkedIn 個人頁面</span><span className="text-sm text-muted-foreground">把你造訪的個人頁面內容存到自己的 JobSmart 帳號。</span></span><Switch checked={settings.syncProfile} onCheckedChange={(syncProfile) => void updateSettings({ ...settings, syncProfile })} /></label>
        <label className="flex items-center justify-between gap-4 rounded-xl border p-4"><span><span className="block font-medium">同步 LinkedIn 職缺頁面</span><span className="text-sm text-muted-foreground">把你造訪的職缺頁面內容存到自己的 JobSmart 帳號。</span></span><Switch checked={settings.syncJobs} onCheckedChange={(syncJobs) => void updateSettings({ ...settings, syncJobs })} /></label>
      </CardContent>
    </Card>

    <Card className="border-emerald-200 bg-emerald-50/60"><CardContent className="flex gap-3 p-5"><ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" /><div><p className="font-medium text-emerald-950">送出前由你檢查並確認</p><p className="mt-1 text-sm leading-6 text-emerald-900/70">外掛不會按 LinkedIn 的送出按鈕。表單可能因 LinkedIn 版面或問題而無法自動填入；請逐項核對欄位並自行附上未填入的文件。</p></div></CardContent></Card>
    {!loading && connected && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5" />已配對憑證可在此頁撤銷。</p>}
  </div>;
}
