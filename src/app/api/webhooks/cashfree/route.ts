// POST /api/webhooks/cashfree
// Cashfree calls this URL when a payment status changes.
// We verify the signature, then mark the invoice as PAID.

import { NextResponse, type NextRequest } from "next/server";
import { getPaymentProvider } from "@/lib/plugins/payments";
import { prisma } from "@/lib/connectors/prisma";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature") ?? "";

  const provider = getPaymentProvider();

  // Reject requests with invalid signatures immediately
  if (!provider.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const orderId = payload?.data?.order?.order_id; // Cashfree v2023-08-01 shape
  const orderStatus = payload?.data?.order?.order_status;

  if (!orderId) {
    return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
  }

  if (orderStatus === "PAID") {
    await prisma.invoice.updateMany({
      where: { id: orderId, status: { not: "PAID" } },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paidAmount: payload?.data?.payment?.payment_amount ?? 0,
        paymentMethod: mapPaymentMethod(payload?.data?.payment?.payment_group),
      },
    });
  }

  return NextResponse.json({ received: true });
}

function mapPaymentMethod(group?: string): "CASH" | "UPI" | "CARD" | "NEFT" | "CHEQUE" {
  switch (group?.toUpperCase()) {
    case "UPI": return "UPI";
    case "CARD": return "CARD";
    case "NET_BANKING": return "NEFT";
    default: return "CASH";
  }
}
