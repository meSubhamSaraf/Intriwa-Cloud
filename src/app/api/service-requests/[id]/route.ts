// GET   /api/service-requests/[id]  — fetch SR with all relations
// PATCH /api/service-requests/[id]  — update status, mechanic, diagnosis, notes

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { ServiceRequestService } from "@/lib/services/service-request.service";
import { prisma } from "@/lib/connectors/prisma";

const srService = new ServiceRequestService();

export const GET = withAuthParams<{ id: string }>(async (_req, _ctx, { id }) => {
  const sr = await srService.getById(id);
  if (!sr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sr);
});

export const PATCH = withAuthParams<{ id: string }>(async (req, { garageId, profile }, { id }) => {
  const body = await req.json();

  if (body.status) {
    const updated = await srService.updateStatus(id, body.status, profile.id, profile.name);

    const extraData: Record<string, unknown> = {};

    // kmBefore: vehicle odometer captured when mechanic starts the job
    if (body.kmBefore !== undefined) {
      extraData.kmBefore = Number(body.kmBefore);
    }

    // kmAfter: vehicle odometer captured when mechanic completes the job
    if (body.kmAfter !== undefined) {
      extraData.kmAfter = Number(body.kmAfter);
      // Propagate the latest odometer reading back to the vehicle record
      const sr = await prisma.serviceRequest.findUnique({ where: { id }, select: { vehicleId: true } });
      if (sr?.vehicleId) {
        await prisma.vehicle.update({ where: { id: sr.vehicleId }, data: { odometer: Number(body.kmAfter) } });
      }
    }

    // kmTravelled: mechanic travel distance (field/society fuel allowance)
    if (body.kmTravelled !== undefined) {
      const garage = await prisma.garage.findUnique({ where: { id: garageId }, select: { fuelRatePerKm: true } });
      const rate = Number(garage?.fuelRatePerKm ?? 6);
      extraData.kmTravelled = Number(body.kmTravelled);
      extraData.fuelAllowance = Number(body.kmTravelled) * rate;
    }

    if (Object.keys(extraData).length > 0) {
      await prisma.serviceRequest.update({ where: { id }, data: extraData });
    }

    return NextResponse.json(updated);
  }

  const updated = await prisma.serviceRequest.update({ where: { id }, data: body });
  return NextResponse.json(updated);
});
