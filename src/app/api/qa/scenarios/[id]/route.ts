// PATCH /api/qa/scenarios/[id]  — update status / title / description
// DELETE /api/qa/scenarios/[id] — remove a scenario

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const PATCH = withAuthParams(async (req, { garageId, params }) => {
  const { id } = await params;
  const body = await req.json();
  const scenario = await prisma.qAScenario.updateMany({
    where: { id, garageId },
    data: {
      ...(body.title       !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status      !== undefined && { status: body.status }),
      ...(body.priority    !== undefined && { priority: body.priority }),
      ...(body.lastRunAt   !== undefined && { lastRunAt: new Date(body.lastRunAt) }),
    },
  });
  if (scenario.count === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
});

export const DELETE = withAuthParams(async (_req, { garageId, params }) => {
  const { id } = await params;
  await prisma.qAScenario.deleteMany({ where: { id, garageId } });
  return NextResponse.json({ ok: true });
});
