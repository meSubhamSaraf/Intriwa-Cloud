// GET   /api/leads/[id]  — lead with all follow-ups and optional customer
// PATCH /api/leads/[id]  — update lead fields

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuthParams<{ id: string }>(async (_req, { garageId }, { id }) => {
  const lead = await prisma.lead.findUnique({
    where: { id, garageId },
    include: {
      followUps: { orderBy: { createdAt: "desc" } },
      customer: true,
    },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
});

export const PATCH = withAuthParams<{ id: string }>(async (req, { garageId }, { id }) => {
  const body = await req.json();
  const { status, notes, neighbourhood, assignedOpsId, followUpAt, source, vehicleInfo } = body;

  const updated = await prisma.lead.update({
    where: { id, garageId },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(neighbourhood !== undefined ? { neighbourhood } : {}),
      ...(assignedOpsId !== undefined ? { assignedOpsId } : {}),
      ...(followUpAt !== undefined ? { followUpAt: followUpAt ? new Date(followUpAt) : null } : {}),
      ...(source !== undefined ? { source } : {}),
      ...(vehicleInfo !== undefined
        ? { vehicleInfo: typeof vehicleInfo === "object" ? JSON.stringify(vehicleInfo) : vehicleInfo }
        : {}),
    },
  });

  return NextResponse.json(updated);
});
