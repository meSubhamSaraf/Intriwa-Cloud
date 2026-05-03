// GET  /api/leads  — list leads for the garage
// POST /api/leads  — create a new lead

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (req, { garageId }) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const source = searchParams.get("source") ?? undefined;

  const [leads, count] = await prisma.$transaction([
    prisma.lead.findMany({
      where: {
        garageId,
        ...(status ? { status: status as never } : {}),
        ...(source ? { source } : {}),
        ...(search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] }
          : {}),
      },
      include: {
        followUps: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lead.count({
      where: {
        garageId,
        ...(status ? { status: status as never } : {}),
        ...(source ? { source } : {}),
        ...(search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] }
          : {}),
      },
    }),
  ]);

  return NextResponse.json({ leads, count });
});

export const POST = withAuth(async (req, { garageId }) => {
  const body = await req.json();
  const { name, phone, email, vehicleInfo, source, neighbourhood, notes, followUpAt } = body;

  if (!name || !phone) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
  }

  const lead = await prisma.lead.create({
    data: {
      garageId,
      name,
      phone,
      email: email ?? undefined,
      vehicleInfo: vehicleInfo ? (typeof vehicleInfo === "object" ? JSON.stringify(vehicleInfo) : vehicleInfo) : undefined,
      source: source ?? undefined,
      neighbourhood: neighbourhood ?? undefined,
      notes: notes ?? undefined,
      followUpAt: followUpAt ? new Date(followUpAt) : undefined,
    },
  });

  return NextResponse.json(lead, { status: 201 });
});
