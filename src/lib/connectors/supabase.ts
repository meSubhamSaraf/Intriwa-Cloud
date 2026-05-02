// ─────────────────────────────────────────────────────────────────────────────
// Connector: Supabase
// ─────────────────────────────────────────────────────────────────────────────
// Exports two factory helpers:
//   createBrowserConnector() — for Client Components and browser-side code.
//   createServerConnector()  — for Server Components, Route Handlers, and
//                              Server Actions. Reads/writes the session cookie.
//
// We use @supabase/ssr (not the legacy auth-helpers) which is the supported
// approach for Next.js App Router.
// ─────────────────────────────────────────────────────────────────────────────

import { createBrowserClient } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// We use Prisma for all DB queries so we don't need Supabase's generated
// Database types here.  Supabase is only used for Auth and Storage.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Browser connector ─────────────────────────────────────────────────────────
// Safe to call anywhere in Client Components.  Returns a singleton per module.
export function createBrowserConnector() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ── Server connector ──────────────────────────────────────────────────────────
// Must only be called from server-side code (Server Components, Route Handlers,
// Server Actions, middleware).  Reads the session from the request cookies and
// writes the refreshed session back to the response cookies automatically.
export async function createServerConnector() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll is called from Server Components which cannot set cookies.
          // The middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
