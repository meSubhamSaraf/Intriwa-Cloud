// GET /api/portal/jobs/[id]
// Returns full detail for a single service request, verified to belong to
// the logged-in customer.

import { NextResponse } from "next/server";
import { createServerConnector } from "@/lib/connectors/supabase-server";
import { prisma } from "@/lib/connectors/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createServerConnector();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const phone = user.phone?.replace(/\D/g, "").slice(-10);
  if (!phone) {
    return NextResponse.json(
      { error: "No phone number on this account" },
      { status: 400 }
    );
  }

  const customer = await prisma.customer.findFirst({
    where: { phone: { endsWith: phone } },
    select: { id: true },
  });

  if (!customer) {
    return NextResponse.json(
      { error: "Not a registered customer" },
      { status: 404 }
    );
  }

  const sr = await prisma.serviceRequest.findFirst({
    where: {
      id,
      customerId: customer.id, // ownership check
    },
    include: {
      vehicle: {
        select: {
          make: true,
          model: true,
          regNumber: true,
          fuelType: true,
          year: true,
        },
      },
      mechanic: {
        select: { name: true },
      },
      items: {
        select: {
          id: true,
          description: true,
          quantity: true,
          unitPrice: true,
          total: true,
          isService: true,
        },
        orderBy: { id: "asc" },
      },
      timelineEvents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          actorName: true,
          body: true,
          fileUrl: true,
          metadata: true,
          createdAt: true,
        },
      },
      invoices: {
        select: {
          id: true,
          invoiceNumber: true,
          subtotal: true,
          taxAmount: true,
          discountAmount: true,
          total: true,
          status: true,
        },
        take: 1,
        orderBy: { createdAt: "desc" as const },
      },
    },
  });

  if (!sr) {
    return NextResponse.json(
      { error: "Job not found or access denied" },
      { status: 404 }
    );
  }

  return NextResponse.json(sr);
}
