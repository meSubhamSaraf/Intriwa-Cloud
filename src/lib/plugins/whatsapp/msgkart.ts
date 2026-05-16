// ─────────────────────────────────────────────────────────────────────────────
// Plugin: WhatsApp — MsgKart
// ─────────────────────────────────────────────────────────────────────────────
// Env vars required:
//   MSGKART_API_KEY         — from MsgKart dashboard
//   MSGKART_BUSINESS_ID     — WhatsApp Business Account ID
//   MSGKART_PHONE_NUMBER_ID — WhatsApp Phone Number ID (used as phoneNumberId)
//   MSGKART_WEBHOOK_SECRET  — for verifying inbound webhook payloads
//
// API base: https://alb-backend.msgkart.com/api/v1/message/<BUSINESS_ID>/<TYPE>?apikey=<KEY>
// Only template messages are supported by MsgKart's API.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from "crypto";

const API_KEY       = process.env.MSGKART_API_KEY!;
const BUSINESS_ID   = process.env.MSGKART_BUSINESS_ID!;
const PHONE_NUM_ID  = process.env.MSGKART_PHONE_NUMBER_ID ?? process.env.MSGKART_SENDER_ID!;
const WEBHOOK_SECRET = process.env.MSGKART_WEBHOOK_SECRET!;

const BASE = "https://alb-backend.msgkart.com/api/v1/message";

export interface WASendResult {
  messageId: string;
  status: "queued" | "sent" | "failed";
  rawResponse?: unknown;
}

export class MsgKartPlugin {
  private url(type: string) {
    return `${BASE}/${BUSINESS_ID}/${type}?apikey=${API_KEY}`;
  }

  private async post(type: string, body: object): Promise<WASendResult> {
    const res = await fetch(this.url(type), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[MsgKart] ${type} failed`, data);
      return { messageId: "", status: "failed", rawResponse: data };
    }
    const msgId = (data as { messageId?: string }).messageId ?? "";
    return { messageId: msgId, status: "queued", rawResponse: data };
  }

  async sendTemplate(
    to: string,
    templateName: string,
    variables?: Record<string, string>,
    language = "en",
  ): Promise<WASendResult> {
    const components = variables && Object.keys(variables).length > 0
      ? [{
          type: "body",
          parameters: Object.values(variables).map((v) => ({ type: "text", text: v })),
        }]
      : [];

    return this.post("template", {
      message: { messageType: "template", name: templateName, language, components },
      to,
      phoneNumberId: PHONE_NUM_ID,
    });
  }

  // Sends a media message via a template that has a header with an image/video/document.
  // The template must have a header component of type IMAGE, VIDEO, or DOCUMENT.
  async sendMedia(
    to: string,
    templateName: string,
    mediaUrl: string,
    mediaType: "image" | "video" | "document" = "image",
    bodyVariables?: Record<string, string>,
  ): Promise<WASendResult> {
    const components: object[] = [
      {
        type: "header",
        parameters: [{ type: mediaType, [mediaType]: { link: mediaUrl } }],
      },
    ];
    if (bodyVariables && Object.keys(bodyVariables).length > 0) {
      components.push({
        type: "body",
        parameters: Object.values(bodyVariables).map((v) => ({ type: "text", text: v })),
      });
    }

    return this.post("template", {
      message: { messageType: "template", name: templateName, language: "en", components },
      to,
      phoneNumberId: PHONE_NUM_ID,
    });
  }

  // Verifies that an inbound webhook actually came from MsgKart.
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!WEBHOOK_SECRET) return true; // skip verification if secret not configured yet
    const expected = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(`sha256=${expected}`),
      Buffer.from(signature),
    );
  }
}
