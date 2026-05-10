// POST /api/webhooks/msgkart
// MsgKart calls this when a customer replies to a WhatsApp message.
// Saves the message to WhatsAppMessage for the chat UI, and also
// logs it to the SR timeline if there's an active SR for this customer.

import { NextResponse, type NextRequest } from "next/server";
import { MsgKartPlugin } from "@/lib/plugins/whatsapp/msgkart";
import { prisma } from "@/lib/connectors/prisma";

const msgkart = new MsgKartPlugin();

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-msgkart-signature") ?? "";

  if (!msgkart.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const from: string = payload?.from ?? "";
  const text: string = payload?.text?.body ?? "";
  const msgkartId: string = payload?.id ?? "";

  if (!from || !text) return NextResponse.json({ received: true });

  const customer = await prisma.customer.findFirst({
    where: { phone: { contains: from.slice(-10) } },
    include: {
      serviceRequests: {
        where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_PARTS", "READY"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (customer) {
    // Save to WhatsAppMessage chat history
    await prisma.whatsAppMessage.create({
      data: {
        garageId: customer.garageId,
        customerId: customer.id,
        direction: "inbound",
        body: text,
        status: "delivered",
        msgkartId: msgkartId || null,
        sentBy: null,
      },
    }).catch(() => {});

    // Also log to active SR timeline if one exists
    const srId = customer.serviceRequests?.[0]?.id;
    if (srId) {
      await prisma.timelineEvent.create({
        data: {
          serviceRequestId: srId,
          type: "NOTE",
          actorName: customer.name,
          body: `WhatsApp: "${text}"`,
          metadata: { from, channel: "whatsapp" },
        },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ received: true });
}
