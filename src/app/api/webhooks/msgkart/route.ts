// POST /api/webhooks/msgkart
// MsgKart calls this on every inbound WhatsApp message.
// 1. Logs message to WhatsAppMessage table + SR timeline (existing)
// 2. Passes message to the chatbot to drive the conversation flow (new)

import { NextResponse, type NextRequest } from "next/server";
import { MsgKartPlugin } from "@/lib/plugins/whatsapp/msgkart";
import { WhatsAppChatbot } from "@/lib/whatsapp/chatbot";
import { prisma } from "@/lib/connectors/prisma";

const msgkart = new MsgKartPlugin();
const chatbot = new WhatsAppChatbot();

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

  // Log inbound message + SR timeline update (fire-and-forget, existing logic)
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

    const srId = customer.serviceRequests?.[0]?.id;
    if (srId) {
      await prisma.timelineEvent.create({
        data: {
          serviceRequestId: srId,
          type: "NOTE",
          actorName: customer.name,
          body: `WhatsApp: "${text}"`,
          metadata: { from, channel: "whatsapp" } as object,
        },
      }).catch(() => {});
    }
  }

  // Drive chatbot conversation (non-blocking — MsgKart expects quick 200)
  chatbot.handle(from, text).catch((err) => {
    console.error("[chatbot] unhandled error", err);
  });

  return NextResponse.json({ received: true });
}
