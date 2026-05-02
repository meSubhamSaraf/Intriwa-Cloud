// ─────────────────────────────────────────────────────────────────────────────
// Service: Payout
// ─────────────────────────────────────────────────────────────────────────────
// Calculates mechanic earnings from:
//   1. Service items they were assigned to (base pay)
//   2. Incentive rules triggered in the period (bonus pay)
//
// Flow: calculatePayout() → ops manager reviews → approvePayout() → markPaid()
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/connectors/prisma";

export class PayoutService {
  // Build a payout for one mechanic for a given period.
  // Does NOT save — returns a preview so the ops manager can review first.
  async calculatePayout(mechanicId: string, periodStart: Date, periodEnd: Date) {
    const mechanic = await prisma.mechanic.findUniqueOrThrow({
      where: { id: mechanicId },
    });

    // ── Base pay: service items assigned to this mechanic in the period ──────
    const assignedItems = await prisma.serviceItem.findMany({
      where: {
        assignedMechanicId: mechanicId,
        serviceRequest: {
          closedAt: { gte: periodStart, lte: periodEnd },
          status: "CLOSED",
        },
      },
      include: { serviceRequest: true },
    });

    const payoutItems = assignedItems.map((item) => {
      let amount = 0;

      if (mechanic.payoutConfigType === "FIXED_PER_ITEM") {
        amount = Number(mechanic.payoutRate ?? 0);
      } else if (mechanic.payoutConfigType === "PERCENT_OF_ITEM") {
        amount = Number(item.total) * Number(mechanic.payoutRate ?? 0);
      } else if (mechanic.payoutConfigType === "SALARY") {
        // Salary mechanics: base is their salary; items don't add individually
        amount = 0;
      }

      return {
        serviceRequestId: item.serviceRequestId,
        serviceItemId: item.id,
        description: `${item.description} (SR ${item.serviceRequest.srNumber})`,
        amount,
      };
    });

    const baseAmount =
      mechanic.payoutConfigType === "SALARY"
        ? Number(mechanic.salaryAmount ?? 0)
        : payoutItems.reduce((s, i) => s + i.amount, 0);

    // ── Incentive rules ───────────────────────────────────────────────────────
    const rules = await prisma.incentiveRule.findMany({
      where: {
        garageId: mechanic.garageId,
        isActive: true,
        OR: [
          { appliesToType: null },
          { appliesToType: mechanic.employmentType },
        ],
      },
    });

    const closedJobsInPeriod = await prisma.serviceRequest.count({
      where: {
        mechanicId,
        closedAt: { gte: periodStart, lte: periodEnd },
        status: "CLOSED",
      },
    });

    const incentiveRows: {
      ruleId: string;
      ruleName: string;
      triggerValue: number;
      bonusAmount: number;
    }[] = [];

    for (const rule of rules) {
      const threshold = Number(rule.conditionValue);
      let metricValue = 0;

      if (rule.conditionType === "JOBS_COUNT") {
        metricValue = closedJobsInPeriod;
      } else if (rule.conditionType === "AVG_RATING") {
        metricValue = mechanic.rating ?? 0;
      } else if (rule.conditionType === "REVENUE") {
        const rev = await prisma.serviceItem.aggregate({
          _sum: { total: true },
          where: {
            assignedMechanicId: mechanicId,
            serviceRequest: {
              closedAt: { gte: periodStart, lte: periodEnd },
              status: "CLOSED",
            },
          },
        });
        metricValue = Number(rev._sum.total ?? 0);
      } else if (rule.conditionType === "OBSERVATIONS_CONVERTED") {
        metricValue = await prisma.customerObservation.count({
          where: {
            raisedById: mechanicId,
            status: "BOOKED",
            updatedAt: { gte: periodStart, lte: periodEnd },
          },
        });
      }

      if (metricValue > threshold) {
        const bonus =
          rule.bonusType === "FIXED"
            ? Number(rule.bonusAmount)
            : baseAmount * Number(rule.bonusAmount);

        incentiveRows.push({
          ruleId: rule.id,
          ruleName: rule.name,
          triggerValue: metricValue,
          bonusAmount: bonus,
        });
      }
    }

    const incentiveAmount = incentiveRows.reduce((s, r) => s + r.bonusAmount, 0);
    const totalAmount = baseAmount + incentiveAmount;

    return { mechanic, payoutItems, incentiveRows, baseAmount, incentiveAmount, totalAmount };
  }

  // Save the calculated payout as a PENDING record
  async createPayout(
    garageId: string,
    mechanicId: string,
    periodStart: Date,
    periodEnd: Date
  ) {
    const calc = await this.calculatePayout(mechanicId, periodStart, periodEnd);

    return prisma.mechanicPayout.create({
      data: {
        garageId,
        mechanicId,
        periodStart,
        periodEnd,
        baseAmount: calc.baseAmount,
        incentiveAmount: calc.incentiveAmount,
        totalAmount: calc.totalAmount,
        items: { create: calc.payoutItems },
        incentives: { create: calc.incentiveRows },
      },
      include: { items: true, incentives: true },
    });
  }

  async approvePayout(payoutId: string, approvedById: string) {
    return prisma.mechanicPayout.update({
      where: { id: payoutId },
      data: { status: "APPROVED", approvedById, approvedAt: new Date() },
    });
  }

  async markPaid(payoutId: string, paymentMethod: string, cashfreeTransferId?: string) {
    return prisma.mechanicPayout.update({
      where: { id: payoutId },
      data: {
        status: "PAID",
        paymentMethod: paymentMethod as never,
        cashfreeTransferId,
        paidAt: new Date(),
      },
    });
  }

  async listByGarage(garageId: string, filters?: { mechanicId?: string; status?: import("@/generated/prisma/client").PayoutStatus }) {
    return prisma.mechanicPayout.findMany({
      where: { garageId, ...filters },
      include: {
        mechanic: true,
        items: true,
        incentives: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async listByMechanic(mechanicId: string) {
    return prisma.mechanicPayout.findMany({
      where: { mechanicId },
      include: { items: true, incentives: true },
      orderBy: { periodStart: "desc" },
    });
  }

  // Total earnings summary for a mechanic (for their portal view)
  async earningsSummary(mechanicId: string) {
    const [allTime, thisMonth] = await Promise.all([
      prisma.mechanicPayout.aggregate({
        _sum: { totalAmount: true },
        where: { mechanicId, status: { in: ["APPROVED", "PAID"] } },
      }),
      prisma.mechanicPayout.aggregate({
        _sum: { totalAmount: true },
        where: {
          mechanicId,
          status: { in: ["APPROVED", "PAID"] },
          periodStart: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ]);

    return {
      allTime: Number(allTime._sum.totalAmount ?? 0),
      thisMonth: Number(thisMonth._sum.totalAmount ?? 0),
    };
  }
}
