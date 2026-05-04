// GET  /api/mechanics/[id]/penalties — list penalties for a mechanic
// POST /api/mechanics/[id]/penalties — add a penalty (ops manager only)

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuthParams<{ id: string }>(async (_req, { garageId }, { id }) => {
  const penalties = await prisma.mechanicPenalty.findMany({
    where: { mechanicId: id, garageId },
    orderBy: { issuedAt: "desc" },
  });
  return NextResponse.json(penalties);
});

export const POST = withAuthParams<{ id: string }>(async (req, { garageId, profile }, { id }) => {
  if (profile.role === "MECHANIC") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json() as {
    amount: number;
    reason: string;
    category?: string;
    notes?: string;
  };
  if (!body.amount || !body.reason) {
    return NextResponse.json({ error: "amount and reason are required" }, { status: 400 });
  }

  const mechanic = await prisma.mechanic.findFirst({ where: { id, garageId } });
  if (!mechanic) return NextResponse.json({ error: "Mechanic not found" }, { status: 404 });

  const penalty = await prisma.mechanicPenalty.create({
    data: {
      garageId,
      mechanicId: id,
      amount: body.amount,
      reason: body.reason,
      category: (body.category as never) ?? "MISCONDUCT",
      notes: body.notes ?? null,
      issuedById: profile.id,
      issuedByName: profile.name,
    },
  });

  // Log to mechanic audit
  await prisma.mechanicAuditLog.create({
    data: {
      mechanicId: id,
      actorId: profile.id,
      actorName: profile.name,
      field: "penalty",
      oldValue: null,
      newValue: `₹${body.amount} — ${body.reason}`,
    },
  });

  return NextResponse.json(penalty, { status: 201 });
});
