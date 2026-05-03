// POST /api/mechanics/{id}/invite
// Sends a Supabase invite email to the mechanic so they can set up their
// portal login without the admin touching the Supabase dashboard.
//
// Flow:
//   1. Verify the mechanic exists and has an email on file.
//   2. Call supabase.auth.admin.inviteUserByEmail() with the mechanic's email.
//      Supabase creates the Supabase user (if not exists) and sends an invite
//      email with a magic link that lands on /api/auth/callback.
//   3. The callback auto-creates their Profile with role=MECHANIC.
//   4. Mechanic clicks the link → sets their password → lands on /mechanic-portal.

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";
import { createAdminClient } from "@/lib/connectors/supabase-admin";

export const POST = withAuthParams<{ id: string }>(async (req, { garageId }, { id }) => {
  const mechanic = await prisma.mechanic.findUnique({ where: { id } });

  if (!mechanic || mechanic.garageId !== garageId) {
    return NextResponse.json({ error: "Mechanic not found" }, { status: 404 });
  }

  if (!mechanic.email) {
    return NextResponse.json(
      { error: "This mechanic has no email address on file. Add an email first." },
      { status: 422 }
    );
  }

  const origin = new URL(req.url).origin;
  const redirectTo = `${origin}/api/auth/callback?next=/mechanic-portal`;

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.inviteUserByEmail(mechanic.email, {
    data: {
      role:      "MECHANIC",
      garageId,
      name:      mechanic.name,
    },
    redirectTo,
  });

  if (error) {
    // "User already registered" means they already have a Supabase account —
    // they just need to log in.  Treat this as a soft success.
    if (error.message?.toLowerCase().includes("already")) {
      return NextResponse.json({ ok: true, alreadyExists: true });
    }
    console.error("[invite] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, alreadyExists: false });
});
