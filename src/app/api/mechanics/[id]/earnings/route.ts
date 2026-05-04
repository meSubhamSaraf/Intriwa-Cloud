// GET /api/mechanics/[id]/earnings
// Returns payout history + earnings summary + accrued (unpaid) earnings.
// "Accrued" = closed SRs assigned to this mechanic since last payout end date,
// not yet included in any formal payout record.

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { PayoutService } from "@/lib/services/payout.service";
import { prisma } from "@/lib/connectors/prisma";

const payoutService = new PayoutService();

export const GET = withAuthParams<{ id: string }>(async (_req, _ctx, { id }) => {
  const [payouts, summary, mechanic] = await Promise.all([
    payoutService.listByMechanic(id),
    payoutService.earningsSummary(id),
    prisma.mechanic.findUnique({ where: { id } }),
  ]);

  // Find jobs closed after the last payout period ended (or ever, if no payouts)
  const lastPayout = payouts[0] ?? null;
  const accrualStart = lastPayout
    ? new Date(lastPayout.periodEnd)
    : new Date(0);

  const paidItemIds = mechanic
    ? (
        await prisma.mechanicPayoutItem.findMany({
          where: { payout: { mechanicId: id } },
          select: { serviceItemId: true },
        })
      )
        .map((r) => r.serviceItemId)
        .filter((x): x is string => x !== null)
    : [];

  const accruedItems = mechanic
    ? await prisma.serviceItem.findMany({
        where: {
          // Items assigned at item level OR at SR level (unassigned at item level)
          OR: [
            { assignedMechanicId: id },
            {
              assignedMechanicId: null,
              serviceRequest: { mechanicId: id },
            },
          ],
          serviceRequest: {
            status: "CLOSED",
            closedAt: { gt: accrualStart },
          },
          // Exclude items already included in a formal payout
          NOT: { id: { in: paidItemIds } },
        },
        include: { serviceRequest: { select: { srNumber: true, closedAt: true } } },
      })
    : [];

  // Calculate accrued amount based on mechanic's payout config
  let accrued = 0;
  const accruedBreakdown = accruedItems.map((item) => {
    let amount = 0;
    if (mechanic?.payoutConfigType === "FIXED_PER_ITEM") {
      amount = Number(mechanic.payoutRate ?? 0);
    } else if (mechanic?.payoutConfigType === "PERCENT_OF_ITEM") {
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

  // Pending penalties (not yet included in a payout)
  let pendingPenalties: { amount: { toString(): string } }[] = [];
  try {
    if (mechanic) {
      pendingPenalties = await prisma.mechanicPenalty.findMany({
        where: { mechanicId: id, payoutId: null },
        orderBy: { issuedAt: "desc" },
      });
    }
  } catch {
    // table may not exist in DB yet
  }
  const pendingPenaltyTotal = pendingPenalties.reduce(
    (s, p) => s + Number(p.amount),
    0
  );

  return NextResponse.json({
    payouts,
    summary,
    accrued: {
      amount: accrued,
      penaltyDeductions: pendingPenaltyTotal,
      net: accrued - pendingPenaltyTotal,
      breakdown: accruedBreakdown,
    },
  });
});
