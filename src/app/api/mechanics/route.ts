// GET  /api/mechanics  — list active mechanics for the garage
// POST /api/mechanics  — add a new mechanic

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { garageId }) => {
  const mechanics = await prisma.mechanic.findMany({
    where: { garageId, isActive: true },
    include: { skills: { include: { mechanic: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(mechanics);
});

export const POST = withAuth(async (req, { garageId }) => {
  const body = await req.json();
  const mechanic = await prisma.mechanic.create({
    data: { ...body, garageId },
  });
  return NextResponse.json(mechanic, { status: 201 });
});
