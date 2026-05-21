import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@pyla/supabase";

/**
 * Middleware — refreshes the Supabase auth session on every request.
 * Also protects /dashboard and /capsule routes — redirects to /login if unauthenticated.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session — must call getUser() to keep session alive
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect private routes
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/capsule") ||
    pathname.startsWith("/settings");

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    const res = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value));
    return res;
  }

  // Redirect authenticated users away from /login
  if (pathname === "/login" && user) {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = "/dashboard";
    dashUrl.search = "";
    const res = NextResponse.redirect(dashUrl);
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value));
    return res;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
