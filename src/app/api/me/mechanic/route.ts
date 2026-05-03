// GET /api/me/mechanic
// Returns the Mechanic record for the logged-in mechanic.
// Matching priority:
//   1. By email (email+password login)
//   2. By phone (phone OTP login — Supabase stores +91XXXXXXXXXX)

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";
import { createServerConnector } from "@/lib/connectors/supabase-server";

export const GET = withAuth(async (_req, { garageId }) => {
  const supabase = await createServerConnector();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Build search conditions
  const conditions = [];
  if (user.email) conditions.push({ email: user.email });
  if (user.phone) {
    const digits = user.phone.replace(/\D/g, "").slice(-10);
    conditions.push({ phone: { endsWith: digits } });
  }

  if (conditions.length === 0) {
    return NextResponse.json({ error: "No email or phone on account" }, { status: 422 });
  }

  const mechanic = await prisma.mechanic.findFirst({
    where: {
      garageId,
      isActive: true,
      OR: conditions,
    },
    include: {
      serviceRequests: {
        include: { customer: true, vehicle: true },
        orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
        take: 50,
      },
    },
  });

  if (!mechanic) {
    return NextResponse.json(
      { error: "No mechanic profile linked to this account. Ask your garage admin to add your phone number or email to your mechanic record." },
      { status: 404 }
    );
  }

  return NextResponse.json(mechanic);
});
