// POST /api/service-requests/[id]/invoice
// Closes the SR, raises an invoice, and deducts inventory stock.

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { ServiceRequestService } from "@/lib/services/service-request.service";

const srService = new ServiceRequestService();

export const POST = withAuthParams<{ id: string }>(async (req, { profile }, { id }) => {
  const body = await req.json().catch(() => ({})) as { discountAmount?: number };
  const invoice = await srService.closeAndInvoice(id, profile.id, profile.name, {
    discountAmount: body.discountAmount ? Number(body.discountAmount) : 0,
  });
  return NextResponse.json(invoice, { status: 201 });
});
