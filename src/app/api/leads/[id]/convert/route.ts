// POST /api/leads/[id]/convert — convert a lead to a customer (and optionally a vehicle)

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const POST = withAuthParams<{ id: string }>(async (req, { garageId }, { id }) => {
  const body = await req.json();
  const { address } = body;

  const lead = await prisma.lead.findUnique({ where: { id, garageId } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let vehicleDetails: Record<string, unknown> | null = null;
  if (lead.vehicleInfo) {
    try {
      vehicleDetails = JSON.parse(lead.vehicleInfo);
    } catch {
      vehicleDetails = null;
    }
  }

  const customer = await prisma.customer.create({
    data: {
      garageId,
      name: lead.name,
      phone: lead.phone,
      email: lead.email ?? undefined,
      address: address ?? undefined,
    },
  });

  let vehicle = null;
  if (vehicleDetails && vehicleDetails.make && vehicleDetails.model) {
    vehicle = await prisma.vehicle.create({
      data: {
        customerId: customer.id,
        make: vehicleDetails.make as string,
        model: vehicleDetails.model as string,
        year: vehicleDetails.year ? Number(vehicleDetails.year) : undefined,
        fuelType: vehicleDetails.fuelType as never ?? undefined,
      },
    });
  }

  await prisma.lead.update({
    where: { id },
    data: { status: "CONVERTED", customerId: customer.id },
  });

  return NextResponse.json({ customer, vehicle });
});
