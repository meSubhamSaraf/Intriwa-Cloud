// GET   /api/invoices/[id] — full invoice detail
// PATCH /api/invoices/[id] — mark paid | retrigger send | update tax/discount

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";
import { MsgKartPlugin } from "@/lib/plugins/whatsapp/msgkart";

export const GET = withAuthParams<{ id: string }>(async (_req, { garageId }, { id }) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id, garageId },
    include: {
      items: true,
      serviceRequest: {
        include: {
          customer: true,
          vehicle: true,
        },
      },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
});

export const PATCH = withAuthParams<{ id: string }>(async (req, { garageId }, { id }) => {
  const invoice = await prisma.invoice.findFirst({ where: { id, garageId } });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // ── Mark as paid manually ──────────────────────────────────────────────────
  if (body.status === "PAID") {
    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: "PAID",
        paymentMethod: body.paymentMethod ?? null,
        paidAmount: body.paidAmount != null ? body.paidAmount : invoice.total,
        paidAt: new Date(),
      },
      include: { items: true, serviceRequest: { include: { customer: true, vehicle: true } } },
    });
    return NextResponse.json(updated);
  }

  // ── Retrigger send ─────────────────────────────────────────────────────────
  if (body.action === "retrigger") {
    const full = await prisma.invoice.findFirst({
      where: { id, garageId },
      include: { serviceRequest: { include: { customer: true } } },
    });
    if (!full) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!full.serviceRequest) return NextResponse.json({ error: "Invoice has no linked service request" }, { status: 422 });
    const customer = full.serviceRequest.customer;
    if (!customer) return NextResponse.json({ error: "Service request has no customer" }, { status: 422 });
    let paymentLinkUrl: string | null = full.paymentLinkUrl ?? null;
    let cashfreeOrderId: string | null = full.cashfreeOrderId ?? null;
    let cashfreeError: string | undefined;

    try {
      if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
        throw new Error("Cashfree env vars not configured");
      }
      const phone = "91" + customer.phone.replace(/\D/g, "").slice(-10);
      const ENV = process.env.CASHFREE_ENV ?? "TEST";
      const BASE_URL =
        ENV === "PROD"
          ? "https://api.cashfree.com/pg"
          : "https://sandbox.cashfree.com/pg";
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
          link_id: full.id,
          link_amount: Number(full.total),
          link_currency: "INR",
          link_purpose: `Vehicle Service Invoice #${full.invoiceNumber}`,
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
      console.error("[invoices/retrigger] Cashfree failed:", cashfreeError);
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        ...(paymentLinkUrl ? { paymentLinkUrl } : {}),
        ...(cashfreeOrderId ? { cashfreeOrderId } : {}),
      },
      include: { items: true, serviceRequest: { include: { customer: true, vehicle: true } } },
    });

    let whatsappSent = false;
    try {
      if (!process.env.MSGKART_API_KEY || !process.env.MSGKART_SENDER_ID) {
        throw new Error("MsgKart env vars not configured");
      }
      const wa = new MsgKartPlugin();
      const phone = "91" + customer.phone.replace(/\D/g, "").slice(-10);
      const result = await wa.sendTemplate({
        to: phone,
        templateName: "invoice_ready",
        variables: {
          name: customer.name,
          amount: String(Number(full.total)),
          link: paymentLinkUrl ?? "",
        },
      });
      whatsappSent = result.status !== "failed";
    } catch (err) {
      console.error("[invoices/retrigger] WhatsApp failed:", err);
    }

    return NextResponse.json({ invoice: updated, paymentLinkUrl, whatsappSent, cashfreeError });
  }

  // ── Update tax / discount ──────────────────────────────────────────────────
  if (body.taxPercent != null || body.discountAmount != null) {
    const subtotal = Number(invoice.subtotal);
    const taxPercent = body.taxPercent != null ? Number(body.taxPercent) : Number(invoice.taxPercent);
    const discountAmount =
      body.discountAmount != null ? Number(body.discountAmount) : Number(invoice.discountAmount);
    const taxAmount = Math.round(subtotal * taxPercent) / 100;
    const total = subtotal + taxAmount - discountAmount;

    const updated = await prisma.invoice.update({
      where: { id },
      data: { taxPercent, taxAmount, discountAmount, total },
      include: { items: true, serviceRequest: { include: { customer: true, vehicle: true } } },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "No valid operation in request body" }, { status: 400 });
});
