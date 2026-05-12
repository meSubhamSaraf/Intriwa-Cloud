// GET /api/analytics/packages?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Returns package performance: usage count, revenue, vs MRP discount given.

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (req, { garageId }) => {
  const { searchParams } = new URL(req.url);
  const startStr = searchParams.get("startDate");
  const endStr   = searchParams.get("endDate");

  const dateFilter = startStr && endStr
    ? { gte: new Date(startStr), lte: (() => { const d = new Date(endStr); d.setHours(23, 59, 59, 999); return d; })() }
    : undefined;

  const srPackages = await prisma.sRServicePackage.findMany({
    where: {
      sr: {
        garageId,
        ...(dateFilter ? { closedAt: dateFilter } : {}),
      },
    },
    include: {
      sr: { select: { srNumber: true, closedAt: true, customer: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by packageId / packageName
  const grouped = new Map<string, {
    packageId: string;
    packageName: string;
    usageCount: number;
    totalRevenue: number;
    totalMrp: number;
    instances: { srNumber: string; customerName: string; date: string | null; packagePrice: number; mrpTotal: number }[];
  }>();

  for (const srp of srPackages) {
    const key = srp.packageId;
    if (!grouped.has(key)) {
      grouped.set(key, {
        packageId: srp.packageId,
        packageName: srp.packageName,
        usageCount: 0,
        totalRevenue: 0,
        totalMrp: 0,
        instances: [],
      });
    }
    const g = grouped.get(key)!;
    g.usageCount++;
    g.totalRevenue += Number(srp.packagePrice);
    g.totalMrp += Number(srp.mrpTotal);
    g.instances.push({
      srNumber: srp.sr.srNumber,
      customerName: srp.sr.customer?.name ?? "—",
      date: srp.sr.closedAt?.toISOString() ?? null,
      packagePrice: Number(srp.packagePrice),
      mrpTotal: Number(srp.mrpTotal),
    });
  }

  const packages = Array.from(grouped.values())
    .map(g => ({
      packageId: g.packageId,
      packageName: g.packageName,
      usageCount: g.usageCount,
      totalRevenue: g.totalRevenue,
      totalMrp: g.totalMrp,
      totalDiscount: g.totalMrp - g.totalRevenue,
      instances: g.instances,
    }))
    .sort((a, b) => b.usageCount - a.usageCount);

  return NextResponse.json({
    packages,
    totalPackagesApplied: srPackages.length,
    totalRevenue: packages.reduce((s, p) => s + p.totalRevenue, 0),
    totalDiscount: packages.reduce((s, p) => s + p.totalDiscount, 0),
  });
});
