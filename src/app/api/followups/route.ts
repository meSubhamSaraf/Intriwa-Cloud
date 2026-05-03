// GET /api/followups — aggregated follow-up queue for a garage
// Returns leads due for callback (followUpAt past/soon) + scheduled FollowUp records

import { NextResponse } from "next/server";
import { withAuth } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const GET = withAuth(async (_req, { garageId }) => {
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days out

  // Leads with followUpAt set and not yet closed/lost
  const leadsWithDue = await prisma.lead.findMany({
    where: {
      garageId,
      followUpAt: { not: null, lte: horizon },
      status: { notIn: ["LOST", "CONVERTED"] },
    },
    select: {
      id: true, name: true, phone: true, vehicleInfo: true,
      followUpAt: true, status: true, assignedOpsId: true, notes: true,
    },
    orderBy: { followUpAt: "asc" },
  });

  // FollowUp records with scheduledAt in window (not yet completed)
  const scheduledFollowUps = await prisma.followUp.findMany({
    where: {
      lead: { garageId },
      completedAt: null,
      scheduledAt: { not: null, lte: horizon },
    },
    include: {
      lead: {
        select: { id: true, name: true, phone: true, vehicleInfo: true, assignedOpsId: true },
      },
    },
    orderBy: { scheduledAt: "asc" },
    take: 100,
  });

  const result = [
    ...leadsWithDue.map((l) => ({
      id: `lead-${l.id}`,
      type: "lead_callback" as const,
      leadId: l.id,
      customerId: null as string | null,
      customerName: l.name,
      phone: l.phone,
      vehicleLabel: l.vehicleInfo ?? null,
      reason: l.notes ?? "Follow-up due",
      dueDate: (l.followUpAt as Date).toISOString(),
      status: "pending" as const,
      assignedOpsId: l.assignedOpsId ?? null,
    })),
    ...scheduledFollowUps
      .filter((f) => !leadsWithDue.some((l) => l.id === f.leadId))
      .map((f) => ({
        id: f.id,
        type: "lead_callback" as const,
        leadId: f.leadId,
        customerId: null as string | null,
        customerName: f.lead.name,
        phone: f.lead.phone,
        vehicleLabel: f.lead.vehicleInfo ?? null,
        reason: f.note,
        dueDate: (f.scheduledAt as Date).toISOString(),
        status: "pending" as const,
        assignedOpsId: f.lead.assignedOpsId ?? null,
      })),
  ];

  return NextResponse.json(result);
});
