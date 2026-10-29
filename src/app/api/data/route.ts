import { NextResponse } from "next/server";
import { dispatch } from "@/lib/turso/repository";
import { getLocalUser } from "@/lib/auth/local";

export async function POST(request: Request) {
  try {
    if (!(await getLocalUser())) return NextResponse.json({ success: false, error: "請先登入" }, { status: 401 });
    const body = await request.json();
    const args = Array.isArray(body.args) ? body.args : [];
    if (body.action === "updateJobApplication" && args[1] && typeof args[1] === "object" && (args[1] as Record<string, unknown>).status === "applied") {
      return NextResponse.json({ success: false, error: "請使用已確認的投遞操作更新狀態" }, { status: 409 });
    }
    if (body.action === "createJobApplication" && args[0] && typeof args[0] === "object" && (args[0] as Record<string, unknown>).status === "applied") {
      return NextResponse.json({ success: false, error: "請先建立職缺，再於確認已送出後標記為已投遞" }, { status: 409 });
    }
    const data = await dispatch(String(body.action), args);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Turso data request failed", error);
    return NextResponse.json({ success: false, error: "資料庫操作失敗" }, { status: 500 });
  }
}
