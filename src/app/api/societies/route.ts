// GET  /api/societies  — list societies for the garage with SR and customer counts
// POST /api/societies  — create a new society

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { garageId }) => {
  const societies = await prisma.society.findMany({
    where: { garageId },
    include: {
      _count: { select: { serviceRequests: true, customers: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(societies);
});

export const POST = withAuth(async (req, { garageId }) => {
  const body = await req.json();
  const { name, address, contactName, contactPhone, vehicleCount, visitDay, notes } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const society = await prisma.society.create({
    data: {
      garageId,
      name,
      address: address ?? undefined,
      contactName: contactName ?? undefined,
      contactPhone: contactPhone ?? undefined,
      vehicleCount: vehicleCount ?? undefined,
      visitDay: visitDay ?? undefined,
      notes: notes ?? undefined,
    },
  });

  return NextResponse.json(society, { status: 201 });
});
