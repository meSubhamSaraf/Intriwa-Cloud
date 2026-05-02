// POST /api/mechanics/[id]/location
// Receives a location ping from the mechanic's device (every 60s).
// Saves to lastLocation on the mechanic row + appends to history log.

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const POST = withAuthParams<{ id: string }>(async (req, _ctx, { id }) => {
  const { lat, lng, accuracy } = await req.json();

  const locationSnapshot = { lat, lng, accuracy, timestamp: new Date().toISOString() };

  await Promise.all([
    // Update the "last known position" on the mechanic row
    prisma.mechanic.update({
      where: { id },
      data: { lastLocation: locationSnapshot, lastSeenAt: new Date() },
    }),
    // Append to rolling history (purge old records separately via a cron)
    prisma.mechanicLocationHistory.create({
      data: { mechanicId: id, lat, lng, accuracy },
    }),
  ]);

  return NextResponse.json({ ok: true });
});
