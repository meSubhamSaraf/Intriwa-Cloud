// POST /api/webhooks/msgkart
// MsgKart calls this when a customer replies to a WhatsApp message.
// For now we log the message to the relevant SR's timeline.
// Extend this to handle specific reply keywords (e.g. "YES" to approve an add-on).

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

  if (from && text) {
    // Find the most recent open SR for this phone number
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

    const srId = customer?.serviceRequests?.[0]?.id;

    if (srId) {
      await prisma.timelineEvent.create({
        data: {
          serviceRequestId: srId,
          type: "NOTE",
          actorName: customer?.name ?? from,
          body: `WhatsApp reply: "${text}"`,
          metadata: { from, channel: "whatsapp" },
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
