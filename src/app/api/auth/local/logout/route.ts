import { NextResponse } from "next/server";
import { clearLocalSession } from "@/lib/auth/local";

export async function POST() { await clearLocalSession(); return NextResponse.json({ success: true }); }
