// GET /api/portal/jobs
// Returns all completed or ready service requests for the logged-in customer.
// Optional query param: ?vehicleId=<id> to filter by vehicle.

import { NextRequest, NextResponse } from "next/server";
import { createServerConnector } from "@/lib/connectors/supabase-server";
import { prisma } from "@/lib/connectors/prisma";

export async function GET(req: NextRequest) {
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

  const vehicleId = req.nextUrl.searchParams.get("vehicleId");

  const jobs = await prisma.serviceRequest.findMany({
    where: {
      customerId: customer.id,
      status: { in: ["READY", "CLOSED"] },
      ...(vehicleId ? { vehicleId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      vehicle: {
        select: { id: true, make: true, model: true, regNumber: true },
      },
      items: {
        where: { isService: true },
        select: { id: true, description: true, total: true },
      },
      invoices: {
        select: { id: true, invoiceNumber: true, total: true, status: true },
        take: 1,
        orderBy: { createdAt: "desc" as const },
      },
    },
  });

  return NextResponse.json({ jobs });
}
