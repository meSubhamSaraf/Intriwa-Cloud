// POST /api/mechanics/[id]/availability
// Toggles the mechanic's online/offline status.
// Called by the mechanic portal on clock-in / clock-out.

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";
import { logMechanicChanges } from "@/lib/services/mechanic-audit.service";

export const POST = withAuthParams<{ id: string }>(async (req, { profile }, { id }) => {
  const { isAvailable } = await req.json();

  const before = await prisma.mechanic.findUniqueOrThrow({ where: { id } });

  const updated = await prisma.mechanic.update({
    where: { id },
    data: { isAvailable, lastSeenAt: new Date() },
  });

  await logMechanicChanges(
    id,
    { isAvailable: before.isAvailable },
    { isAvailable },
    profile.id,
    profile.name
  );

  return NextResponse.json({ isAvailable: updated.isAvailable });
});
