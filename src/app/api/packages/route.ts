// GET  /api/packages — list all active packages for the garage (with items)
// POST /api/packages — create a package with items

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { garageId }) => {
  const packages = await prisma.servicePackage.findMany({
    where: { garageId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(packages);
});

export const POST = withAuth(async (req, { garageId }) => {
  const body = await req.json();
  const { name, description, packagePrice, durationMinutes, items = [] } = body as {
    name: string;
    description?: string;
    packagePrice: number;
    durationMinutes?: number;
    items: {
      description: string;
      mrpPrice: number;
      quantity?: number;
      inventoryItemId?: string;
    }[];
  };

  if (!name || packagePrice == null) {
    return NextResponse.json({ error: "name and packagePrice are required" }, { status: 400 });
  }

  const pkg = await prisma.servicePackage.create({
    data: {
      garageId,
      name,
      description,
      packagePrice,
      ...(durationMinutes != null ? { durationMinutes } : {}),
      items: {
        create: items.map((item) => ({
          description: item.description,
          mrpPrice: item.mrpPrice,
          quantity: item.quantity ?? 1,
          inventoryItemId: item.inventoryItemId ?? null,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(pkg, { status: 201 });
});
