// GET /api/me/earnings — payout history + accrued (unpaid) earnings for the logged-in mechanic

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";
import { PayoutService } from "@/lib/services/payout.service";

const payoutService = new PayoutService();

function calcItemAmount(
  payoutConfigType: string | null,
  payoutRate: { toString(): string } | null,
  itemTotal: { toString(): string },
): number {
  if (payoutConfigType === "FIXED_PER_ITEM") return Number(payoutRate ?? 0);
  if (payoutConfigType === "PERCENT_OF_ITEM") return Number(itemTotal) * Number(payoutRate ?? 0);
  return 0;
}

export const GET = withAuth(async (_req, { garageId, profile }) => {
  if (!profile.email) return NextResponse.json({ error: "No mechanic profile linked" }, { status: 404 });

  const mechanic = await prisma.mechanic.findFirst({
    where: {
      garageId,
      isActive: true,
      email: { equals: profile.email, mode: "insensitive" },
    },
  });
  if (!mechanic) return NextResponse.json({ error: "No mechanic profile linked" }, { status: 404 });

  const [payouts, summary] = await Promise.all([
    payoutService.listByMechanic(mechanic.id),
    payoutService.earningsSummary(mechanic.id),
  ]);

  // ── Accrued (unpaid) earnings ──────────────────────────────────────────────
  // Start from the end of the last payout period; or beginning of time if none.
  const lastPayout = payouts[0] ?? null;
  const accrualStart = lastPayout ? new Date(lastPayout.periodEnd) : new Date(0);

  // Items already included in a paid/approved payout — exclude them
  // Only APPROVED/PAID payouts count; PENDING or CANCELLED should not block accrual
  const paidItemIds = (
    await prisma.mechanicPayoutItem.findMany({
      where: { payout: { mechanicId: mechanic.id, status: { in: ["APPROVED", "PAID"] } } },
      select: { serviceItemId: true },
    })
  ).map((r) => r.serviceItemId).filter((x): x is string => x !== null);

  // Service items for READY (completed, not yet invoiced) and CLOSED SRs.
  // isService: true — physical parts (AddOns) never count toward mechanic earnings.
  const accruedItems = await prisma.serviceItem.findMany({
    where: {
      isService: true,
      AND: [
        {
          OR: [
            { assignedMechanicId: mechanic.id },
            { assignedMechanicId: null, serviceRequest: { mechanicId: mechanic.id } },
          ],
        },
        {
          OR: [
            { serviceRequest: { status: "READY" } },
            { serviceRequest: { status: "CLOSED", closedAt: { gt: accrualStart } } },
          ],
        },
        { NOT: { id: { in: paidItemIds } } },
      ],
    },
    include: {
      serviceRequest: {
        include: {
          customer: { select: { name: true } },
          vehicle: { select: { make: true, model: true, regNumber: true } },
        },
      },
    },
    orderBy: { serviceRequest: { openedAt: "desc" } },
  });

  // Group by SR for a per-job breakdown
  const bySR = new Map<string, {
    srId: string; srNumber: string; status: string;
    customerName: string; vehicleLabel: string;
    closedAt: string | null; openedAt: string | null;
    itemCount: number; total: number; serviceValue: number;
  }>();

  let totalAccrued = 0;

  for (const item of accruedItems) {
    const sr = item.serviceRequest;
    if (!bySR.has(item.serviceRequestId)) {
      bySR.set(item.serviceRequestId, {
        srId: item.serviceRequestId,
        srNumber: sr.srNumber,
        status: sr.status,
        customerName: sr.customer?.name ?? "Customer",
        vehicleLabel: sr.vehicle
          ? `${sr.vehicle.make} ${sr.vehicle.model}${sr.vehicle.regNumber ? ` · ${sr.vehicle.regNumber}` : ""}`
          : "",
        closedAt: sr.closedAt?.toISOString() ?? null,
        openedAt: sr.openedAt?.toISOString() ?? null,
        itemCount: 0,
        total: 0,
        serviceValue: 0,
      });
    }
    const row = bySR.get(item.serviceRequestId)!;
    const amt = calcItemAmount(mechanic.payoutConfigType, mechanic.payoutRate, item.total);
    row.itemCount++;
    row.total += amt;
    row.serviceValue += Number(item.total);
    totalAccrued += amt;
  }

  // ── Package SRs accrued earnings (not yet in a payout) ───────────────────
  // SRs where a package was applied and the SR's primary mechanic is this mechanic
  const paidSRIds = new Set(
    (await prisma.mechanicPayoutItem.findMany({
      where: { payout: { mechanicId: mechanic.id }, serviceItemId: null },
      select: { serviceRequestId: true },
    })).map((r) => r.serviceRequestId).filter((x): x is string => x !== null)
  );

  const packageSRs = await prisma.sRServicePackage.findMany({
    where: {
      sr: {
        mechanicId: mechanic.id,
        OR: [
          { status: "READY" },
          { status: "CLOSED", closedAt: { gt: accrualStart } },
        ],
        NOT: { id: { in: [...paidSRIds] } },
      },
    },
    include: {
      items: { select: { inventoryItemId: true, mrpPrice: true, quantity: true } },
      sr: {
        include: {
          customer: { select: { name: true } },
          vehicle: { select: { make: true, model: true, regNumber: true } },
        },
      },
    },
  });

  for (const pkg of packageSRs) {
    const sr = pkg.sr;
    const key = `pkg-${sr.id}`;
    if (!bySR.has(key)) {
      bySR.set(key, {
        srId: sr.id,
        srNumber: sr.srNumber,
        status: sr.status,
        customerName: sr.customer?.name ?? "Customer",
        vehicleLabel: sr.vehicle
          ? `${sr.vehicle.make} ${sr.vehicle.model}${sr.vehicle.regNumber ? ` · ${sr.vehicle.regNumber}` : ""}`
          : "",
        closedAt: sr.closedAt?.toISOString() ?? null,
        openedAt: sr.openedAt?.toISOString() ?? null,
        itemCount: 0,
        total: 0,
        serviceValue: 0,
      });
    }
    const row = bySR.get(key)!;
    const pkgPrice = Number(pkg.packagePrice);
    // Exclude inventory item cost from the base on which mechanic earns commission
    const inventoryItemsCost = pkg.items
      .filter(i => i.inventoryItemId != null)
      .reduce((s, i) => s + Number(i.mrpPrice) * i.quantity, 0);
    const laborBase = Math.max(0, pkgPrice - inventoryItemsCost);
    const amt = mechanic.payoutConfigType === "PERCENT_OF_ITEM"
      ? laborBase * Number(mechanic.payoutRate ?? 0)
      : mechanic.payoutConfigType === "FIXED_PER_ITEM"
      ? Number(mechanic.payoutRate ?? 0)
      : 0;
    row.itemCount++;
    row.total += amt;
    row.serviceValue += pkgPrice;
    totalAccrued += amt;
  }

  let pendingPenaltyTotal = 0;
  try {
    const penalties = await prisma.mechanicPenalty.findMany({
      where: { mechanicId: mechanic.id, payoutId: null },
    });
    pendingPenaltyTotal = penalties.reduce((s, p) => s + Number(p.amount), 0);
  } catch { /* table may not exist yet */ }

  return NextResponse.json({
    payouts,
    summary,
    mechanicId: mechanic.id,
    payoutConfigType: mechanic.payoutConfigType,
    payoutRate: Number(mechanic.payoutRate ?? 0),
    salaryAmount: Number(mechanic.salaryAmount ?? 0),
    salaryType: mechanic.salaryType,
    accrued: {
      amount: totalAccrued,
      penaltyDeductions: pendingPenaltyTotal,
      net: totalAccrued - pendingPenaltyTotal,
      byJob: Array.from(bySR.values()),
    },
  });
});
