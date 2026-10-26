"use client";

export function createClient() {
  return {
    auth: {
      async getUser() {
        const response = await fetch("/api/auth/local/me");
        const body = await response.json();
        return { data: { user: body.user ?? null }, error: null };
      },
      async signOut() { await fetch("/api/auth/local/logout", { method: "POST" }); return { error: null }; },
      async signInWithOAuth(_options?: unknown) { return { data: null, error: new Error("請使用 JobSmart Turso 登入") }; },
    },
  };
}
