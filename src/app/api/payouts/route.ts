// GET  /api/payouts          — list all payouts for the garage
// POST /api/payouts          — calculate + create a new payout

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { PayoutService } from "@/lib/services/payout.service";
import type { PayoutStatus } from "@/generated/prisma/client";

const payoutService = new PayoutService();

const VALID_STATUSES: PayoutStatus[] = ["PENDING", "APPROVED", "PAID", "CANCELLED"];

export const GET = withAuth(async (req, { garageId }) => {
  const { searchParams } = new URL(req.url);
  const mechanicId = searchParams.get("mechanicId") ?? undefined;
  const rawStatus = searchParams.get("status");
  const status = VALID_STATUSES.includes(rawStatus as PayoutStatus) ? (rawStatus as PayoutStatus) : undefined;
  const payouts = await payoutService.listByGarage(garageId, { mechanicId, status });
  return NextResponse.json(payouts);
});

export const POST = withAuth(async (req, { garageId }) => {
  const { mechanicId, periodStart, periodEnd } = await req.json();
  const payout = await payoutService.createPayout(
    garageId,
    mechanicId,
    new Date(periodStart),
    new Date(periodEnd)
  );
  return NextResponse.json(payout, { status: 201 });
});
