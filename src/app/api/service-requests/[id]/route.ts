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

export const PATCH = withAuthParams<{ id: string }>(async (req, { profile }, { id }) => {
  const body = await req.json();

  if (body.status) {
    const updated = await srService.updateStatus(id, body.status, profile.id, profile.name);
    return NextResponse.json(updated);
  }

  const updated = await prisma.serviceRequest.update({ where: { id }, data: body });
  return NextResponse.json(updated);
});
