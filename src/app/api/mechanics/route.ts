// GET  /api/mechanics  — list active mechanics for the garage
// POST /api/mechanics  — add a new mechanic
//   If the mechanic has an email, a Supabase auth account is created automatically
//   with the default password  {firstname}@123  (e.g. "Ravi Kumar" → ravi@123).
//   The password is returned in the response so the admin can share it.
//   The mechanic can reset it later via "Forgot password" on the login page.

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";
import { createAdminClient } from "@/lib/connectors/supabase-admin";

export const GET = withAuth(async (_req, { garageId }) => {
  const mechanics = await prisma.mechanic.findMany({
    where: { garageId, isActive: true },
    include: { skills: { include: { mechanic: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(mechanics);
});

export const POST = withAuth(async (req, { garageId }) => {
  const body = await req.json();

  const mechanic = await prisma.mechanic.create({
    data: { ...body, garageId },
  });

  // Auto-create the Supabase login if the mechanic has an email.
  let defaultPassword: string | null = null;
  let authError: string | null = null;

  if (mechanic.email) {
    const firstName = mechanic.name.trim().split(/\s+/)[0].toLowerCase();
    defaultPassword = `${firstName}@123`;

    let supabase;
    try {
      supabase = createAdminClient();
    } catch (e) {
      authError = e instanceof Error ? e.message : "Admin client unavailable";
      defaultPassword = null;
    }

    if (supabase && defaultPassword) {
    const { error } = await supabase.auth.admin.createUser({
      email: mechanic.email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        role: "MECHANIC",
        garageId,
        name: mechanic.name,
      },
    });

    if (error) {
      // "already registered" means they already have an account — not a failure
      if (!error.message?.toLowerCase().includes("already")) {
        console.error("[mechanic create] Supabase auth error:", error.message);
        authError = error.message;
        defaultPassword = null;
      }
    }
    } // end if (supabase)
  }

  return NextResponse.json(
    { ...mechanic, defaultPassword, authError },
    { status: 201 }
  );
});
