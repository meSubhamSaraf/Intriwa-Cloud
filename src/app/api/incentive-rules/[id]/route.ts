// PATCH  /api/incentive-rules/[id]  — edit a rule
// DELETE /api/incentive-rules/[id]  — deactivate a rule

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const PATCH = withAuthParams<{ id: string }>(async (req, _ctx, { id }) => {
  const body = await req.json();
  const updated = await prisma.incentiveRule.update({ where: { id }, data: body });
  return NextResponse.json(updated);
});

export const DELETE = withAuthParams<{ id: string }>(async (_req, _ctx, { id }) => {
  // Soft-delete: deactivate rather than destroy (preserves historical payouts)
  const updated = await prisma.incentiveRule.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json(updated);
});
