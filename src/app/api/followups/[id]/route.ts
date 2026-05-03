// PATCH /api/followups/[id]
// id can be "lead-{leadId}" (marks lead followUpAt done by clearing it)
// or a FollowUp record id (marks completedAt = now)

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const PATCH = withAuthParams<{ id: string }>(async (req, _ctx, { id }) => {
  const { action, rescheduleAt } = await req.json() as {
    action: "done" | "skip" | "reschedule";
    rescheduleAt?: string;
  };

  if (id.startsWith("lead-")) {
    const leadId = id.slice(5);
    if (action === "done" || action === "skip") {
      await prisma.lead.update({
        where: { id: leadId },
        data: { followUpAt: null },
      });
    } else if (action === "reschedule" && rescheduleAt) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { followUpAt: new Date(rescheduleAt) },
      });
    }
  } else {
    if (action === "done" || action === "skip") {
      await prisma.followUp.update({
        where: { id },
        data: { completedAt: new Date() },
      });
    } else if (action === "reschedule" && rescheduleAt) {
      await prisma.followUp.update({
        where: { id },
        data: { scheduledAt: new Date(rescheduleAt) },
      });
    }
  }

  return NextResponse.json({ ok: true });
});
