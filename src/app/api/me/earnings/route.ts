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
  });
  if (!mechanic) return NextResponse.json({ error: "No mechanic profile linked" }, { status: 404 });

  const [payouts, summary] = await Promise.all([
    payoutService.listByMechanic(mechanic.id),
    payoutService.earningsSummary(mechanic.id),
  ]);

  // Accrued (unpaid) earnings — same logic as admin endpoint
  const lastPayout = payouts[0] ?? null;
  const accrualStart = lastPayout ? new Date(lastPayout.periodEnd) : new Date(0);

  const paidItemIds = (
    await prisma.mechanicPayoutItem.findMany({
      where: { payout: { mechanicId: mechanic.id } },
      select: { serviceItemId: true },
    })
  )
    .map((r) => r.serviceItemId)
    .filter((x): x is string => x !== null);

  const accruedItems = await prisma.serviceItem.findMany({
    where: {
      OR: [
        { assignedMechanicId: mechanic.id },
        { assignedMechanicId: null, serviceRequest: { mechanicId: mechanic.id } },
      ],
      serviceRequest: {
        status: "CLOSED",
        closedAt: { gt: accrualStart },
      },
      NOT: { id: { in: paidItemIds } },
    },
    include: { serviceRequest: { select: { srNumber: true, closedAt: true } } },
  });

  let accrued = 0;
  const accruedBreakdown = accruedItems.map((item) => {
    let amount = 0;
    if (mechanic.payoutConfigType === "FIXED_PER_ITEM") {
      amount = Number(mechanic.payoutRate ?? 0);
    } else if (mechanic.payoutConfigType === "PERCENT_OF_ITEM") {
      amount = Number(item.total) * Number(mechanic.payoutRate ?? 0);
    }
    accrued += amount;
    return {
      srNumber: item.serviceRequest.srNumber,
      description: item.description,
      closedAt: item.serviceRequest.closedAt,
      amount,
    };
  });

  const pendingPenalties = await prisma.mechanicPenalty.findMany({
    where: { mechanicId: mechanic.id, payoutId: null },
    orderBy: { issuedAt: "desc" },
  });
  const pendingPenaltyTotal = pendingPenalties.reduce((s, p) => s + Number(p.amount), 0);

  return NextResponse.json({
    payouts,
    summary,
    mechanicId: mechanic.id,
    accrued: {
      amount: accrued,
      penaltyDeductions: pendingPenaltyTotal,
      net: accrued - pendingPenaltyTotal,
      breakdown: accruedBreakdown,
    },
  });
});
