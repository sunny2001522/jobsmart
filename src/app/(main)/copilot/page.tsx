"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  FilePenLine,
  Gauge,
  Loader2,
  Mic2,
  Orbit,
  ShieldCheck,
  Sparkles,
  Target,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Action = "scout" | "tailor" | "coach" | "plan";
type Result = { provider: string; model: string; summary: string; nextSteps: string[]; evidence: string[] };

const actions: { id: Action; label: string; title: string; description: string; icon: typeof Compass; color: string }[] = [
  { id: "scout", label: "找機會", title: "主動找出值得投的職缺", description: "掃描公開職缺與你的偏好，先把真正值得花時間的機會排出來。", icon: Compass, color: "text-cyan-300" },
  { id: "tailor", label: "客製履歷", title: "每次投遞都用對版本", description: "針對 JD 調整履歷順序與措辭，保留真實經歷，不替你捏造故事。", icon: FilePenLine, color: "text-violet-300" },
  { id: "coach", label: "複盤面試", title: "錄影後看見下一個進步點", description: "用逐字稿與影片訊號，給你可執行的表達、結構與內容建議。", icon: Video, color: "text-amber-300" },
];

const jobs = [
  { company: "Nebius", role: "AI Platform Engineer", match: 94, tag: "最適合現在" },
  { company: "Luma Systems", role: "Full-stack AI Engineer", match: 88, tag: "高成長團隊" },
  { company: "Orbit Labs", role: "Developer Experience Lead", match: 81, tag: "遠端優先" },
];

export default function CopilotPage() {
  const [activeAction, setActiveAction] = useState<Action>("scout");
  const [result, setResult] = useState<Result | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  async function runAction(action: Action) {
    setActiveAction(action);
    setIsRunning(true);
    try {
      const response = await fetch("/api/agent/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const body = await response.json();
      if (body.success) setResult(body.data);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="min-h-full space-y-8 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#11182a] px-6 py-8 text-white shadow-2xl md:px-10 md:py-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Badge className="border-cyan-300/20 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300/10"><Orbit className="mr-1 h-3.5 w-3.5" />JobSmart Copilot</Badge>
            <span className="text-xs text-slate-400">Private by default · Human approval before sending</span>
          </div>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.08]">讓 AI 主動幫你走完求職的下一步。</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">從探索職缺、客製履歷，到錄影面試複盤，Copilot 把零散的求職工作串成一條可驗證、可掌控的行動鏈。</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button onClick={() => runAction("plan")} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Sparkles className="mr-2 h-4 w-4" />替我排今天的行動</Button>
            <Button variant="outline" asChild className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link href="/applications">查看投遞看板<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </div>
        <div className="relative mt-9 grid max-w-3xl grid-cols-3 gap-3 border-t border-white/10 pt-6 text-sm">
          <div><p className="text-2xl font-semibold">12</p><p className="mt-1 text-slate-400">本週新機會</p></div>
          <div><p className="text-2xl font-semibold text-cyan-300">86%</p><p className="mt-1 text-slate-400">平均 JD 覆蓋率</p></div>
          <div><p className="text-2xl font-semibold">3.4x</p><p className="mt-1 text-slate-400">更少重複工作</p></div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden border-slate-200/80 shadow-sm">
          <CardHeader className="border-b bg-slate-50/70 pb-5"><div className="flex items-center justify-between"><div><CardTitle className="text-xl">今天，Copilot 可以做什麼？</CardTitle><p className="mt-1 text-sm text-muted-foreground">選一個任務，先從可審核的建議開始。</p></div><div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><ShieldCheck className="h-4 w-4 text-emerald-500" />不會自動亂投</div></div></CardHeader>
          <CardContent className="grid gap-3 p-4 md:grid-cols-3">
            {actions.map((action) => { const Icon = action.icon; const active = activeAction === action.id; return <button key={action.id} onClick={() => runAction(action.id)} className={`rounded-2xl border p-4 text-left transition-all ${active ? "border-slate-900 bg-slate-900 text-white shadow-lg" : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-400"}`}><Icon className={`mb-8 h-6 w-6 ${active ? "text-cyan-300" : action.color}`} /><p className="font-medium">{action.title}</p><p className={`mt-2 text-sm leading-6 ${active ? "text-slate-300" : "text-muted-foreground"}`}>{action.description}</p><span className={`mt-4 inline-flex items-center text-xs font-medium ${active ? "text-cyan-300" : "text-slate-500"}`}>{action.label}<ArrowRight className="ml-1 h-3.5 w-3.5" /></span></button>; })}
          </CardContent>
          <div className="border-t px-4 py-5 md:px-6">
            <div className="mb-4 flex items-center justify-between"><div><p className="font-medium">推薦機會</p><p className="text-sm text-muted-foreground">依照你的技能、偏好與職涯方向排序</p></div><Button variant="ghost" size="sm" asChild><Link href="/applications">全部查看<ArrowRight className="ml-1 h-4 w-4" /></Link></Button></div>
            <div className="space-y-2">{jobs.map((job) => <div key={job.role} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold">{job.company.slice(0, 1)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{job.role}</p><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{job.tag}</span></div><p className="mt-1 text-sm text-muted-foreground">{job.company} · 台北 / Hybrid</p></div><div className="flex items-center gap-2 sm:w-28"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${job.match}%` }} /></div><span className="text-sm font-semibold">{job.match}%</span></div><Button size="sm" variant="outline" onClick={() => runAction("tailor")}>客製履歷</Button></div>)}</div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-sm"><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-lg">Agent 工作狀態</CardTitle><span className="flex items-center gap-1.5 text-xs text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Ready</span></div></CardHeader><CardContent className="space-y-4"><div className="flex items-start gap-3"><div className="mt-0.5 rounded-lg bg-cyan-50 p-2 text-cyan-600"><Target className="h-4 w-4" /></div><div><p className="text-sm font-medium">技能檔案</p><p className="text-xs text-muted-foreground">Frontend · AI product · TypeScript</p></div><CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" /></div><div className="flex items-start gap-3"><div className="mt-0.5 rounded-lg bg-violet-50 p-2 text-violet-600"><Gauge className="h-4 w-4" /></div><div><p className="text-sm font-medium">偏好與限制</p><p className="text-xs text-muted-foreground">Hybrid · 不接受無薪試工</p></div><CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" /></div><div className="flex items-start gap-3"><div className="mt-0.5 rounded-lg bg-amber-50 p-2 text-amber-600"><Mic2 className="h-4 w-4" /></div><div><p className="text-sm font-medium">面試紀錄</p><p className="text-xs text-muted-foreground">4 次練習 · 上次 78 分</p></div><CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" /></div></CardContent></Card>
          <Card className="border-slate-200/80 bg-slate-950 text-white shadow-sm"><CardHeader><CardTitle className="text-lg">Nebius × NVIDIA runtime</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-300">每個 Agent 任務都可以在伺服器端切換到 Nebius Token Factory 的 NVIDIA Nemotron 模型；沒有憑證時，公開 demo 仍會用可預期的 fallback 展示完整產品流程。</p><div className="mt-5 flex items-center gap-2 text-xs text-cyan-300"><span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1">Nemotron</span><span className="rounded-full border border-white/10 px-2 py-1 text-slate-400">Server-side only</span></div></CardContent></Card>
        </div>
      </div>

      {result && <Card className="border-cyan-200 bg-cyan-50/50 shadow-sm"><CardContent className="p-6"><div className="flex flex-col gap-5 md:flex-row"><div className="flex-1"><div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-cyan-700"><Sparkles className="h-4 w-4" />Copilot 結果 · {result.provider}</div><h2 className="text-xl font-semibold">{result.summary}</h2><div className="mt-4 grid gap-2">{result.nextSteps.map((step) => <div key={step} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />{step}</div>)}</div></div><div className="rounded-2xl border border-cyan-200 bg-white p-4 md:w-80"><p className="text-xs font-medium text-muted-foreground">Agent evidence</p><div className="mt-3 space-y-2">{result.evidence.map((item) => <p key={item} className="text-sm text-slate-700">{item}</p>)}</div><p className="mt-4 border-t pt-3 text-[11px] text-muted-foreground">Model: {result.model}</p></div></div></CardContent></Card>}
      {isRunning && <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm text-white shadow-xl"><Loader2 className="h-4 w-4 animate-spin text-cyan-300" />Agent 正在整理建議…</div>}
    </div>
  );
}
