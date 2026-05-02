// GET  /api/inventory  — list all active items for the garage
// POST /api/inventory  — create a new inventory item

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { InventoryService } from "@/lib/services/inventory.service";
import { prisma } from "@/lib/connectors/prisma";

const inventoryService = new InventoryService();

export const GET = withAuth(async (_req, { garageId }) => {
  const items = await inventoryService.listByGarage(garageId);
  return NextResponse.json(items);
});

export const POST = withAuth(async (req, { garageId }) => {
  const body = await req.json();
  const item = await prisma.inventoryItem.create({
    data: { ...body, garageId },
  });
  return NextResponse.json(item, { status: 201 });
});
