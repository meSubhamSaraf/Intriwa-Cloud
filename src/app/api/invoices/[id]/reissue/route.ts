// POST /api/invoices/[id]/reissue
// Cancels the current invoice and creates a revised version with updated
// tax/discount, then sends it to the customer via Cashfree + WhatsApp.
// The old invoice is marked CANCELLED. Returns the new invoice.

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";
import { MsgKartPlugin } from "@/lib/plugins/whatsapp/msgkart";

export const POST = withAuthParams<{ id: string }>(async (req, { garageId, profile }, { id }) => {
  if (profile.role === "MECHANIC") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const old = await prisma.invoice.findFirst({
    where: { id, garageId },
    include: {
      items: true,
      serviceRequest: { include: { customer: true, vehicle: true } },
    },
  });
  if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (old.status === "PAID") {
    return NextResponse.json({ error: "Cannot revise a paid invoice" }, { status: 422 });
  }

  const body = await req.json() as { taxPercent?: number; discountAmount?: number };
  const taxPercent = body.taxPercent != null ? Number(body.taxPercent) : Number(old.taxPercent);
  const discountAmount = body.discountAmount != null ? Number(body.discountAmount) : Number(old.discountAmount);
  const subtotal = Number(old.subtotal);
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round((afterDiscount * taxPercent) / 100 * 100) / 100;
  const total = afterDiscount + taxAmount;

  // Generate new invoice number
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count();
  const newInvoiceNumber = `INV-${year}-${String(count + 1).padStart(4, "0")}`;

  // Cancel old, create new in a transaction
  const newInvoice = await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    const created = await tx.invoice.create({
      data: {
        garageId,
        serviceRequestId: old.serviceRequestId,
        invoiceNumber: newInvoiceNumber,
        subtotal,
        taxPercent,
        taxAmount,
        discountAmount,
        total,
        items: {
          create: old.items.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            total: Number(item.total),
          })),
        },
      },
      include: {
        items: true,
        serviceRequest: { include: { customer: true, vehicle: true } },
      },
    });

    if (old.serviceRequestId) {
      await tx.timelineEvent.create({
        data: {
          serviceRequestId: old.serviceRequestId,
          type: "NOTE",
          actorId: profile.id,
          actorName: profile.name,
          body: `Invoice revised: ${old.invoiceNumber} → ${newInvoiceNumber} (discount ₹${discountAmount}, tax ${taxPercent}%)`,
        },
      });
    }

    return created;
  });

  const customer = newInvoice.serviceRequest?.customer ?? null;

  // Create Cashfree payment link for the new invoice
  let paymentLinkUrl: string | null = null;
  let cashfreeOrderId: string | null = null;
  let cashfreeError: string | undefined;

  if (customer?.phone) {
    try {
      if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
        throw new Error("Cashfree env vars not configured");
      }
      const phone = "91" + customer.phone.replace(/\D/g, "").slice(-10);
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
          link_id: newInvoice.id,
          link_amount: total,
          link_currency: "INR",
          link_purpose: `Vehicle Service Invoice #${newInvoiceNumber} (Revised)`,
          customer_details: { customer_phone: phone, customer_name: customer.name },
          link_notify: { send_sms: false, send_email: false },
          link_expiry_time: expiryTime,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`Cashfree error: ${JSON.stringify(data)}`);
      paymentLinkUrl = data.link_url ?? null;
      cashfreeOrderId = data.link_id ?? null;
    } catch (err) {
      cashfreeError = err instanceof Error ? err.message : String(err);
      console.error("[invoices/reissue] Cashfree failed:", cashfreeError);
    }
  }

  const sent = await prisma.invoice.update({
    where: { id: newInvoice.id },
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

  // WhatsApp notification
  let whatsappSent = false;
  if (customer?.phone && paymentLinkUrl) {
    try {
      if (!process.env.MSGKART_API_KEY || !process.env.MSGKART_SENDER_ID) {
        throw new Error("MsgKart not configured");
      }
      const wa = new MsgKartPlugin();
      const phone = "91" + customer.phone.replace(/\D/g, "").slice(-10);
      const result = await wa.sendTemplate({
        to: phone,
        templateName: "invoice_ready",
        variables: {
          name: customer.name,
          amount: String(Math.round(total)),
          link: paymentLinkUrl,
        },
      });
      whatsappSent = result.status !== "failed";
    } catch (err) {
      console.error("[invoices/reissue] WhatsApp failed:", err);
    }
  }

  return NextResponse.json({ invoice: sent, whatsappSent, cashfreeError });
});
