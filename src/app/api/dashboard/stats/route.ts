// GET /api/dashboard/stats — garage-level KPIs for the ops dashboard

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { garageId }) => {
  const now = new Date();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);

  const [
    todaysJobs,
    openLeads,
    activeMechanics,
    pendingInvoices,
    overdueInvoices,
    revenueAgg,
    recentSRs,
    mechanicStatuses,
    totalCustomers,
    activeCustomers,
  ] = await Promise.all([
    prisma.serviceRequest.count({
      where: {
        garageId,
        status: { not: "CLOSED" },
        OR: [
          { scheduledAt: { gte: todayStart, lte: todayEnd } },
          { openedAt:    { gte: todayStart, lte: todayEnd } },
        ],
      },
    }),

    prisma.lead.count({
      where: {
        garageId,
        status: { notIn: ["CONVERTED", "LOST"] },
      },
    }),

    prisma.mechanic.count({
      where: { garageId, isAvailable: true, isActive: true },
    }),

    prisma.invoice.count({
      where: { garageId, status: { in: ["DRAFT", "SENT"] } },
    }),

    prisma.invoice.count({
      where: { garageId, status: "OVERDUE" },
    }),

    prisma.invoice.aggregate({
      where: { garageId, status: "PAID", paidAt: { gte: monthStart } },
      _sum: { total: true },
    }),

    prisma.serviceRequest.findMany({
      where: { garageId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        srNumber: true,
        status: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    }),

    prisma.mechanic.findMany({
      where: { garageId, isActive: true },
      select: { id: true, name: true, isAvailable: true, employmentType: true },
    }),

    prisma.customer.count({ where: { garageId } }),

    prisma.customer.count({
      where: {
        garageId,
        serviceRequests: { some: { garageId, openedAt: { gte: sixMonthsAgo } } },
      },
    }),
  ]);

  return NextResponse.json({
    todaysJobs,
    openLeads,
    activeMechanics,
    pendingInvoices,
    overdueInvoices,
    revenueThisMonth: Number(revenueAgg._sum.total ?? 0),
    recentSRs,
    mechanicStatuses,
    totalCustomers,
    activeCustomers,
  });
});
