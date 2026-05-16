// ─────────────────────────────────────────────────────────────────────────────
// Route: POST /api/auth/signout
// ─────────────────────────────────────────────────────────────────────────────
// Clears the Supabase session cookie and redirects to /login.
// Call via a form action or fetch POST — never a plain link (needs POST).
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { createServerConnector } from "@/lib/connectors/supabase-server";

export async function POST(request: Request) {
  const supabase = await createServerConnector();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? request.url));
}
