// GET  /api/profile  — return the current user's Profile row
// PATCH /api/profile — update name / phone

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { userId }) => {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(profile);
});

export const PATCH = withAuth(async (req, { userId }) => {
  const { name, phone } = await req.json() as { name?: string; phone?: string };
  const updated = await prisma.profile.update({
    where: { id: userId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
    },
  });
  return NextResponse.json(updated);
});
