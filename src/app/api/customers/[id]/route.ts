// GET    /api/customers/[id]  — customer with vehicles and service history
// PATCH  /api/customers/[id]  — update customer details
// DELETE /api/customers/[id]  — soft-delete (sets isActive=false)

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

// mapLink lives in a column added via ALTER TABLE (not in Prisma schema to avoid
// breaking queries if the migration hasn't been run yet). We read/write it via
// raw SQL and gracefully return null when the column doesn't exist.
async function getMapLink(customerId: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ mapLink: string | null }[]>`
      SELECT "mapLink" FROM "Customer" WHERE id = ${customerId} LIMIT 1
    `;
    return rows[0]?.mapLink ?? null;
  } catch {
    return null;
  }
}

export const GET = withAuthParams<{ id: string }>(async (_req, _ctx, { id }) => {
  const [customer, ltv, mapLink] = await Promise.all([
    prisma.customer.findUnique({
      where: { id },
      include: {
        vehicles: {
          include: {
            serviceRequests: { orderBy: { createdAt: "desc" }, take: 5 },
          },
        },
        leads: true,
      },
    }),
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: {
        serviceRequest: { customerId: id },
        status: { in: ["SENT", "PAID"] },
      },
    }),
    getMapLink(id),
  ]);
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...customer, mapLink, lifetimeValue: Number(ltv._sum.total ?? 0) });
});

export const PATCH = withAuthParams<{ id: string }>(async (req, _ctx, { id }) => {
  const body = await req.json();

  // Handle mapLink separately via raw SQL so other PATCH fields still work
  // even if the column hasn't been added to the DB yet.
  const { mapLink, ...rest } = body as { mapLink?: string | null; [k: string]: unknown };

  const [updated] = await Promise.all([
    Object.keys(rest).length > 0
      ? prisma.customer.update({ where: { id }, data: rest })
      : prisma.customer.findUniqueOrThrow({ where: { id } }),
    mapLink !== undefined
      ? prisma.$executeRaw`
          UPDATE "Customer" SET "mapLink" = ${mapLink ?? null} WHERE id = ${id}
        `.catch(() => null) // silently skip if column not yet added
      : Promise.resolve(),
  ]);

  return NextResponse.json({ ...updated, mapLink: mapLink ?? null });
});

export const DELETE = withAuthParams<{ id: string }>(async (_req, { garageId }, { id }) => {
  const customer = await prisma.customer.findFirst({ where: { id, garageId } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.customer.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
});
