// ─────────────────────────────────────────────────────────────────────────────
// Route: GET /api/auth/callback
// ─────────────────────────────────────────────────────────────────────────────
// Supabase redirects here after email confirmation and OAuth logins.
// We exchange the one-time `code` in the URL for a persistent session cookie,
// then send the user to the app (or back to /login on failure).
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from "next/server";
import { createServerConnector } from "@/lib/connectors/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createServerConnector();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send back to login with an error flag
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
