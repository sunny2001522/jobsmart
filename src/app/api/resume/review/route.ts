import { NextResponse } from "next/server";
import { z } from "zod";
import { reviewResumeClaims } from "@/lib/ai/gateway";
import { dispatch } from "@/lib/turso/repository";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

const schema = z.object({ versionId: z.string().uuid(), applicationId: z.string().uuid(), draft: z.string().min(50), jdContent: z.string().min(80) });

export async function POST(request: Request) {
  try {
    const db = getTursoClient();
    if (!db) return NextResponse.json({ error: "Turso is not configured" }, { status: 503 });
    await ensureTursoSchema();
    const { versionId, applicationId, draft, jdContent } = schema.parse(await request.json());
    const relation = await dispatch("getVersionJobResume", [versionId, applicationId]) as Record<string, unknown> | null;
    if (!relation) return NextResponse.json({ error: "找不到履歷審核資料" }, { status: 404 });
    const version = await dispatch("getResumeVersion", [versionId]) as { base_plain_text?: string; user_id?: string } | null;
    if (!version?.base_plain_text || version.user_id !== "demo-user") return NextResponse.json({ error: "無權限或找不到原始履歷" }, { status: 403 });
    const old = (relation.ai_suggestions && typeof relation.ai_suggestions === "object" ? relation.ai_suggestions : {}) as Record<string, unknown>;
    const previousAudit = old.audit && typeof old.audit === "object" ? old.audit as Record<string, unknown> : {};
    const priorRequirements = Array.isArray(previousAudit.requirements) ? previousAudit.requirements as Parameters<typeof reviewResumeClaims>[3] : [];
    const audit = await reviewResumeClaims(version.base_plain_text, draft, jdContent, priorRequirements);
    const updated = await dispatch("updateVersionJobResume", [String(relation.id), { ai_suggestions: { ...old, audit } }]);
    if (!updated) throw new Error("審核結果儲存失敗");
    return NextResponse.json({ data: { audit } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "欄位錯誤" }, { status: 400 });
    console.error("Resume fact review failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "審核失敗，請重試" }, { status: 500 });
  }
}
