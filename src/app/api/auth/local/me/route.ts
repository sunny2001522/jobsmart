import { NextResponse } from "next/server";
import { getLocalUser } from "@/lib/auth/local";

export async function GET() {
  const user = await getLocalUser();
  return NextResponse.json({ user: user ? { id: user.id, email: user.email, user_metadata: { name: user.displayName } } : null });
}
