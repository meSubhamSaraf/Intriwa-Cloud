// GET  /api/vehicles  — list all vehicles for the garage (via customer relation)
// POST /api/vehicles  — add a vehicle to a customer

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { garageId }) => {
  const vehicles = await prisma.vehicle.findMany({
    where: { customer: { garageId } },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(vehicles);
});

export const POST = withAuth(async (req, _ctx) => {
  const body = await req.json();
  const vehicle = await prisma.vehicle.create({ data: body });
  return NextResponse.json(vehicle, { status: 201 });
});
