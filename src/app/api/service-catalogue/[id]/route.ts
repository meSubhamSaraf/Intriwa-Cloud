// PATCH  /api/service-catalogue/[id] — update item
// DELETE /api/service-catalogue/[id] — delete item

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const PATCH = withAuthParams<{ id: string }>(async (req, { garageId }, { id }) => {
  const item = await prisma.serviceCatalogueItem.findFirst({ where: { id, garageId } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.serviceCatalogueItem.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.basePrice !== undefined && { basePrice: body.basePrice }),
      ...(body.durationMinutes !== undefined && { durationMinutes: body.durationMinutes }),
      ...(body.warrantyDays !== undefined && { warrantyDays: body.warrantyDays }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });
  return NextResponse.json(updated);
});

export const DELETE = withAuthParams<{ id: string }>(async (_req, { garageId }, { id }) => {
  const item = await prisma.serviceCatalogueItem.findFirst({ where: { id, garageId } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.serviceCatalogueItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
