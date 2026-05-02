// PATCH /api/observations/[id] — update status, followUpNote, convertedSrId

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const PATCH = withAuthParams<{ id: string }>(async (req, _ctx, { id }) => {
  const body = await req.json();

  const obs = await prisma.customerObservation.update({
    where: { id },
    data: {
      ...(body.status        !== undefined ? { status: body.status } : {}),
      ...(body.followUpNote  !== undefined ? { followUpNote: body.followUpNote } : {}),
      ...(body.convertedSrId !== undefined ? { convertedSrId: body.convertedSrId } : {}),
      ...(body.estimatedCost !== undefined ? { estimatedCost: Number(body.estimatedCost) } : {}),
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      vehicle:  { select: { id: true, make: true, model: true, regNumber: true } },
      raisedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(obs);
});
