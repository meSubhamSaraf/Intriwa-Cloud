// GET  /api/observations  — list observations for the garage (filterable by customerId, status)
// POST /api/observations  — create a new observation

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (req, { garageId }) => {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId") ?? undefined;
  const srId       = searchParams.get("srId")       ?? undefined;
  const status     = searchParams.get("status")     ?? undefined;

  const observations = await prisma.customerObservation.findMany({
    where: {
      garageId,
      ...(customerId ? { customerId } : {}),
      ...(srId       ? { srId }       : {}),
      ...(status     ? { status: status as never } : {}),
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      vehicle:  { select: { id: true, make: true, model: true, regNumber: true } },
      raisedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(observations);
});

export const POST = withAuth(async (req, { garageId }) => {
  const body = await req.json();

  // Encode follow-up data into followUpNote JSON (no separate DB column needed)
  // If followUpNote is already a JSON string (e.g. from field view with img), use it directly.
  // Otherwise, build from individual fields.
  let followUpNote: string | null = null;
  if (body.followUpNote) {
    // Check if it's already valid JSON (pre-serialized by client)
    try {
      const parsed = JSON.parse(body.followUpNote);
      // If it's an object, use it as-is (already formatted JSON)
      if (typeof parsed === "object" && parsed !== null) {
        // Merge with any additional fields
        if (body.followUpAt) parsed.d = String(body.followUpAt);
        followUpNote = JSON.stringify(parsed);
      } else {
        throw new Error("not object");
      }
    } catch {
      // Plain string note — wrap it
      const obj: Record<string, string> = { n: String(body.followUpNote) };
      if (body.followUpAt) obj.d = String(body.followUpAt);
      followUpNote = JSON.stringify(obj);
    }
  } else if (body.followUpAt) {
    followUpNote = JSON.stringify({ d: String(body.followUpAt) });
  }

  const obs = await prisma.customerObservation.create({
    data: {
      garageId,
      customerId:    body.customerId,
      vehicleId:     body.vehicleId     || null,
      srId:          body.srId          || null,
      raisedById:    body.raisedById    || null,
      raisedByName:  body.raisedByName  || null,
      description:   body.description,
      severity:      body.severity      || "ROUTINE",
      estimatedCost: body.estimatedCost ? Number(body.estimatedCost) : null,
      followUpNote,
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      vehicle:  { select: { id: true, make: true, model: true, regNumber: true } },
      raisedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(obs, { status: 201 });
});
