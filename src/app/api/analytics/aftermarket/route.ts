// GET /api/analytics/aftermarket?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Returns aftermarket parts analysis: frequency, purchase price, selling price, margins.
// Groups by normalized description (case-insensitive, trimmed).

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (req, { garageId }) => {
  const { searchParams } = new URL(req.url);
  const startStr = searchParams.get("startDate");
  const endStr   = searchParams.get("endDate");

  const dateFilter = startStr && endStr
    ? { gte: new Date(startStr), lte: (() => { const d = new Date(endStr); d.setHours(23,59,59,999); return d; })() }
    : undefined;

  const addons = await prisma.addOn.findMany({
    where: {
      status: "APPROVED",
      serviceRequest: {
        garageId,
        ...(dateFilter ? { closedAt: dateFilter } : {}),
      },
    },
    include: {
      serviceRequest: {
        select: {
          id: true, srNumber: true, closedAt: true,
          customer: { select: { name: true } },
        },
      },
    },
    orderBy: { approvedAt: "desc" },
  });

  // Group by normalized description for frequency analysis
  const grouped = new Map<string, {
    key: string;
    usageCount: number;
    totalQuantity: number;
    totalCost: number;
    totalRevenue: number;
    instances: { srNumber: string; customerName: string; date: string | null; purchasePrice: number; sellingPrice: number | null; quantity: number }[];
  }>();

  for (const addon of addons) {
    const key = addon.description.trim().toLowerCase();
    const qty = addon.quantity ?? 1;
    const cost = Number(addon.estimatedCost) * qty;
    const sell = addon.sellingPrice != null ? Number(addon.sellingPrice) * qty : null;

    if (!grouped.has(key)) {
      grouped.set(key, {
        key: addon.description.trim(),
        usageCount: 0,
        totalQuantity: 0,
        totalCost: 0,
        totalRevenue: 0,
        instances: [],
      });
    }
    const g = grouped.get(key)!;
    g.usageCount++;
    g.totalQuantity += qty;
    g.totalCost += cost;
    if (sell != null) g.totalRevenue += sell;
    g.instances.push({
      srNumber: addon.serviceRequest.srNumber,
      customerName: addon.serviceRequest.customer?.name ?? "—",
      date: addon.serviceRequest.closedAt?.toISOString() ?? null,
      purchasePrice: Number(addon.estimatedCost),
      sellingPrice: addon.sellingPrice != null ? Number(addon.sellingPrice) : null,
      quantity: qty,
    });
  }

  const parts = Array.from(grouped.values())
    .map(g => ({
      description: g.key,
      usageCount: g.usageCount,
      totalQuantity: g.totalQuantity,
      totalCost: g.totalCost,
      totalRevenue: g.totalRevenue,
      margin: g.totalRevenue - g.totalCost,
      avgPurchasePrice: g.totalCost / g.totalQuantity,
      avgSellingPrice: g.totalRevenue > 0 ? g.totalRevenue / g.totalQuantity : null,
      instances: g.instances,
    }))
    .sort((a, b) => b.usageCount - a.usageCount);

  // Raw list for the transaction view (most recent first)
  const rawList = addons.map(a => ({
    id: a.id,
    description: a.description,
    srNumber: a.serviceRequest.srNumber,
    customerName: a.serviceRequest.customer?.name ?? "—",
    date: a.serviceRequest.closedAt?.toISOString() ?? null,
    quantity: a.quantity ?? 1,
    purchasePrice: Number(a.estimatedCost),
    sellingPrice: a.sellingPrice != null ? Number(a.sellingPrice) : null,
    margin: a.sellingPrice != null
      ? (Number(a.sellingPrice) - Number(a.estimatedCost)) * (a.quantity ?? 1)
      : null,
  }));

  return NextResponse.json({ parts, rawList, totalAddons: addons.length });
});
