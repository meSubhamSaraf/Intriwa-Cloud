// GET  /api/service-catalogue — list items for garage
// POST /api/service-catalogue — create new item

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { garageId }) => {
  const items = await prisma.serviceCatalogueItem.findMany({
    where: { garageId },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(items);
});

export const POST = withAuth(async (req, { garageId }) => {
  const body = await req.json();
  const item = await prisma.serviceCatalogueItem.create({
    data: {
      garageId,
      name: body.name,
      category: body.category,
      basePrice: body.basePrice,
      durationMinutes: body.durationMinutes ?? 60,
      warrantyDays: body.warrantyDays ?? null,
      description: body.description ?? null,
      isActive: true,
    },
  });
  return NextResponse.json(item, { status: 201 });
});
