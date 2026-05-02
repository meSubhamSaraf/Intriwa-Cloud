// GET   /api/customers/[id]  — customer with vehicles and service history
// PATCH /api/customers/[id]  — update customer details

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuthParams<{ id: string }>(async (_req, _ctx, { id }) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      vehicles: {
        include: {
          serviceRequests: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      },
      leads: true,
    },
  });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(customer);
});

export const PATCH = withAuthParams<{ id: string }>(async (req, _ctx, { id }) => {
  const body = await req.json();
  const updated = await prisma.customer.update({ where: { id }, data: body });
  return NextResponse.json(updated);
});
