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
      const response = NextResponse.redirect(`${origin}${next}`);
      // Write tokens to a JS-readable cookie so the browser extension can
      // bootstrap its session via browser.cookies.get() + supabase.setSession().
      response.cookies.set(
        "pyla-ext-session",
        JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
        {
          sameSite: "none",
          secure: true,
          httpOnly: false,
          path: "/",
          maxAge: 3600,
        },
      );
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
