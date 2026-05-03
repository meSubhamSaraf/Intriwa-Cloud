// GET  /api/service-requests/[id]/addons  — list aftermarket parts added by mechanic
// POST /api/service-requests/[id]/addons  — mechanic adds a purchased part
//
// Notes field JSON shape: { photoUrl?: string, sellingPrice?: number }
// estimatedCost = purchase price (what mechanic paid)
// sellingPrice (in notes) = what ops charges the customer after markup

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuthParams<{ id: string }>(async (_req, _ctx, { id }) => {
  const addons = await prisma.addOn.findMany({
    where: { serviceRequestId: id },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(addons);
});

export const POST = withAuthParams<{ id: string }>(async (req, { garageId }, { id }) => {
  const sr = await prisma.serviceRequest.findUnique({ where: { id }, select: { garageId: true } });
  if (!sr || sr.garageId !== garageId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { description, purchasePrice, quantity = 1, photoUrl } = await req.json();
  if (!description || !purchasePrice) {
    return NextResponse.json({ error: "description and purchasePrice are required" }, { status: 422 });
  }

  const notes = JSON.stringify({ photoUrl: photoUrl ?? null, sellingPrice: null, quantity });

  const addon = await prisma.addOn.create({
    data: {
      serviceRequestId: id,
      description: description.trim(),
      estimatedCost: Number(purchasePrice),
      status: "PENDING",
      notes,
    },
  });

  return NextResponse.json(addon, { status: 201 });
});
