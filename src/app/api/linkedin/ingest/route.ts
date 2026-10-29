import { NextResponse } from "next/server";
import { getCompanionSettings, getCompanionUserId, isLinkedInUrl } from "@/lib/linkedin-companion/auth";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

function cors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return response;
}

export async function OPTIONS() { return cors(new NextResponse(null, { status: 204 })); }

export async function POST(request: Request) {
  try {
    const userId = await getCompanionUserId(request);
    if (!userId) return cors(NextResponse.json({ success: false, error: "外掛尚未配對或已解除配對" }, { status: 401 }));
    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return cors(NextResponse.json({ success: false, error: "Invalid LinkedIn page payload" }, { status: 400 }));
    }
    const jsonLdSize = JSON.stringify(payload.jsonLd ?? []).length;
    if (jsonLdSize > 100000 || String(payload.sourceUrl || "").length > 2000) {
      return cors(NextResponse.json({ success: false, error: "Invalid LinkedIn page payload" }, { status: 400 }));
    }
    if (!(["profile", "job"].includes(payload.pageType)) || typeof payload.text !== "string" || payload.text.length > 50000 || !isLinkedInUrl(String(payload.sourceUrl || ""))) {
      return cors(NextResponse.json({ success: false, error: "Invalid LinkedIn page payload" }, { status: 400 }));
    }
    const settings = await getCompanionSettings(userId);
    const syncAllowed = payload.pageType === "profile" ? settings.syncProfile : settings.syncJobs;
    if (!settings.enabled || !syncAllowed) return cors(NextResponse.json({ success: false, error: "此類 LinkedIn 頁面同步尚未啟用" }, { status: 403 }));
    const db = getTursoClient();
    if (!db) return cors(NextResponse.json({ success: false, error: "Turso is not configured" }, { status: 503 }));
    await ensureTursoSchema();
    const id = crypto.randomUUID();
    const created = new Date().toISOString();
    await db.execute({ sql: payload.pageType === "profile"
      ? "INSERT INTO career_profiles (id, user_id, display_name, skills_json, preferences_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      : "INSERT INTO job_opportunities (id, user_id, company, role, url, match_score, source, jd_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: payload.pageType === "profile"
        ? [id, userId, String(payload.title || "LinkedIn profile").slice(0, 240), JSON.stringify([]), JSON.stringify({ sourceUrl: payload.sourceUrl, text: payload.text, jsonLd: payload.jsonLd }), created, created]
        : [id, userId, String(payload.title || "LinkedIn job").slice(0, 240), String(payload.title || "").slice(0, 240), String(payload.sourceUrl), null, "linkedin-companion", JSON.stringify(payload), created],
    });
    return cors(NextResponse.json({ success: true, id, pageType: payload.pageType }));
  } catch (error) {
    console.error("LinkedIn ingest failed", error);
    return cors(NextResponse.json({ success: false, error: "LinkedIn ingest failed" }, { status: 500 }));
  }
}
