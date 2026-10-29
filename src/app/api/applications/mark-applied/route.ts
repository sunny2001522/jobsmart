import { NextResponse } from "next/server";
import { getLocalUser } from "@/lib/auth/local";
import { dispatch } from "@/lib/turso/repository";

export async function POST(request: Request) {
  const user = await getLocalUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (body.confirmed !== true) return NextResponse.json({ error: "請先確認已親自送出申請" }, { status: 400 });
  const applicationId = String(body.applicationId || "");
  if (!applicationId) return NextResponse.json({ error: "缺少職缺 ID" }, { status: 400 });
  const applications = await dispatch("getJobApplications") as Array<Record<string, unknown>>;
  const application = applications.find((item) => String(item.id) === applicationId);
  if (!application) return NextResponse.json({ error: "找不到這份應徵資料" }, { status: 404 });
  if (application.status === "applied") return NextResponse.json({ error: "這份應徵資料已標記為已投遞" }, { status: 409 });
  const updated = await dispatch("updateJobApplication", [applicationId, { status: "applied", applied_at: new Date().toISOString() }]);
  if (!updated) return NextResponse.json({ error: "狀態更新失敗" }, { status: 500 });
  return NextResponse.json({ data: updated });
}
