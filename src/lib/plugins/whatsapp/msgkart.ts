// ─────────────────────────────────────────────────────────────────────────────
// Plugin: WhatsApp — MsgKart
// ─────────────────────────────────────────────────────────────────────────────
// MsgKart is the WhatsApp Business API reseller we use.
// Env vars required:
//   MSGKART_API_KEY       — from MsgKart dashboard
//   MSGKART_SENDER_ID     — your approved WhatsApp number / sender ID
//   MSGKART_WEBHOOK_SECRET— for verifying inbound webhook payloads
//
// Usage:
//   const wa = new MsgKartPlugin();
//   await wa.sendTemplate("919876543210", "service_ready", { name: "Ravi" });
// ─────────────────────────────────────────────────────────────────────────────

import crypto from "crypto";

const API_KEY = process.env.MSGKART_API_KEY!;
const SENDER_ID = process.env.MSGKART_SENDER_ID!;
const WEBHOOK_SECRET = process.env.MSGKART_WEBHOOK_SECRET!;

// Shape of a single WhatsApp message we can send
export interface WASendParams {
  to: string;              // E.164 format e.g. "919876543210"
  templateName: string;    // must be approved in your MsgKart account
  variables?: Record<string, string>; // {{1}}, {{2}}, … placeholder values
  language?: string;       // default "en"
}

export interface WASendResult {
  messageId: string;
  status: "queued" | "sent" | "failed";
  rawResponse?: unknown;
}

export class MsgKartPlugin {
  private baseUrl = "https://api.msgkart.com/v1"; // replace if MsgKart changes

  async sendTemplate(params: WASendParams): Promise<WASendResult> {
    // Build the variable array in the order MsgKart expects: [{type:"text",text:"val"}]
    const components = params.variables
      ? [
          {
            type: "body",
            parameters: Object.values(params.variables).map((v) => ({
              type: "text",
              text: v,
            })),
          },
        ]
      : [];

    const body = {
      messaging_product: "whatsapp",
      to: params.to,
      type: "template",
      sender_id: SENDER_ID,
      template: {
        name: params.templateName,
        language: { code: params.language ?? "en" },
        components,
      },
    };

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[MsgKart] sendTemplate failed", data);
      return { messageId: "", status: "failed", rawResponse: data };
    }

    return {
      messageId: data.messages?.[0]?.id ?? "",
      status: "queued",
      rawResponse: data,
    };
  }

  // Verifies that an inbound webhook actually came from MsgKart.
  // MsgKart sends a HMAC-SHA256 signature in the X-MsgKart-Signature header.
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!WEBHOOK_SECRET) return false;
    const expected = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(`sha256=${expected}`),
      Buffer.from(signature)
    );
  }
}
