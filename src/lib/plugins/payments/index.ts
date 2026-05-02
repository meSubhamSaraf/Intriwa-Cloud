// ─────────────────────────────────────────────────────────────────────────────
// Plugin: Payments — Provider Factory
// ─────────────────────────────────────────────────────────────────────────────
// Returns the active payment provider based on the PAYMENT_PROVIDER env var.
// Adding a new provider (e.g. Razorpay): create razorpay.ts implementing
// PaymentProvider, then add a case here.  Nothing else needs to change.
// ─────────────────────────────────────────────────────────────────────────────

import type { PaymentProvider } from "./interface";
import { CashfreePlugin } from "./cashfree";

export type { PaymentProvider, CreateOrderParams, OrderResult } from "./interface";

// Singleton — instantiated once per server process
let _provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (_provider) return _provider;

  const name = process.env.PAYMENT_PROVIDER ?? "cashfree";

  switch (name) {
    case "cashfree":
      _provider = new CashfreePlugin();
      break;
    // case "razorpay":
    //   _provider = new RazorpayPlugin();
    //   break;
    default:
      throw new Error(`Unknown PAYMENT_PROVIDER: "${name}"`);
  }

  return _provider;
}
