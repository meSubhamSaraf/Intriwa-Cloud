// GET    /api/packages/[id] — fetch single package with items
// PATCH  /api/packages/[id] — update package fields + replace items
// DELETE /api/packages/[id] — soft delete (set isActive=false)

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuthParams<{ id: string }>(async (_req, { garageId }, { id }) => {
  const pkg = await prisma.servicePackage.findFirst({
    where: { id, garageId },
    include: { items: true },
  });
  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pkg);
});

export const PATCH = withAuthParams<{ id: string }>(async (req, { garageId }, { id }) => {
  const pkg = await prisma.servicePackage.findFirst({ where: { id, garageId } });
  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { items, ...fields } = body as {
    name?: string;
    description?: string;
    packagePrice?: number;
    durationMinutes?: number;
    isActive?: boolean;
    items?: {
      description: string;
      mrpPrice: number;
      quantity?: number;
      inventoryItemId?: string;
    }[];
  };

  const updated = await prisma.servicePackage.update({
    where: { id },
    data: {
      ...fields,
      // Replace items only if provided
      ...(items !== undefined
        ? {
            items: {
              deleteMany: {},
              create: items.map((item) => ({
                description: item.description,
                mrpPrice: item.mrpPrice,
                quantity: item.quantity ?? 1,
                inventoryItemId: item.inventoryItemId ?? null,
                isLabour: (item as { isLabour?: boolean }).isLabour ?? false,
              })),
            },
          }
        : {}),
    },
    include: { items: true },
  });

  return NextResponse.json(updated);
});

export const DELETE = withAuthParams<{ id: string }>(async (_req, { garageId }, { id }) => {
  const pkg = await prisma.servicePackage.findFirst({ where: { id, garageId } });
  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.servicePackage.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json(updated);
});
