// GET  /api/customers  — list customers for the garage
// POST /api/customers  — create a new customer

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { garageId }) => {
  const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);

  const customers = await prisma.customer.findMany({
    where: { garageId },
    include: {
      vehicles: true,
      serviceRequests: {
        orderBy: { openedAt: "desc" },
        take: 1,
        select: { openedAt: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    customers.map((c) => {
      const lastOpened = c.serviceRequests[0]?.openedAt ?? null;
      return {
        ...c,
        serviceRequests: undefined,
        lastServiceDate: lastOpened?.toISOString() ?? null,
        isActive: lastOpened ? lastOpened >= sixMonthsAgo : false,
      };
    }),
  );
});

export const POST = withAuth(async (req, { garageId }) => {
  const body = await req.json();
  const customer = await prisma.customer.create({
    data: { ...body, garageId },
  });
  return NextResponse.json(customer, { status: 201 });
});
