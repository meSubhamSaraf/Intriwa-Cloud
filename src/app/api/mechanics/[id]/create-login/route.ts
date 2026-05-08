// POST /api/mechanics/[id]/create-login
// Creates (or re-creates) the Supabase auth account for a mechanic and
// returns the default password so the admin can share it directly.

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";
import { createAdminClient } from "@/lib/connectors/supabase-admin";

export const POST = withAuthParams<{ id: string }>(async (_req, { garageId }, { id }) => {
  const mechanic = await prisma.mechanic.findUnique({ where: { id } });

  if (!mechanic || mechanic.garageId !== garageId) {
    return NextResponse.json({ error: "Mechanic not found" }, { status: 404 });
  }
  if (!mechanic.email) {
    return NextResponse.json({ error: "No email on file — add an email address first." }, { status: 422 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Admin client unavailable" },
      { status: 500 }
    );
  }

  const firstName = mechanic.name.trim().split(/\s+/)[0].toLowerCase();
  const defaultPassword = `${firstName}@123`;

  // Create or update the Supabase user
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = listData?.users?.find((u) => u.email === mechanic.email);

  if (existing) {
    // Reset password so admin can share the known default
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: defaultPassword,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.auth.admin.createUser({
      email: mechanic.email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: { role: "MECHANIC", garageId, name: mechanic.name },
    });
    if (error && !error.message?.toLowerCase().includes("already")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ email: mechanic.email, defaultPassword });
});
