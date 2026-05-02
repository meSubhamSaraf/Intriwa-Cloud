// PATCH /api/purchase-orders/[id] — update bill URL, amount, status

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const PATCH = withAuthParams<{ id: string }>(async (req, _ctx, { id }) => {
  const body = await req.json();
  const order = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      ...(body.billFileUrl  !== undefined && { billFileUrl:  body.billFileUrl }),
      ...(body.billNumber   !== undefined && { billNumber:   body.billNumber }),
      ...(body.billDate     !== undefined && { billDate:     body.billDate ? new Date(body.billDate) : null }),
      ...(body.totalAmount  !== undefined && { totalAmount:  body.totalAmount }),
      ...(body.notes        !== undefined && { notes:        body.notes }),
    },
    include: { items: { include: { inventoryItem: { select: { id: true, name: true } } } } },
  });
  return NextResponse.json(order);
});

export const DELETE = withAuthParams<{ id: string }>(async (_req, _ctx, { id }) => {
  await prisma.purchaseOrder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
