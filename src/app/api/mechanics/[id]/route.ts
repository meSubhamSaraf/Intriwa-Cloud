// GET   /api/mechanics/[id]  — mechanic with skills, recent jobs, attendance
// PATCH /api/mechanics/[id]  — update mechanic details (syncs email to Supabase auth if changed)

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";
import { createAdminClient } from "@/lib/connectors/supabase-admin";

export const GET = withAuthParams<{ id: string }>(async (_req, _ctx, { id }) => {
  const mechanic = await prisma.mechanic.findUnique({
    where: { id },
    include: {
      skills: { include: { mechanic: true } },
      serviceRequests: { orderBy: { createdAt: "desc" }, take: 10 },
      attendanceRecords: { orderBy: { date: "desc" }, take: 30 },
    },
  });
  if (!mechanic) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(mechanic);
});

export const PATCH = withAuthParams<{ id: string }>(async (req, { garageId }, { id }) => {
  const body = await req.json();

  // Capture old email before update so we can sync to Supabase if it changes
  const current = await prisma.mechanic.findUnique({
    where: { id, garageId },
    select: { email: true },
  });

  const updated = await prisma.mechanic.update({ where: { id }, data: body });

  // If email changed, update the Supabase auth user so they can log in with the new address
  const newEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
  if (newEmail && newEmail !== current?.email) {
    try {
      const supabase = createAdminClient();
      // Find the Supabase user by the old email
      const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const existing = data?.users?.find(u => u.email === current?.email);
      if (existing) {
        await supabase.auth.admin.updateUserById(existing.id, {
          email: newEmail,
          email_confirm: true,
        });
      }
      // If no existing Supabase user, they'll get one when admin clicks "Send login email"
    } catch (e) {
      console.error("[mechanic PATCH] Supabase email sync failed:", e);
    }
  }

  return NextResponse.json(updated);
});
