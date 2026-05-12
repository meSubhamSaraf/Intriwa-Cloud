// GET /api/analytics/pnl?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Returns a P&L summary for the given period.

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (req, { garageId }) => {
  const { searchParams } = new URL(req.url);
  const startStr = searchParams.get("startDate");
  const endStr   = searchParams.get("endDate");

  if (!startStr || !endStr) {
    return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
  }

  const periodStart = new Date(startStr);
  const periodEnd   = new Date(endStr);
  // Include the full end day
  periodEnd.setHours(23, 59, 59, 999);

  // ── 1. Revenue: sum of paid invoices in the period ────────────────────────
  const revenueAgg = await prisma.invoice.aggregate({
    _sum: { total: true },
    where: {
      garageId,
      status: "PAID",
      paidAt: { gte: periodStart, lte: periodEnd },
    },
  });
  const revenue = Number(revenueAgg._sum.total ?? 0);

  // ── 2. Parts cost: SRInventoryUsage for SRs closed in the period ──────────
  // unitPrice on SRInventoryUsage is snapshotted from InventoryItem.unitPrice
  const inventoryUsages = await prisma.sRInventoryUsage.findMany({
    where: {
      serviceRequest: {
        garageId,
        status: "CLOSED",
        closedAt: { gte: periodStart, lte: periodEnd },
      },
    },
    include: {
      serviceRequest: {
        select: { id: true, srNumber: true, customer: { select: { name: true } } },
      },
    },
  });

  const partsCost = inventoryUsages.reduce((sum, u) => sum + Number(u.total), 0);

  // ── 3. Fuel allowances: SRs closed in period ─────────────────────────────
  const srsFuelAgg = await prisma.serviceRequest.aggregate({
    _sum: { fuelAllowance: true },
    where: {
      garageId,
      status: "CLOSED",
      closedAt: { gte: periodStart, lte: periodEnd },
    },
  });
  const fuelAllowances = Number(srsFuelAgg._sum.fuelAllowance ?? 0);

  // ── 4. Variable payouts: FREELANCE / AFFILIATE mechanics ─────────────────
  const variablePayoutsAgg = await prisma.mechanicPayout.aggregate({
    _sum: { totalAmount: true },
    where: {
      garageId,
      status: { in: ["APPROVED", "PAID"] },
      periodEnd: { gte: periodStart, lte: periodEnd },
      mechanic: {
        employmentType: { in: ["FREELANCE", "AFFILIATE"] },
      },
    },
  });
  const variablePayouts = Number(variablePayoutsAgg._sum.totalAmount ?? 0);

  // ── 5. Overtime / incentive bonuses: sum of incentiveAmount on paid payouts ─
  const incentiveAgg = await prisma.mechanicPayout.aggregate({
    _sum: { incentiveAmount: true },
    where: {
      garageId,
      status: { in: ["APPROVED", "PAID"] },
      periodEnd: { gte: periodStart, lte: periodEnd },
    },
  });
  const overtime = Number(incentiveAgg._sum.incentiveAmount ?? 0);

  const jobCosts = {
    parts: partsCost,
    fuelAllowances,
    variablePayouts,
    overtime,
  };
  const jobCostsTotal = partsCost + fuelAllowances + variablePayouts + overtime;
  const grossProfit = revenue - jobCostsTotal;

  // ── 6. Operating expenses ─────────────────────────────────────────────────
  const expenses = await prisma.garageExpense.findMany({
    where: {
      garageId,
      date: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { date: "desc" },
  });

  const sumCategory = (cat: string) =>
    expenses.filter((e) => e.category === cat).reduce((s, e) => s + Number(e.amount), 0);

  const operatingExpenses = {
    fixedSalaries: sumCategory("salary"),
    electricity:   sumCategory("electricity"),
    rent:          sumCategory("rent"),
    maintenance:   sumCategory("maintenance"),
    other: expenses
      .filter((e) => !["salary", "electricity", "rent", "maintenance"].includes(e.category))
      .reduce((s, e) => s + Number(e.amount), 0),
    total: expenses.reduce((s, e) => s + Number(e.amount), 0),
  };

  const ebitda = grossProfit - operatingExpenses.total;

  // ── 7. Per-job breakdown ──────────────────────────────────────────────────
  const closedSRs = await prisma.serviceRequest.findMany({
    where: {
      garageId,
      status: "CLOSED",
      closedAt: { gte: periodStart, lte: periodEnd },
    },
    include: {
      customer: { select: { name: true } },
      invoices: {
        where: { status: "PAID" },
        select: { total: true },
      },
      inventoryUsages: { select: { total: true } },
    },
  });

  // Per-SR mechanic payouts (FREELANCE/AFFILIATE only)
  const srPayoutsRaw = await prisma.mechanicPayoutItem.findMany({
    where: {
      serviceRequestId: { in: closedSRs.map((sr) => sr.id) },
      payout: {
        status: { in: ["APPROVED", "PAID"] },
        mechanic: { employmentType: { in: ["FREELANCE", "AFFILIATE"] } },
      },
    },
    select: { serviceRequestId: true, amount: true },
  });

  const payoutBySr: Record<string, number> = {};
  for (const row of srPayoutsRaw) {
    if (!row.serviceRequestId) continue;
    payoutBySr[row.serviceRequestId] =
      (payoutBySr[row.serviceRequestId] ?? 0) + Number(row.amount);
  }

  const jobBreakdown = closedSRs.map((sr) => {
    const invoiceAmount = sr.invoices.reduce((s, inv) => s + Number(inv.total), 0);
    const srPartsCost   = sr.inventoryUsages.reduce((s, u) => s + Number(u.total), 0);
    const srFuel        = Number(sr.fuelAllowance ?? 0);
    const srPayout      = payoutBySr[sr.id] ?? 0;
    const margin        = invoiceAmount - srPartsCost - srFuel - srPayout;

    return {
      srId:            sr.id,
      srNumber:        sr.srNumber,
      customerName:    sr.customer?.name ?? "—",
      invoiceAmount,
      partsCost:       srPartsCost,
      fuelAllowance:   srFuel,
      mechanicPayout:  srPayout,
      margin,
    };
  });

  return NextResponse.json({
    revenue,
    jobCosts,
    grossProfit,
    operatingExpenses,
    ebitda,
    jobBreakdown,
    expensesList: expenses,
  });
});
