// GET  /api/garages  — list all garages (SUPER_ADMIN only)
// POST /api/garages  — create a new garage (SUPER_ADMIN only)

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { GarageService } from "@/lib/services/garage.service";

const garageService = new GarageService();

export const GET = withAuth(async (_req, { profile }) => {
  if (profile.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [garages, stats] = await Promise.all([
    garageService.listAll(),
    garageService.getStats(),
  ]);
  return NextResponse.json({ garages, stats });
});

export const POST = withAuth(async (req, { profile }) => {
  if (profile.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const garage = await garageService.create(body);
  return NextResponse.json(garage, { status: 201 });
});
