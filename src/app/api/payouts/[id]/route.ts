// GET   /api/payouts/[id]          — payout detail
// PATCH /api/payouts/[id]          — approve or mark paid

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { PayoutService } from "@/lib/services/payout.service";

const payoutService = new PayoutService();

export const GET = withAuthParams<{ id: string }>(async (_req, _ctx, { id }) => {
  const payout = await payoutService.listByGarage("", {}).then(() =>
    // fetch individual payout with full breakdown
    import("@/lib/connectors/prisma").then(({ prisma }) =>
      prisma.mechanicPayout.findUnique({
        where: { id },
        include: { mechanic: true, items: true, incentives: true },
      })
    )
  );
  if (!payout) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(payout);
});

export const PATCH = withAuthParams<{ id: string }>(async (req, { profile }, { id }) => {
  const body = await req.json();
  const { action } = body;

  if (action === "approve") {
    const updated = await payoutService.approvePayout(id, profile.id);
    return NextResponse.json(updated);
  }

  if (action === "mark_paid") {
    const updated = await payoutService.markPaid(id, body.paymentMethod, body.cashfreeTransferId);
    return NextResponse.json(updated);
  }

  if (action === "toggle_item") {
    const { prisma } = await import("@/lib/connectors/prisma");
    const updated = await prisma.mechanicPayoutItem.update({
      where: { id: body.itemId },
      data: { isPaid: body.isPaid, paidAt: body.isPaid ? new Date() : null },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
});
