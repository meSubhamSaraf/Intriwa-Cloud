// POST /api/leads/[id]/follow-ups — create a follow-up and optionally update lead.followUpAt

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const POST = withAuthParams<{ id: string }>(async (req, { garageId, profile }, { id }) => {
  const body = await req.json();
  const { note, scheduledAt } = body;

  if (!note) {
    return NextResponse.json({ error: "note is required" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id, garageId }, select: { id: true } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [followUp] = await prisma.$transaction([
    prisma.followUp.create({
      data: {
        leadId: id,
        actorId: profile.id,
        note,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      },
    }),
    ...(scheduledAt
      ? [prisma.lead.update({ where: { id }, data: { followUpAt: new Date(scheduledAt) } })]
      : []),
  ]);

  return NextResponse.json(followUp, { status: 201 });
});
