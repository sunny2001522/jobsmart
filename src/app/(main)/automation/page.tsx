"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Search, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/contexts/i18n-context";

const sources = [
  { id: "linkedin", label: "LinkedIn Jobs" },
  { id: "indeed", label: "Indeed" },
  { id: "cake", label: "Cake" },
  { id: "104", label: "104 人力銀行", labelEn: "104 Manpower Bank" },
] as const;

type Settings = { enabled: boolean; frequency: "manual" | "hourly" | "daily"; query: string; sources: string[]; nextRunAt: string | null };
const blankSettings: Settings = { enabled: false, frequency: "manual", query: "", sources: sources.map((source) => source.id), nextRunAt: null };

export default function AutomationSettingsPage() {
  const { locale } = useI18n();
  const en = locale === "en";
  const [settings, setSettings] = useState<Settings>(blankSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetch("/api/automation/settings")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || (en ? "Failed to load search settings" : "讀取搜尋設定失敗"));
        setSettings({ ...blankSettings, ...body.data });
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : (en ? "Failed to load search settings" : "讀取搜尋設定失敗")))
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/automation/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || (en ? "Save failed" : "儲存失敗"));
      setSettings({ ...blankSettings, ...body.data });
      toast.success(en ? "Search settings saved" : "搜尋設定已儲存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (en ? "Save failed" : "儲存失敗"));
    } finally { setSaving(false); }
  };

  const searchNow = async () => {
    setSearching(true);
    try {
      const savedResponse = await fetch("/api/automation/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const saved = await savedResponse.json();
      if (!savedResponse.ok) throw new Error(saved.error || (en ? "Complete the search settings first" : "請先完成搜尋設定"));
      setSettings({ ...blankSettings, ...saved.data });
      const response = await fetch("/api/automation/run", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || (en ? "Search failed" : "搜尋失敗"));
      toast.success(en ? `Search complete: found ${result.data.discovered}, added ${result.data.promoted} new job leads` : `搜尋完成：找到 ${result.data.discovered} 筆，新加入 ${result.data.promoted} 筆`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (en ? "Search failed" : "搜尋失敗"));
    } finally { setSearching(false); }
  };

  const nextRun = settings.nextRunAt ? new Date(settings.nextRunAt).toLocaleString(en ? "en-US" : "zh-TW") : (en ? "Not scheduled" : "未排定");

  return <div className="mx-auto max-w-3xl space-y-6 pb-10">
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="sm" asChild><Link href="/applications"><ArrowLeft className="mr-1 h-4 w-4" />{en ? "Back to applications" : "返回求職追蹤"}</Link></Button>
    </div>
    <div>
      <h1 className="text-2xl font-bold">{en ? "Job search settings" : "職缺搜尋設定"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{en ? "Set your search criteria and sources. Results are added to your job leads; applications are never submitted automatically." : "設定搜尋條件與來源。搜尋結果只會加入候選清單，不會自動應徵。"}</p>
    </div>
    <Card>
      <CardHeader><CardTitle>{en ? "Search criteria" : "搜尋條件"}</CardTitle><CardDescription>{en ? "Add keywords such as job titles, skills, locations, or experience—for example, “Product manager Taipei AI 3 years”." : "可加入職稱、技能、地區、資歷等關鍵字，例如「產品經理 台北 AI 3 年」。"}</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        <label className="block space-y-2 text-sm font-medium">{en ? "Job keywords" : "職缺關鍵字"}<Input value={settings.query} onChange={(event) => update({ query: event.target.value })} placeholder={en ? "e.g. Frontend engineer Taipei React" : "例如：前端工程師 台北 React"} /></label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{en ? "Search sources" : "搜尋來源"}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {sources.map((source) => <label key={source.id} className="flex items-center gap-2 rounded-md border p-3 text-sm">
              <input type="checkbox" checked={settings.sources.includes(source.id)} onChange={(event) => update({ sources: event.target.checked ? [...settings.sources, source.id] : settings.sources.filter((item) => item !== source.id) })} />
              {en && "labelEn" in source ? source.labelEn : source.label}
            </label>)}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={settings.enabled} onChange={(event) => update({ enabled: event.target.checked })} />{en ? "Enable background search" : "啟用背景搜尋"}</label>
        <label className="block space-y-2 text-sm font-medium">{en ? "Search frequency" : "搜尋頻率"}
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={settings.frequency} onChange={(event) => update({ frequency: event.target.value as Settings["frequency"] })}>
            <option value="manual">{en ? "Manual" : "手動"}</option><option value="hourly">{en ? "Hourly" : "每小時"}</option><option value="daily">{en ? "Daily" : "每天"}</option>
          </select>
        </label>
        <p className="text-xs leading-5 text-muted-foreground">{en ? `Background search runs after deployment to Vercel with CRON_SECRET configured. Next run: ${nextRun}. Use “Search now” locally. No demo jobs are created when the Google Custom Search API is not configured.` : `背景搜尋在部署到 Vercel 並設定 CRON_SECRET 後執行。下一次執行：${nextRun}。本機可使用「立即搜尋」。Google Custom Search API 未設定時不會建立示範職缺。`}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={loading || saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{en ? "Save settings" : "儲存設定"}</Button>
          <Button variant="secondary" onClick={searchNow} disabled={loading || searching || !settings.query.trim()}>{searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}{en ? "Search now" : "立即搜尋"}</Button>
        </div>
      </CardContent>
    </Card>
  </div>;
}
