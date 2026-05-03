// GET /api/me/earnings — returns payout history + summary for the logged-in mechanic

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";
import { createServerConnector } from "@/lib/connectors/supabase-server";
import { PayoutService } from "@/lib/services/payout.service";

const payoutService = new PayoutService();

export const GET = withAuth(async (_req, { garageId }) => {
  const supabase = await createServerConnector();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conditions = [];
  if (user.email) conditions.push({ email: user.email });
  if (user.phone) {
    const digits = user.phone.replace(/\D/g, "").slice(-10);
    conditions.push({ phone: { endsWith: digits } });
  }

  const mechanic = await prisma.mechanic.findFirst({
    where: { garageId, isActive: true, OR: conditions },
    select: { id: true },
  });
  if (!mechanic) return NextResponse.json({ error: "No mechanic profile linked" }, { status: 404 });

  const [payouts, summary] = await Promise.all([
    payoutService.listByMechanic(mechanic.id),
    payoutService.earningsSummary(mechanic.id),
  ]);

  return NextResponse.json({ payouts, summary, mechanicId: mechanic.id });
});
