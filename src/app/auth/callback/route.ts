import { createClient } from "@/lib/turso/compat";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") || "/applications";

  if (code) {
    const tursoClient = await createClient();
    const { error } = await tursoClient.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
