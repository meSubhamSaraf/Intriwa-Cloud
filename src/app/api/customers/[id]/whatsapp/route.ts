// GET  /api/customers/[id]/whatsapp — fetch message history
// POST /api/customers/[id]/whatsapp — send a message (manager)

import { NextResponse, type NextRequest } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";
import { MsgKartPlugin } from "@/lib/plugins/whatsapp/msgkart";

export const GET = withAuthParams<{ id: string }>(async (_req, { garageId }, { id }) => {
  const customer = await prisma.customer.findFirst({ where: { id, garageId } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await prisma.whatsAppMessage.findMany({
    where: { customerId: id, garageId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
});

export const POST = withAuthParams<{ id: string }>(async (req, { garageId, profile }, { id }) => {
  const customer = await prisma.customer.findFirst({ where: { id, garageId } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!customer.phone) return NextResponse.json({ error: "Customer has no phone number" }, { status: 422 });

  const body = await req.json();
  const { templateName, variables } = body as {
    templateName?: string;
    variables?: Record<string, string>;
  };

  if (!templateName) {
    return NextResponse.json({ error: "Provide a templateName — MsgKart only supports templates" }, { status: 400 });
  }

  const phone = "91" + customer.phone.replace(/\D/g, "").slice(-10);
  const sentBy = profile?.name ? `manager:${profile.name}` : "manager";

  let msgkartId: string | null = null;
  let status = "sent";

  if (!process.env.MSGKART_API_KEY || !process.env.MSGKART_BUSINESS_ID) {
    status = "failed";
  } else {
    try {
      const wa = new MsgKartPlugin();
      const result = await wa.sendTemplate(phone, templateName, variables);
      msgkartId = result.messageId || null;
      status = result.status === "failed" ? "failed" : "sent";
    } catch (err) {
      console.error("[whatsapp] send error", err);
      status = "failed";
    }
  }

  const saved = await prisma.whatsAppMessage.create({
    data: {
      garageId,
      customerId: id,
      direction: "outbound",
      body: templateName,
      templateName: templateName ?? null,
      status,
      msgkartId,
      sentBy,
    },
  });

  return NextResponse.json(saved);
});
