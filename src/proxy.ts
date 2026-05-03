// ─────────────────────────────────────────────────────────────────────────────
// Proxy: Auth session refresh + route protection
// ─────────────────────────────────────────────────────────────────────────────
// Runs on every matched request BEFORE the page/route handler.
// Two responsibilities:
//   1. Refresh the Supabase session cookie so it never expires mid-session.
//   2. Redirect unauthenticated users away from protected routes to /login.
//
// The public routes list below are the only paths that don't require a session.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTES = ["/login", "/api/auth/callback", "/auth/reset-password", "/api/webhooks"];

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    const homeUrl = request.nextUrl.clone();
    // Mechanics get their own portal; everyone else goes to dashboard
    homeUrl.pathname =
      user.user_metadata?.role === "MECHANIC" ? "/mechanic-portal" : "/dashboard";
    return NextResponse.redirect(homeUrl);
  }

  // Prevent mechanics from accidentally landing on admin pages
  if (user && user.user_metadata?.role === "MECHANIC" && pathname === "/dashboard") {
    const portalUrl = request.nextUrl.clone();
    portalUrl.pathname = "/mechanic-portal";
    return NextResponse.redirect(portalUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
