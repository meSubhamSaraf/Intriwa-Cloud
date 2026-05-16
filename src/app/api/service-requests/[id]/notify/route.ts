// POST /api/service-requests/[id]/notify
// Mechanic sends a WhatsApp status update to the customer.
// Templates must be pre-approved in MsgKart / Meta.

import { NextResponse, type NextRequest } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";
import { MsgKartPlugin } from "@/lib/plugins/whatsapp/msgkart";

// Templates the mechanic can trigger. Names must match approved MsgKart templates.
const NOTIFY_TEMPLATES: Record<string, { label: string; template: string; body: (name: string, vehicle: string, srNum: string) => string }> = {
  job_started: {
    label: "Job Started",
    template: "job_started",
    body: (name, vehicle, srNum) => `Hi ${name}, your ${vehicle} service has started (${srNum}). We'll keep you updated!`,
  },
  waiting_parts: {
    label: "Waiting for Parts",
    template: "waiting_parts",
    body: (name, vehicle, srNum) => `Hi ${name}, we've ordered a part for your ${vehicle} (${srNum}). We'll notify you once it arrives.`,
  },
  job_ready: {
    label: "Ready for Pickup",
    template: "job_ready",
    body: (name, vehicle, srNum) => `Hi ${name}, your ${vehicle} is ready for pickup! (${srNum}) 🎉`,
  },
};

export const POST = withAuthParams<{ id: string }>(async (req, { garageId, profile }, { id }) => {
  const sr = await prisma.serviceRequest.findFirst({
    where: { id, garageId },
    include: {
      customer: true,
      vehicle: true,
    },
  });
  if (!sr) return NextResponse.json({ error: "SR not found" }, { status: 404 });
  if (!sr.customer?.phone) return NextResponse.json({ error: "No customer phone" }, { status: 422 });

  const { type, mediaUrls } = (await req.json()) as {
    type: string;
    mediaUrls?: { url: string; mediaType: "image" | "video" }[];
  };
  const tpl = NOTIFY_TEMPLATES[type];
  if (!tpl) return NextResponse.json({ error: "Unknown notification type" }, { status: 400 });

  const customerName = sr.customer.name;
  const vehicleLabel = sr.vehicle ? `${sr.vehicle.make} ${sr.vehicle.model}` : "vehicle";
  const phone = "91" + sr.customer.phone.replace(/\D/g, "").slice(-10);
  const sentBy = profile?.name ? `mechanic:${profile.name}` : "mechanic";
  const messageBody = tpl.body(customerName, vehicleLabel, sr.srNumber);

  let msgkartId: string | null = null;
  let status = "sent";

  if (!process.env.MSGKART_API_KEY || !process.env.MSGKART_BUSINESS_ID) {
    status = "failed";
  } else {
    try {
      const wa = new MsgKartPlugin();
      const result = await wa.sendTemplate(
        phone,
        tpl.template,
        { name: customerName, vehicle: vehicleLabel, srNumber: sr.srNumber },
      );
      msgkartId = result.messageId || null;
      status = result.status === "failed" ? "failed" : "sent";
    } catch (err) {
      console.error("[notify] WhatsApp failed", err);
      status = "failed";
    }
  }

  const saved = await prisma.whatsAppMessage.create({
    data: {
      garageId,
      customerId: sr.customerId!,
      direction: "outbound",
      body: messageBody,
      templateName: tpl.template,
      status,
      msgkartId,
      sentBy,
    },
  });

  return NextResponse.json({ message: saved, whatsappSent: status !== "failed" });
});
