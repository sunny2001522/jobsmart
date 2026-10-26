import { NextResponse } from "next/server";
import { dispatch } from "@/lib/turso/repository";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await dispatch(String(body.action), Array.isArray(body.args) ? body.args : []);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Turso data request failed", error);
    return NextResponse.json({ success: false, error: "資料庫操作失敗" }, { status: 500 });
  }
}
