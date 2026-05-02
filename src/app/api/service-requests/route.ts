// GET  /api/service-requests        — list all SRs for the caller's garage
// POST /api/service-requests        — create a new service request

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { ServiceRequestService } from "@/lib/services/service-request.service";

const srService = new ServiceRequestService();

export const GET = withAuth(async (_req, { garageId }) => {
  const list = await srService.listByGarage(garageId);
  return NextResponse.json(list);
});

export const POST = withAuth(async (req, { garageId }) => {
  const body = await req.json();
  const sr = await srService.create({
    garageId,
    customerId:   body.customerId   || undefined,
    vehicleId:    body.vehicleId    || undefined,
    societyId:    body.societyId    || undefined,
    mechanicId:   body.mechanicId   || undefined,
    locationType: body.locationType || undefined,
    complaint:    body.complaint    || undefined,
    scheduledAt:  body.scheduledAt  ? new Date(body.scheduledAt) : undefined,
    notes:        body.notes        || undefined,
  });
  return NextResponse.json(sr, { status: 201 });
});
