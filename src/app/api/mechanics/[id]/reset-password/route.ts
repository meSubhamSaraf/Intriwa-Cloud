// POST /api/mechanics/[id]/reset-password
// Creates a Supabase account if one doesn't exist yet, then sends a
// password reset / login setup email so the mechanic can set their own password.

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
      { error: "No email on file — add an email address first." },
      { status: 422 }
    );
  }

  const origin = new URL(req.url).origin;
  const supabase = createAdminClient();

  // If no Supabase account exists yet, create one so reset email can be sent
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = listData?.users?.find(u => u.email === mechanic.email);

  if (!existing) {
    const firstName = mechanic.name.trim().split(/\s+/)[0].toLowerCase();
    const { error: createErr } = await supabase.auth.admin.createUser({
      email: mechanic.email,
      password: `${firstName}@123`,
      email_confirm: true,
      user_metadata: { role: "MECHANIC", garageId, name: mechanic.name },
    });
    if (createErr && !createErr.message?.toLowerCase().includes("already")) {
      console.error("[reset-password] createUser error:", createErr);
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }
  }

  // Generate a recovery link — Supabase sends the email automatically
  const { error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: mechanic.email,
    options: { redirectTo: `${origin}/login` },
  });

  if (error) {
    console.error("[reset-password] generateLink error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});
