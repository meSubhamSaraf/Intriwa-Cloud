// GET /api/invoices — list all invoices for the garage

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { garageId }) => {
  const invoices = await prisma.invoice.findMany({
    where: { garageId },
    include: {
      serviceRequest: {
        select: {
          srNumber: true,
          customer: { select: { name: true, phone: true } },
        },
      },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invoices);
});
