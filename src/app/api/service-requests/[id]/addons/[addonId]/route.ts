// PATCH /api/service-requests/[id]/addons/[addonId]
// Ops sets selling price and approves/rejects a mechanic-added part.
// Body: { sellingPrice?: number, status?: "APPROVED" | "REJECTED" }

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

type Params = { id: string; addonId: string };

export const PATCH = withAuthParams<Params>(async (req, _ctx, { id, addonId }) => {
  const addon = await prisma.addOn.findUnique({ where: { id: addonId } });
  if (!addon || addon.serviceRequestId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const existing = (() => { try { return JSON.parse(addon.notes ?? "{}"); } catch { return {}; } })();

  const updatedNotes = JSON.stringify({
    ...existing,
    ...(body.sellingPrice != null ? { sellingPrice: Number(body.sellingPrice) } : {}),
  });

  const updated = await prisma.addOn.update({
    where: { id: addonId },
    data: {
      notes: updatedNotes,
      ...(body.status ? { status: body.status } : {}),
      ...(body.status === "APPROVED" ? { approvedAt: new Date() } : {}),
      ...(body.status === "REJECTED" ? { rejectedAt: new Date() } : {}),
    },
  });

  return NextResponse.json(updated);
});
