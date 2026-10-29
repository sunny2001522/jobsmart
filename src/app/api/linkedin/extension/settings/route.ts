import { NextResponse } from "next/server";
import { getCompanionSettings, getCompanionUserId } from "@/lib/linkedin-companion/auth";
function cors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  return response;
}

export async function OPTIONS() { return cors(new NextResponse(null, { status: 204 })); }

export async function GET(request: Request) {
  const userId = await getCompanionUserId(request);
  if (!userId) return cors(NextResponse.json({ error: "外掛尚未配對或已解除配對" }, { status: 401 }));
  const data = await getCompanionSettings(userId);
  return cors(NextResponse.json({ data }));
}
