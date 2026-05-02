// GET  /api/purchase-orders  — list all vendor purchase orders for the garage
// POST /api/purchase-orders  — create a new purchase order (vendor payout entry)

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { garageId }) => {
  const orders = await prisma.purchaseOrder.findMany({
    where: { garageId },
    include: { items: { include: { inventoryItem: { select: { id: true, name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
});

export const POST = withAuth(async (req, { garageId }) => {
  const body = await req.json();
  const order = await prisma.purchaseOrder.create({
    data: {
      garageId,
      vendorName:  body.vendorName,
      billNumber:  body.billNumber  || null,
      billDate:    body.billDate    ? new Date(body.billDate) : null,
      totalAmount: body.totalAmount || null,
      notes:       body.notes       || null,
    },
    include: { items: true },
  });
  return NextResponse.json(order, { status: 201 });
});
