// GET /api/reports — aggregated analytics for the garage

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { garageId }) => {
  const now = new Date();

  // Last 6 months
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-IN", { month: "short" }),
    });
  }

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [invoices, leadGroups, totalCustomers, mechanics, societies, completedSRs, serviceItems] =
    await Promise.all([
      prisma.invoice.findMany({
        where: { garageId, createdAt: { gte: sixMonthsAgo } },
        select: { total: true, createdAt: true },
      }),
      prisma.lead.groupBy({
        by: ["status"],
        where: { garageId },
        _count: { _all: true },
      }),
      prisma.customer.count({ where: { garageId } }),
      prisma.mechanic.findMany({
        where: { garageId, isActive: true },
        select: {
          id: true,
          name: true,
          rating: true,
          isAvailable: true,
          skills: { include: { mechanic: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.society.findMany({
        where: { garageId },
        select: {
          id: true,
          name: true,
          address: true,
          _count: { select: { customers: true, serviceRequests: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.serviceRequest.count({
        where: { garageId, status: { in: ["CLOSED", "CANCELLED"] } },
      }),
      prisma.serviceItem.findMany({
        where: { serviceRequest: { garageId } },
        select: { description: true },
        take: 2000,
      }),
    ]);

  // Monthly revenue
  const monthlyRevenue = months.map(({ key, label }) => {
    const total = invoices
      .filter((inv) => inv.createdAt.toISOString().slice(0, 7) === key)
      .reduce((s, inv) => s + Number(inv.total), 0);
    return { month: key, label, total };
  });

  // Lead counts
  const leadCounts: Record<string, number> = {};
  let totalLeads = 0;
  for (const g of leadGroups) {
    leadCounts[g.status] = g._count._all;
    totalLeads += g._count._all;
  }

  // Service item category breakdown
  const CATEGORY_KEYWORDS: [string, string][] = [
    ["Wash", "Wash"],
    ["AC", "AC"],
    ["Brake", "Brakes"],
    ["Oil", "Oil Change"],
    ["Battery", "Battery / EV"],
    ["Tyre", "Tyres"],
    ["Engine", "Engine"],
    ["Electrical", "Electrical"],
    ["Body", "Body / Dent"],
  ];
  const catMap: Record<string, number> = {};
  for (const item of serviceItems) {
    let cat = "Other";
    for (const [kw, label] of CATEGORY_KEYWORDS) {
      if (item.description.toLowerCase().includes(kw.toLowerCase())) {
        cat = label;
        break;
      }
    }
    catMap[cat] = (catMap[cat] ?? 0) + 1;
  }
  const categoryBreakdown = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);

  return NextResponse.json({
    monthlyRevenue,
    leadCounts,
    totalLeads,
    totalCustomers,
    completedSRs,
    mechanics: mechanics.map((m) => ({
      id: m.id,
      name: m.name,
      rating: m.rating,
      isAvailable: m.isAvailable,
      skillLabels: m.skills.map((s) => s.mechanic?.label ?? "").filter(Boolean),
    })),
    societies: societies.map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      customerCount: s._count.customers,
      srCount: s._count.serviceRequests,
    })),
    categoryBreakdown,
  });
});
