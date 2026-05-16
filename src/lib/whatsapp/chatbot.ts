// WhatsApp Chatbot — customer-facing conversational interface.
//
// Flow overview:
//   Customer says hi → main menu → pick option → drill down → back to menu
//
// Sessions are stored in WhatsAppSession (expires after 30 min of inactivity).
// All replies are free-form text — works within the 24-hour customer-initiated window.

import { prisma } from "@/lib/connectors/prisma";
import { MsgKartPlugin } from "@/lib/plugins/whatsapp/msgkart";

// ── Types ──────────────────────────────────────────────────────────────────────

type State =
  | "main_menu"
  | "vehicles_book"   // picking vehicle for a booking request
  | "service_type"    // picking service type after vehicle
  | "book_confirm"    // confirming booking details
  | "history"         // viewing history (terminal — reply anything to go back)
  | "vehicles_view"   // viewing vehicle list (terminal)
  | "track"           // viewing active SR (terminal)
  | "upcoming";       // viewing scheduled SRs (terminal)

type Ctx = {
  vehicleId?: string;
  vehicleName?: string;
  serviceType?: string;
  vehicleOptions?: { id: string; label: string }[];
};

type Vehicle = { id: string; make: string; model: string; regNumber: string | null };
type SR = {
  id: string; srNumber: string; status: string; complaint: string | null;
  scheduledAt: Date | null; closedAt: Date | null;
  mechanic: { name: string } | null;
  items: { description: string; total: { toString(): string } }[];
};
type CustomerWithData = {
  id: string; name: string; garageId: string;
  vehicles: Vehicle[];
  serviceRequests: SR[];
};

// ── Constants ──────────────────────────────────────────────────────────────────

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const GREETING_RE = /^(hi+|hello|hey|hola|help|start|menu|namaste|salam|ola|yo|👋)$/i;
const BACK_RE = /^(0|back|go back|menu|main)$/i;
const YES_RE = /^(y|yes|1|ok|okay|confirm|haan|ha)$/i;
const NO_RE = /^(n|no|0|cancel|nahi|nope)$/i;

const SERVICE_TYPES: Record<string, string> = {
  "1": "Regular service (oil, filter, fluid top-up)",
  "2": "Repair / breakdown issue",
  "3": "Inspection / check-up",
  "4": "Other (our team will call to understand)",
};

const STATUS_EMOJI: Record<string, string> = {
  OPEN: "🗓️ Scheduled",
  IN_PROGRESS: "🔧 In Progress",
  WAITING_PARTS: "⏳ Waiting for Parts",
  READY: "✅ Ready for Pickup",
  CLOSED: "☑️ Closed",
};

// ── Session helpers ────────────────────────────────────────────────────────────

async function getSession(phone: string, garageId: string) {
  const now = new Date();
  return prisma.whatsAppSession.findFirst({
    where: { phone, garageId, expiresAt: { gte: now } },
  });
}

async function upsertSession(phone: string, garageId: string, state: State, context: Ctx) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.whatsAppSession.upsert({
    where: { phone_garageId: { phone, garageId } },
    create: { phone, garageId, state, context: context as object, expiresAt },
    update: { state, context: context as object, expiresAt },
  });
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function vehicleLabel(v: Vehicle) {
  return `${v.make} ${v.model}${v.regNumber ? ` (${v.regNumber})` : ""}`;
}

function mainMenu(firstName: string, garageName: string): string {
  return (
    `Hi ${firstName}! 👋 Welcome to *${garageName}*.\n\n` +
    `How can I help you today?\n\n` +
    `1️⃣  Book a service\n` +
    `2️⃣  My service history\n` +
    `3️⃣  My vehicles\n` +
    `4️⃣  Track active service\n` +
    `5️⃣  Upcoming appointments\n\n` +
    `Reply with a number. Type *menu* anytime to restart. 🙏`
  );
}

function backNote(): string {
  return "\n\nReply *menu* to go back to the main menu.";
}

// ── Main handler ──────────────────────────────────────────────────────────────

export class WhatsAppChatbot {
  private wa = new MsgKartPlugin();

  async handle(from: string, text: string): Promise<void> {
    const trimmed = text.trim();

    // Look up the customer (matched on last 10 digits of phone)
    const phoneDigits = from.replace(/\D/g, "").slice(-10);
    const customer = await prisma.customer.findFirst({
      where: { phone: { contains: phoneDigits } },
      include: {
        vehicles: { orderBy: { createdAt: "asc" } },
        serviceRequests: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            mechanic: { select: { name: true } },
            items: { select: { description: true, total: true }, take: 3 },
          },
        },
      },
    });

    if (!customer) {
      // Unknown number — log and acknowledge
      await this.send(from, "Hi! 👋 Thanks for reaching out. Our team will get back to you shortly. 🙏");
      return;
    }

    const garageId = customer.garageId;
    const garage = await prisma.garage.findUnique({ where: { id: garageId }, select: { name: true } });
    const garageName = garage?.name ?? "the garage";
    const firstName = customer.name.split(" ")[0];

    // Get or create session
    const session = await getSession(from, garageId);
    const state: State = (session?.state ?? "main_menu") as State;
    const ctx: Ctx = (session?.context ?? {}) as Ctx;

    let reply = "";
    let nextState: State = state;
    let nextCtx: Ctx = ctx;

    // Global: greeting or "menu" always resets to main menu
    if (GREETING_RE.test(trimmed) || trimmed.toLowerCase() === "menu") {
      reply = mainMenu(firstName, garageName);
      nextState = "main_menu";
      nextCtx = {};
    } else if (BACK_RE.test(trimmed) && state !== "main_menu") {
      reply = mainMenu(firstName, garageName);
      nextState = "main_menu";
      nextCtx = {};
    } else {
      switch (state) {
        case "main_menu":
          ({ reply, nextState, nextCtx } = await this.handleMainMenu(trimmed, customer, firstName, garageName));
          break;

        case "vehicles_book":
          ({ reply, nextState, nextCtx } = this.handleVehicleBook(trimmed, ctx, customer.vehicles));
          break;

        case "service_type":
          ({ reply, nextState, nextCtx } = this.handleServiceType(trimmed, ctx));
          break;

        case "book_confirm":
          ({ reply, nextState, nextCtx } = await this.handleBookConfirm(trimmed, customer, ctx, garageId, from));
          break;

        // Terminal states — any reply goes back to main menu
        case "history":
        case "vehicles_view":
        case "track":
        case "upcoming":
          reply = mainMenu(firstName, garageName);
          nextState = "main_menu";
          nextCtx = {};
          break;

        default:
          reply = mainMenu(firstName, garageName);
          nextState = "main_menu";
          nextCtx = {};
      }
    }

    // Save session
    await upsertSession(from, garageId, nextState, nextCtx);

    // Send reply
    if (reply) {
      await this.send(from, reply);

      // Log outbound to WhatsApp message history
      await prisma.whatsAppMessage.create({
        data: {
          garageId, customerId: customer.id,
          direction: "outbound", body: reply,
          status: "sent", sentBy: "bot",
        },
      }).catch(() => {});
    }
  }

  // ── State handlers ──────────────────────────────────────────────────────────

  private async handleMainMenu(
    text: string,
    customer: CustomerWithData,
    firstName: string,
    garageName: string,
  ): Promise<{ reply: string; nextState: State; nextCtx: Ctx }> {
    switch (text) {
      case "1": {
        // Book a service — pick a vehicle
        if (customer.vehicles.length === 0) {
          return {
            reply: `You don't have any vehicles registered with us yet. Please call or visit to add your vehicle.${backNote()}`,
            nextState: "main_menu",
            nextCtx: {},
          };
        }
        const vehicleOptions = customer.vehicles.map((v, i) => ({ id: v.id, label: vehicleLabel(v), index: i + 1 }));
        const list = vehicleOptions.map((v) => `${v.index}️⃣  ${v.label}`).join("\n");
        return {
          reply: `Which vehicle would you like to service?\n\n${list}\n\n0️⃣  Go back`,
          nextState: "vehicles_book",
          nextCtx: { vehicleOptions: vehicleOptions.map(v => ({ id: v.id, label: v.label })) },
        };
      }

      case "2":
        return this.buildHistory(customer.serviceRequests);

      case "3":
        return this.buildVehiclesList(customer.vehicles);

      case "4":
        return this.buildTrackService(customer.serviceRequests);

      case "5":
        return this.buildUpcoming(customer.serviceRequests);

      default:
        return {
          reply: `Please reply with *1*, *2*, *3*, *4*, or *5* to pick an option. 🙏\n\n1️⃣ Book  2️⃣ History  3️⃣ Vehicles  4️⃣ Track  5️⃣ Upcoming`,
          nextState: "main_menu",
          nextCtx: {},
        };
    }
  }

  private handleVehicleBook(
    text: string,
    ctx: Ctx,
    vehicles: Vehicle[],
  ): { reply: string; nextState: State; nextCtx: Ctx } {
    const options = ctx.vehicleOptions ?? vehicles.map((v, i) => ({ id: v.id, label: vehicleLabel(v) }));
    const idx = Number(text) - 1;
    if (isNaN(idx) || idx < 0 || idx >= options.length) {
      const list = options.map((v, i) => `${i + 1}️⃣  ${v.label}`).join("\n");
      return {
        reply: `Please reply with a number from 1 to ${options.length}.\n\n${list}\n\n0️⃣  Go back`,
        nextState: "vehicles_book",
        nextCtx: ctx,
      };
    }
    const selected = options[idx];
    return {
      reply:
        `Great! *${selected.label}* selected.\n\nWhat kind of service do you need?\n\n` +
        `1️⃣  Regular service (oil, filters, fluid top-up)\n` +
        `2️⃣  Repair / breakdown issue\n` +
        `3️⃣  Inspection / check-up\n` +
        `4️⃣  Other — describe when we call\n\n` +
        `0️⃣  Go back`,
      nextState: "service_type",
      nextCtx: { ...ctx, vehicleId: selected.id, vehicleName: selected.label },
    };
  }

  private handleServiceType(
    text: string,
    ctx: Ctx,
  ): { reply: string; nextState: State; nextCtx: Ctx } {
    const serviceType = SERVICE_TYPES[text];
    if (!serviceType) {
      return {
        reply: `Please reply with 1, 2, 3, or 4 to pick a service type.\n\n0️⃣  Go back`,
        nextState: "service_type",
        nextCtx: ctx,
      };
    }
    return {
      reply:
        `📋 *Booking Summary*\n\n` +
        `🚗 Vehicle: ${ctx.vehicleName}\n` +
        `🔧 Service: ${serviceType}\n\n` +
        `Our team will call you shortly to confirm the slot and any specific needs.\n\n` +
        `*Reply Y to confirm* or *N to cancel.*`,
      nextState: "book_confirm",
      nextCtx: { ...ctx, serviceType },
    };
  }

  private async handleBookConfirm(
    text: string,
    customer: CustomerWithData,
    ctx: Ctx,
    garageId: string,
    from: string,
  ): Promise<{ reply: string; nextState: State; nextCtx: Ctx }> {
    if (YES_RE.test(text)) {
      // Create a lead so the ops team can follow up and convert it to an SR
      await prisma.lead.create({
        data: {
          garageId,
          customerId: customer.id,
          name: customer.name,
          phone: from.slice(-10),
          vehicleInfo: ctx.vehicleName ?? "",
          source: "whatsapp_bot",
          notes: `Service requested via WhatsApp bot: ${ctx.serviceType ?? "Not specified"}. Vehicle: ${ctx.vehicleName ?? "Not specified"}.`,
          status: "NEW",
        },
      }).catch(() => {});

      return {
        reply:
          `✅ *Booking request confirmed!*\n\n` +
          `Your request for *${ctx.vehicleName}* has been logged. Our team will call you within a few hours to confirm the appointment. 🙏\n\n` +
          `Type *menu* to go back to the main menu.`,
        nextState: "main_menu",
        nextCtx: {},
      };
    }

    if (NO_RE.test(text)) {
      return {
        reply: `No problem! Booking cancelled. 👍\n\nType *menu* whenever you need help.`,
        nextState: "main_menu",
        nextCtx: {},
      };
    }

    return {
      reply: `Please reply *Y* to confirm or *N* to cancel the booking.`,
      nextState: "book_confirm",
      nextCtx: ctx,
    };
  }

  // ── Data builders ───────────────────────────────────────────────────────────

  private buildHistory(serviceRequests: SR[]): { reply: string; nextState: State; nextCtx: Ctx } {
    const closed = serviceRequests.filter((sr) => sr.status === "CLOSED").slice(0, 5);
    if (closed.length === 0) {
      return {
        reply: `No completed services found yet. Ready to book your first one?\n\nType *1* to book a service.${backNote()}`,
        nextState: "history",
        nextCtx: {},
      };
    }
    const lines = closed.map((sr, i) => {
      const services = sr.items.length > 0 ? sr.items.map((it) => it.description).join(", ") : sr.complaint ?? "Service";
      return `${i + 1}. ${services.slice(0, 60)}${services.length > 60 ? "…" : ""}\n   📅 ${fmtDate(sr.closedAt)} · ☑️ Done`;
    });
    return {
      reply: `🗂️ *Your recent services:*\n\n${lines.join("\n\n")}${backNote()}`,
      nextState: "history",
      nextCtx: {},
    };
  }

  private buildVehiclesList(vehicles: Vehicle[]): { reply: string; nextState: State; nextCtx: Ctx } {
    if (vehicles.length === 0) {
      return {
        reply: `No vehicles registered yet. Visit us or call to add your vehicle.${backNote()}`,
        nextState: "vehicles_view",
        nextCtx: {},
      };
    }
    const lines = vehicles.map((v, i) => `${i + 1}. 🚗 *${v.make} ${v.model}*${v.regNumber ? `  (${v.regNumber})` : ""}`);
    return {
      reply: `🚗 *Your vehicles:*\n\n${lines.join("\n")}${backNote()}`,
      nextState: "vehicles_view",
      nextCtx: {},
    };
  }

  private buildTrackService(serviceRequests: SR[]): { reply: string; nextState: State; nextCtx: Ctx } {
    const active = serviceRequests.filter((sr) =>
      ["OPEN", "IN_PROGRESS", "WAITING_PARTS", "READY"].includes(sr.status),
    );
    if (active.length === 0) {
      return {
        reply: `No active service at the moment. 🙌\n\nWant to book one? Reply *1* or type *menu*.${backNote()}`,
        nextState: "track",
        nextCtx: {},
      };
    }
    const lines = active.map((sr) => {
      const status = STATUS_EMOJI[sr.status] ?? sr.status;
      const mechanic = sr.mechanic ? `\n   👨‍🔧 Mechanic: ${sr.mechanic.name}` : "";
      const scheduled = sr.scheduledAt ? `\n   📅 Scheduled: ${fmtDate(sr.scheduledAt)}` : "";
      return `*${sr.srNumber}*\n   ${status}${mechanic}${scheduled}`;
    });
    const suffix = active.some((sr) => sr.status === "READY")
      ? "\n\n✅ *Your vehicle is ready for pickup!* Head over to the garage. 🎉"
      : "\n\nWe'll notify you when your vehicle is ready! 🙏";
    return {
      reply: `🔍 *Active service${active.length > 1 ? "s" : ""}:*\n\n${lines.join("\n\n")}${suffix}${backNote()}`,
      nextState: "track",
      nextCtx: {},
    };
  }

  private buildUpcoming(serviceRequests: SR[]): { reply: string; nextState: State; nextCtx: Ctx } {
    const now = new Date();
    const upcoming = serviceRequests
      .filter((sr) => sr.scheduledAt && new Date(sr.scheduledAt) > now && sr.status === "OPEN")
      .slice(0, 3);
    if (upcoming.length === 0) {
      return {
        reply: `No upcoming appointments scheduled. 📭\n\nType *1* to book a service or *menu* for more options.`,
        nextState: "upcoming",
        nextCtx: {},
      };
    }
    const lines = upcoming.map((sr) => {
      const complaint = sr.complaint ? ` — ${sr.complaint}` : "";
      return `📅 *${fmtDate(sr.scheduledAt)}*${complaint}\n   Ref: ${sr.srNumber}`;
    });
    return {
      reply: `📅 *Upcoming appointments:*\n\n${lines.join("\n\n")}${backNote()}`,
      nextState: "upcoming",
      nextCtx: {},
    };
  }

  // ── Sender ──────────────────────────────────────────────────────────────────

  private async send(to: string, body: string) {
    try {
      await this.wa.sendText(to, body);
    } catch (err) {
      console.error("[chatbot] sendText failed", err);
    }
  }
}
