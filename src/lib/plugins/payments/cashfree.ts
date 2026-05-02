// ─────────────────────────────────────────────────────────────────────────────
// Plugin: Payments — Cashfree Implementation
// ─────────────────────────────────────────────────────────────────────────────
// Docs: https://docs.cashfree.com/docs/payments-api
// Env vars required:
//   CASHFREE_APP_ID      — from Cashfree dashboard
//   CASHFREE_SECRET_KEY  — from Cashfree dashboard
//   CASHFREE_ENV         — "TEST" or "PROD"
// ─────────────────────────────────────────────────────────────────────────────

import crypto from "crypto";
import type {
  PaymentProvider,
  CreateOrderParams,
  OrderResult,
  VerifyPaymentParams,
  PaymentVerificationResult,
} from "./interface";

const APP_ID = process.env.CASHFREE_APP_ID!;
const SECRET = process.env.CASHFREE_SECRET_KEY!;
const ENV = process.env.CASHFREE_ENV ?? "TEST";

// Cashfree uses different base URLs per environment
const BASE_URL =
  ENV === "PROD"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

// Helper to build the auth headers Cashfree expects on every request
function authHeaders() {
  return {
    "Content-Type": "application/json",
    "x-client-id": APP_ID,
    "x-client-secret": SECRET,
    "x-api-version": "2023-08-01",
  };
}

export class CashfreePlugin implements PaymentProvider {
  async createOrder(params: CreateOrderParams): Promise<OrderResult> {
    const body = {
      order_id: params.orderId,
      order_amount: params.amount / 100, // Cashfree uses rupees, not paise
      order_currency: params.currency,
      customer_details: {
        customer_id: params.orderId,
        customer_name: params.customerName,
        customer_email: params.customerEmail,
        customer_phone: params.customerPhone,
      },
      order_meta: {
        return_url: `${params.returnUrl}?order_id={order_id}`,
      },
    };

    const res = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Cashfree createOrder failed: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    return {
      providerOrderId: data.order_id,
      paymentSessionId: data.payment_session_id, // pass this to Cashfree JS SDK
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult> {
    const res = await fetch(`${BASE_URL}/orders/${params.providerOrderId}`, {
      headers: authHeaders(),
    });

    if (!res.ok) {
      return { success: false, status: "FAILED" };
    }

    const data = await res.json();
    const paid = data.order_status === "PAID";

    return {
      success: paid,
      status: paid ? "PAID" : data.order_status ?? "PENDING",
      // Cashfree returns amount in rupees — convert back to paise for consistency
      amount: paid ? Math.round(data.order_amount * 100) : undefined,
      rawResponse: data,
    };
  }

  // Cashfree signs webhooks with HMAC-SHA256 using the secret key
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const expected = crypto
      .createHmac("sha256", SECRET)
      .update(rawBody)
      .digest("base64");
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  }
}
