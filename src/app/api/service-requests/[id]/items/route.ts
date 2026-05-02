// POST  /api/service-requests/[id]/items  — add a service item
// PATCH /api/service-requests/[id]/items  — update an item (e.g. assign mechanic)

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const POST = withAuthParams<{ id: string }>(async (req, _ctx, { id }) => {
  const body = await req.json();
  const unitPrice = Number(body.unitPrice) || 0;
  const quantity  = Number(body.quantity)  || 1;
  const item = await prisma.serviceItem.create({
    data: {
      serviceRequestId:   id,
      description:        body.description,
      quantity,
      unitPrice,
      total:              unitPrice * quantity,
      assignedMechanicId: body.assignedMechanicId || null,
    },
    include: { assignedMechanic: { select: { id: true, name: true } } },
  });
  return NextResponse.json(item, { status: 201 });
});

export const PATCH = withAuthParams<{ id: string }>(async (req, _ctx, { id: _srId }) => {
  const { itemId, assignedMechanicId } = await req.json();
  const item = await prisma.serviceItem.update({
    where: { id: itemId },
    data:  { assignedMechanicId: assignedMechanicId || null },
    include: { assignedMechanic: { select: { id: true, name: true } } },
  });
  return NextResponse.json(item);
});
