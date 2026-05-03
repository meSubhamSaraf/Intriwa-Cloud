// Supabase Admin client — uses the service role key.
// Only import this in Route Handlers, never in client-side code.
// Required for privileged operations: inviting users, reading any user's data.

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
