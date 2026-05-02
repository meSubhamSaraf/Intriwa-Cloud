// ─────────────────────────────────────────────────────────────────────────────
// Service: ServiceRequest (SR)
// ─────────────────────────────────────────────────────────────────────────────
// Manages the job card lifecycle: create → update → close → invoice.
//
// When closeAndInvoice() is called it:
//   1. Creates the Invoice row
//   2. Deducts inventory via InventoryService for each SRInventoryUsage row
//   3. Appends an INVOICE_RAISED timeline event
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/connectors/prisma";
import { InventoryService } from "./inventory.service";
import type { ServiceRequest, SRStatus } from "@/generated/prisma/client";

const inventoryService = new InventoryService();

export type CreateSRInput = {
  garageId: string;
  customerId?: string;
  vehicleId?: string;
  societyId?: string;
  mechanicId?: string;
  locationType?: "GARAGE" | "SOCIETY" | "FIELD";
  complaint?: string;
  scheduledAt?: Date;
  notes?: string;
};

export type UpdateSRInput = Partial<
  Pick<ServiceRequest, "status" | "mechanicId" | "diagnosis" | "notes" | "closedAt">
>;

export class ServiceRequestService {
  async listByGarage(
    garageId: string,
    filters?: { status?: SRStatus; mechanicId?: string }
  ) {
    return prisma.serviceRequest.findMany({
      where: { garageId, ...filters },
      include: { customer: true, vehicle: true, mechanic: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(id: string) {
    return prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
        mechanic: true,
        items: {
          include: { assignedMechanic: { select: { id: true, name: true } } },
        },
        addOns: true,
        timelineEvents: { orderBy: { createdAt: "asc" } },
        inventoryUsages: { include: { inventoryItem: true } },
        invoices: true,
      },
    });
  }

  async create(input: CreateSRInput): Promise<ServiceRequest> {
    const year = new Date().getFullYear();

    for (let attempt = 0; attempt < 5; attempt++) {
      // Count per garage so each garage has its own sequential numbering
      const count = await prisma.serviceRequest.count({
        where: { garageId: input.garageId },
      });
      const srNumber = `SR-${year}-${String(count + 1).padStart(4, "0")}`;
      try {
        return await prisma.serviceRequest.create({ data: { ...input, srNumber } });
      } catch (err: unknown) {
        // P2002 = unique constraint violation (srNumber collision) — retry
        if (
          attempt < 4 &&
          err !== null &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "P2002"
        ) {
          continue;
        }
        throw err;
      }
    }
    throw new Error("Could not generate a unique SR number after 5 attempts");
  }

  async updateStatus(
    id: string,
    status: SRStatus,
    actorId?: string,
    actorName?: string
  ): Promise<ServiceRequest> {
    const sr = await prisma.serviceRequest.findUniqueOrThrow({ where: { id } });

    return prisma.$transaction(async (tx) => {
      const updated = await tx.serviceRequest.update({
        where: { id },
        data: { status, closedAt: status === "CLOSED" ? new Date() : undefined },
      });

      await tx.timelineEvent.create({
        data: {
          serviceRequestId: id,
          type: "STATUS_CHANGE",
          actorId,
          actorName,
          body: `Status changed from ${sr.status} to ${status}`,
          metadata: { from: sr.status, to: status },
        },
      });

      return updated;
    });
  }

  // Raises an invoice, deducts inventory, and closes the SR
  async closeAndInvoice(srId: string, actorId?: string, actorName?: string) {
    const sr = await prisma.serviceRequest.findUniqueOrThrow({
      where: { id: srId },
      include: {
        items: true,
        inventoryUsages: { include: { inventoryItem: true } },
      },
    });

    const year = new Date().getFullYear();
    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, "0")}`;

    // Use plain number arithmetic — Prisma Decimal fields accept numbers
    const labourTotal = sr.items.reduce((s, i) => s + Number(i.total), 0);
    const partsTotal = sr.inventoryUsages.reduce((s, u) => s + Number(u.total), 0);
    const subtotal = labourTotal + partsTotal;

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          garageId: sr.garageId,
          serviceRequestId: srId,
          invoiceNumber,
          subtotal,
          total: subtotal,
          items: {
            create: [
              ...sr.items.map((i) => ({
                description: i.description,
                quantity: i.quantity,
                unitPrice: Number(i.unitPrice),
                total: Number(i.total),
              })),
              ...sr.inventoryUsages.map((u) => ({
                description: u.inventoryItem.name,
                quantity: Number(u.quantity),
                unitPrice: Number(u.unitPrice),
                total: Number(u.total),
              })),
            ],
          },
        },
      });

      await tx.serviceRequest.update({
        where: { id: srId },
        data: { status: "CLOSED", closedAt: new Date() },
      });

      await tx.timelineEvent.create({
        data: {
          serviceRequestId: srId,
          type: "INVOICE_RAISED",
          actorId,
          actorName,
          body: `Invoice ${invoiceNumber} raised for ₹${subtotal.toFixed(2)}`,
        },
      });

      return inv;
    });

    // Deduct inventory after the transaction commits
    for (const usage of sr.inventoryUsages) {
      await inventoryService.deductStock({
        inventoryItemId: usage.inventoryItemId,
        qty: Number(usage.quantity),
        relatedSrId: srId,
        actorId,
        actorName,
      });
    }

    return invoice;
  }
}
