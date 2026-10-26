import { NextResponse } from "next/server";
import { ensureTursoSchema, getTursoClient } from "@/lib/turso/server";

function cors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export async function OPTIONS() { return cors(new NextResponse(null, { status: 204 })); }

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    if (!["profile", "job"].includes(payload.pageType) || typeof payload.text !== "string") return cors(NextResponse.json({ success: false, error: "Invalid LinkedIn payload" }, { status: 400 }));
    const db = getTursoClient();
    if (!db) return cors(NextResponse.json({ success: false, error: "Turso is not configured" }, { status: 503 }));
    await ensureTursoSchema();
    const id = crypto.randomUUID();
    const created = new Date().toISOString();
    const table = payload.pageType === "profile" ? "career_profiles" : "job_opportunities";
    await db.execute({ sql: payload.pageType === "profile"
      ? `INSERT INTO career_profiles (id, user_id, display_name, skills_json, preferences_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO job_opportunities (id, user_id, company, role, url, match_score, source, jd_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: payload.pageType === "profile"
        ? [id, "demo-user", payload.title ?? "LinkedIn profile", JSON.stringify([]), JSON.stringify({ sourceUrl: payload.sourceUrl, text: payload.text, jsonLd: payload.jsonLd }), created, created]
        : [id, "demo-user", payload.title ?? "LinkedIn job", payload.title ?? "", payload.sourceUrl, null, "linkedin-companion", JSON.stringify(payload), created],
    });
    return cors(NextResponse.json({ success: true, id, pageType: payload.pageType }));
  } catch (error) {
    console.error("LinkedIn ingest failed", error);
    return cors(NextResponse.json({ success: false, error: "LinkedIn ingest failed" }, { status: 500 }));
  }
}
