// GET   /api/mechanics/[id]  — mechanic with skills, recent jobs, attendance
// PATCH /api/mechanics/[id]  — update mechanic details

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuthParams<{ id: string }>(async (_req, _ctx, { id }) => {
  const mechanic = await prisma.mechanic.findUnique({
    where: { id },
    include: {
      skills: { include: { mechanic: true } },
      serviceRequests: { orderBy: { createdAt: "desc" }, take: 10 },
      attendanceRecords: { orderBy: { date: "desc" }, take: 30 },
    },
  });
  if (!mechanic) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(mechanic);
});

export const PATCH = withAuthParams<{ id: string }>(async (req, _ctx, { id }) => {
  const body = await req.json();
  const updated = await prisma.mechanic.update({ where: { id }, data: body });
  return NextResponse.json(updated);
});
