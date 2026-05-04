// GET /api/search?q=<query> — search across customers, leads, vehicles, SRs, mechanics

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (req, { garageId }) => {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q || q.length < 2) {
    return NextResponse.json({ customers: [], leads: [], vehicles: [], serviceRequests: [], mechanics: [] });
  }

  const [customers, leads, vehicles, serviceRequests, mechanics] = await Promise.all([
    prisma.customer.findMany({
      where: {
        garageId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, phone: true },
      take: 5,
    }),
    prisma.lead.findMany({
      where: {
        garageId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { vehicleInfo: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, phone: true, vehicleInfo: true },
      take: 5,
    }),
    prisma.vehicle.findMany({
      where: {
        customer: { garageId },
        OR: [
          { regNumber: { contains: q, mode: "insensitive" } },
          { make: { contains: q, mode: "insensitive" } },
          { model: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        regNumber: true,
        make: true,
        model: true,
        customerId: true,
        customer: { select: { name: true } },
      },
      take: 5,
    }),
    prisma.serviceRequest.findMany({
      where: {
        garageId,
        OR: [
          { srNumber: { contains: q, mode: "insensitive" } },
          { complaint: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        srNumber: true,
        complaint: true,
        customer: { select: { name: true } },
      },
      take: 5,
    }),
    prisma.mechanic.findMany({
      where: {
        garageId,
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      include: { skills: { include: { mechanic: true } } },
      take: 4,
    }),
  ]);

  return NextResponse.json({ customers, leads, vehicles, serviceRequests, mechanics });
});
