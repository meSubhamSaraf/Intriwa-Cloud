// Supabase Admin client — uses the service role key.
// Only import this in Route Handlers, never in client-side code.
// Required for privileged operations: inviting users, reading any user's data.

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL — add them to Vercel environment variables (Project → Settings → Environment Variables)."
    );
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
