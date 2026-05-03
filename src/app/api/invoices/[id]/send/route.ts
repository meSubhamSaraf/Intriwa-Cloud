// POST /api/invoices/[id]/send — create Cashfree payment link and notify customer via WhatsApp

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";
import { MsgKartPlugin } from "@/lib/plugins/whatsapp/msgkart";

export const POST = withAuthParams<{ id: string }>(async (_req, { garageId }, { id }) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id, garageId },
    include: { serviceRequest: { include: { customer: true } } },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sr = invoice.serviceRequest;
  const customer = sr?.customer ?? null;
  const customerPhone = customer?.phone ?? null;

  let paymentLinkUrl: string | null = null;
  let cashfreeOrderId: string | null = null;
  let cashfreeError: string | undefined;

  if (customer && customerPhone) {
    try {
      if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
        throw new Error("Cashfree env vars not configured");
      }
      const phone = "91" + customerPhone.replace(/\D/g, "").slice(-10);
      const ENV = process.env.CASHFREE_ENV ?? "TEST";
      const BASE_URL = ENV === "PROD" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
      const expiryTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const res = await fetch(`${BASE_URL}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": process.env.CASHFREE_APP_ID!,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
          "x-api-version": "2023-08-01",
        },
        body: JSON.stringify({
          link_id: invoice.id,
          link_amount: Number(invoice.total),
          link_currency: "INR",
          link_purpose: `Vehicle Service Invoice #${invoice.invoiceNumber}`,
          customer_details: { customer_phone: phone, customer_name: customer.name },
          link_notify: { send_sms: false, send_email: false },
          link_expiry_time: expiryTime,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`Cashfree error: ${JSON.stringify(data)}`);
      paymentLinkUrl = (data.link_url as string | undefined) ?? null;
      cashfreeOrderId = (data.link_id as string | undefined) ?? null;
    } catch (err) {
      cashfreeError = err instanceof Error ? err.message : String(err);
      console.error("[invoices/send] Cashfree failed:", cashfreeError);
    }
  } else {
    cashfreeError = "No customer or phone number associated with this invoice";
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      ...(paymentLinkUrl ? { paymentLinkUrl } : {}),
      ...(cashfreeOrderId ? { cashfreeOrderId } : {}),
    },
    include: {
      items: true,
      serviceRequest: { include: { customer: true, vehicle: true } },
    },
  });

  let whatsappSent = false;
  if (customer && customerPhone && paymentLinkUrl) {
    try {
      if (!process.env.MSGKART_API_KEY || !process.env.MSGKART_SENDER_ID) {
        throw new Error("MsgKart env vars not configured");
      }
      const wa = new MsgKartPlugin();
      const phone = "91" + customerPhone.replace(/\D/g, "").slice(-10);
      const result = await wa.sendTemplate({
        to: phone,
        templateName: "invoice_ready",
        variables: {
          name: customer.name,
          amount: String(Math.round(Number(invoice.total))),
          link: paymentLinkUrl,
        },
      });
      whatsappSent = result.status !== "failed";
    } catch (err) {
      console.error("[invoices/send] WhatsApp failed:", err);
    }
  }

  return NextResponse.json({ invoice: updated, paymentLinkUrl, whatsappSent, cashfreeError });
});
