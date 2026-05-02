// GET /api/mechanics/[id]/earnings
// Returns payout history + earnings summary for a mechanic.
// Used by both ops manager and mechanic portal.

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { PayoutService } from "@/lib/services/payout.service";

const payoutService = new PayoutService();

export const GET = withAuthParams<{ id: string }>(async (_req, _ctx, { id }) => {
  const [payouts, summary] = await Promise.all([
    payoutService.listByMechanic(id),
    payoutService.earningsSummary(id),
  ]);
  return NextResponse.json({ payouts, summary });
});
