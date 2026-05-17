// PATCH  /api/qa/issues/[id]  — update status, priority, etc.
// DELETE /api/qa/issues/[id]  — remove issue

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const PATCH = withAuthParams<{ id: string }>(async (req, { garageId }, { id }) => {
  const body = await req.json();
  const result = await prisma.qAIssue.updateMany({
    where: { id, garageId },
    data: {
      ...(body.title       !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.type        !== undefined && { type: body.type }),
      ...(body.priority    !== undefined && { priority: body.priority }),
      ...(body.status      !== undefined && { status: body.status }),
    },
  });
  if (result.count === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
});

export const DELETE = withAuthParams<{ id: string }>(async (_req, { garageId }, { id }) => {
  await prisma.qAIssue.deleteMany({ where: { id, garageId } });
  return NextResponse.json({ ok: true });
});
