// ─────────────────────────────────────────────────────────────────────────────
// Route: GET /api/auth/callback
// ─────────────────────────────────────────────────────────────────────────────
// Supabase redirects here after email confirmation, OAuth logins, and invite
// link clicks.  We:
//   1. Exchange the one-time `code` for a persistent session cookie.
//   2. Auto-create (or no-op upsert) the Profile row so every Supabase user
//      always has a matching Profile in our DB.
//   3. Redirect mechanics to /mechanic-portal, everyone else to /dashboard
//      (or the ?next= override supplied by the invite URL).
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from "next/server";
import { createServerConnector } from "@/lib/connectors/supabase-server";
import { prisma } from "@/lib/connectors/prisma";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerConnector();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the freshly-exchanged user
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const meta = user.user_metadata ?? {};
        const role  = (meta.role as string | undefined) ?? "OPS_MANAGER";
        const gId   = (meta.garageId as string | undefined) ?? null;

        // Create Profile row if this is the first login
        await prisma.profile.upsert({
          where:  { id: user.id },
          create: {
            id:       user.id,
            email:    user.email!,
            name:     (meta.name as string | undefined) ?? user.email!.split("@")[0],
            role:     role as "SUPER_ADMIN" | "OPS_MANAGER" | "MECHANIC",
            garageId: gId,
          },
          update: {}, // never overwrite existing profile data on re-login
        });

        // Respect an explicit ?next= override (used by invite emails)
        const next = searchParams.get("next");
        if (next) return NextResponse.redirect(`${origin}${next}`);

        // Default: mechanics go to their portal, everyone else to dashboard
        const dest = role === "MECHANIC" ? "/mechanic-portal" : "/dashboard";
        return NextResponse.redirect(`${origin}${dest}`);
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
