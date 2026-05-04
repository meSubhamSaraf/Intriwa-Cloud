// GET  /api/observations  — list observations for the garage (filterable by customerId, status)
// POST /api/observations  — create a new observation

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (req, { garageId }) => {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId") ?? undefined;
  const status     = searchParams.get("status") ?? undefined;

  const observations = await prisma.customerObservation.findMany({
    where: {
      garageId,
      ...(customerId ? { customerId } : {}),
      ...(status     ? { status: status as never } : {}),
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      vehicle:  { select: { id: true, make: true, model: true, regNumber: true } },
      raisedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(observations);
});

export const POST = withAuth(async (req, { garageId }) => {
  const body = await req.json();

  // Encode follow-up date into followUpNote (no separate DB column needed)
  let followUpNote: string | null = null;
  if (body.followUpAt || body.followUpNote) {
    const obj: Record<string, string> = {};
    if (body.followUpAt) obj.d = String(body.followUpAt);
    if (body.followUpNote) obj.n = String(body.followUpNote);
    followUpNote = JSON.stringify(obj);
  }

  const obs = await prisma.customerObservation.create({
    data: {
      garageId,
      customerId:    body.customerId,
      vehicleId:     body.vehicleId     || null,
      srId:          body.srId          || null,
      raisedById:    body.raisedById    || null,
      raisedByName:  body.raisedByName  || null,
      description:   body.description,
      severity:      body.severity      || "ROUTINE",
      estimatedCost: body.estimatedCost ? Number(body.estimatedCost) : null,
      followUpNote,
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      vehicle:  { select: { id: true, make: true, model: true, regNumber: true } },
      raisedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(obs, { status: 201 });
});
