// GET /api/mechanics/[id]/audit
// Returns the full audit log for a mechanic profile.

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuthParams<{ id: string }>(async (_req, _ctx, { id }) => {
  const logs = await prisma.mechanicAuditLog.findMany({
    where: { mechanicId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(logs);
});
