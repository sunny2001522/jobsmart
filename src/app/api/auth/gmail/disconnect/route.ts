/**
 * Gmail 斷開連結端點
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { disconnectGmail } from "@/lib/gmail/oauth";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await disconnectGmail(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gmail disconnect error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
