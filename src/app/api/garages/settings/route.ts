// GET  /api/garages/settings  — read garage operational settings
// PATCH /api/garages/settings — update garage operational settings

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { garageId }) => {
  const garage = await prisma.garage.findUnique({
    where: { id: garageId },
    select: { fuelRatePerKm: true },
  });
  if (!garage) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ fuelRatePerKm: Number(garage.fuelRatePerKm ?? 6) });
});

export const PATCH = withAuth(async (req, { garageId }) => {
  const body = (await req.json()) as { fuelRatePerKm?: number };
  const data: Record<string, unknown> = {};
  if (body.fuelRatePerKm !== undefined) data.fuelRatePerKm = body.fuelRatePerKm;

  const updated = await prisma.garage.update({
    where: { id: garageId },
    data,
    select: { fuelRatePerKm: true },
  });
  return NextResponse.json({ fuelRatePerKm: Number(updated.fuelRatePerKm ?? 6) });
});
