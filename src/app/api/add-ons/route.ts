// GET /api/add-ons?status=PENDING — list add-ons for the garage (optionally filtered by status)

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";
import type { AddOnStatus } from "@/generated/prisma/client";

export const GET = withAuth(async (req, { garageId }) => {
  const rawStatus = new URL(req.url).searchParams.get("status");
  const statusFilter = rawStatus ? (rawStatus.toUpperCase() as AddOnStatus) : undefined;

  const addOns = await prisma.addOn.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      serviceRequest: { garageId },
    },
    include: {
      serviceRequest: {
        select: {
          id: true,
          srNumber: true,
          customer: { select: { id: true, name: true, phone: true } },
          vehicle: { select: { id: true, make: true, model: true, regNumber: true } },
        },
      },
    },
    orderBy: { id: "desc" },
    take: 50,
  });

  return NextResponse.json(addOns);
});
