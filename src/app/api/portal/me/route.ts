// GET /api/portal/me
// Returns the customer profile, active job, and vehicles for the logged-in
// Supabase phone-auth user.  Auth is verified via getUser() (not getSession)
// to ensure we talk to Supabase Auth on every request.

import { NextResponse } from "next/server";
import { createServerConnector } from "@/lib/connectors/supabase-server";
import { prisma } from "@/lib/connectors/prisma";

export async function GET() {
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
    include: {
      vehicles: {
        orderBy: { createdAt: "desc" },
      },
      serviceRequests: {
        where: {
          status: { in: ["OPEN", "IN_PROGRESS", "WAITING_PARTS", "READY"] },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          vehicle: {
            select: { make: true, model: true, regNumber: true },
          },
          mechanic: {
            select: { name: true },
          },
          items: {
            where: { isService: true },
          },
        },
      },
    },
  });

  if (!customer) {
    return NextResponse.json(
      { error: "Not a registered customer" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
    },
    activeJob: customer.serviceRequests[0] ?? null,
    vehicles: customer.vehicles,
  });
}
