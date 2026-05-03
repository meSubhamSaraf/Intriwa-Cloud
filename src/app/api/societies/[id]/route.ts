// GET   /api/societies/[id]  — society detail with customers, recent SRs, counts
// PATCH /api/societies/[id]  — update society fields

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuthParams<{ id: string }>(async (_req, { garageId }, { id }) => {
  const society = await prisma.society.findUnique({
    where: { id, garageId },
    include: {
      customers: {
        include: {
          _count: { select: { vehicles: true } },
        },
      },
      serviceRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          customer: { select: { id: true, name: true } },
          vehicle: { select: { id: true, make: true, model: true, regNumber: true } },
        },
      },
      _count: { select: { serviceRequests: true, customers: true } },
    },
  });
  if (!society) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(society);
});

export const PATCH = withAuthParams<{ id: string }>(async (req, { garageId }, { id }) => {
  const body = await req.json();
  const { name, address, contactName, contactPhone, vehicleCount, visitDay, notes } = body;

  const updated = await prisma.society.update({
    where: { id, garageId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(contactName !== undefined ? { contactName } : {}),
      ...(contactPhone !== undefined ? { contactPhone } : {}),
      ...(vehicleCount !== undefined ? { vehicleCount } : {}),
      ...(visitDay !== undefined ? { visitDay } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });

  return NextResponse.json(updated);
});
