import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback route — Supabase redirects here after email confirmation.
 * Exchanges the code for a session, then redirects to /dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      // Route through /auth/extension so the browser extension can intercept
      // the tokens via browser.tabs.onUpdated + scripting.executeScript.
      const bridgeUrl = new URL(`${origin}/auth/extension`);
      bridgeUrl.searchParams.set("access_token", data.session.access_token);
      bridgeUrl.searchParams.set("refresh_token", data.session.refresh_token);
      bridgeUrl.searchParams.set("next", next);
      return NextResponse.redirect(bridgeUrl.toString());
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
