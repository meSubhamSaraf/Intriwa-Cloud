// POST /api/service-requests/[id]/invoice
// Closes the SR, raises an invoice, and deducts inventory stock.

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { ServiceRequestService } from "@/lib/services/service-request.service";

const srService = new ServiceRequestService();

export const POST = withAuthParams<{ id: string }>(async (_req, { profile }, { id }) => {
  const invoice = await srService.closeAndInvoice(id, profile.id, profile.name);
  return NextResponse.json(invoice, { status: 201 });
});
