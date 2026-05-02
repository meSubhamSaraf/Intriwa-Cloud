// POST /api/service-requests/[id]/inventory — attach an inventory item to an SR

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const POST = withAuthParams<{ id: string }>(async (req, _ctx, { id }) => {
  const { inventoryItemId, quantity } = await req.json();
  const qty = Number(quantity) || 1;

  const invItem = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
  if (!invItem) return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });

  const unitPrice = Number(invItem.unitPrice) || 0;
  const usage = await prisma.sRInventoryUsage.create({
    data: {
      serviceRequestId: id,
      inventoryItemId,
      quantity:  qty,
      unitPrice,
      total: unitPrice * qty,
    },
    include: { inventoryItem: { select: { id: true, name: true } } },
  });
  return NextResponse.json(usage, { status: 201 });
});
