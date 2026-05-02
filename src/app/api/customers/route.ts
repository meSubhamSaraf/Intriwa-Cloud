// GET  /api/customers  — list customers for the garage
// POST /api/customers  — create a new customer

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { garageId }) => {
  const customers = await prisma.customer.findMany({
    where: { garageId },
    include: { vehicles: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(customers);
});

export const POST = withAuth(async (req, { garageId }) => {
  const body = await req.json();
  const customer = await prisma.customer.create({
    data: { ...body, garageId },
  });
  return NextResponse.json(customer, { status: 201 });
});
