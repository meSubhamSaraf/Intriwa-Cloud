// ─────────────────────────────────────────────────────────────────────────────
// Plugin: Payments — Provider Interface
// ─────────────────────────────────────────────────────────────────────────────
// All payment gateway implementations must satisfy this interface.
// This lets us swap Cashfree → Razorpay (or anything else) by changing a
// single env var (PAYMENT_PROVIDER) without touching any business logic.
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateOrderParams {
  orderId: string;       // our internal Invoice.id
  amount: number;        // in paise / smallest currency unit
  currency: string;      // "INR"
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;     // redirect after payment
}

export interface OrderResult {
  providerOrderId: string; // ID from the payment gateway
  paymentSessionId?: string; // Cashfree: needed to initialise their SDK
  checkoutUrl?: string;     // Razorpay: hosted page URL
}

export interface VerifyPaymentParams {
  providerOrderId: string;
  paymentId?: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  status: "PAID" | "PENDING" | "FAILED" | "CANCELLED";
  amount?: number;       // confirmed paid amount (paise)
  paymentId?: string;
  rawResponse?: unknown; // full gateway response for audit logging
}

// Every payment gateway plugin implements this contract
export interface PaymentProvider {
  createOrder(params: CreateOrderParams): Promise<OrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}
