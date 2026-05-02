// GET   /api/vehicles/[id]  — vehicle with customer and service history
// PATCH /api/vehicles/[id]  — update vehicle details

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuthParams<{ id: string }>(async (_req, _ctx, { id }) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      customer: true,
      serviceRequests: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(vehicle);
});

export const PATCH = withAuthParams<{ id: string }>(async (req, _ctx, { id }) => {
  const body = await req.json();
  const updated = await prisma.vehicle.update({ where: { id }, data: body });
  return NextResponse.json(updated);
});
