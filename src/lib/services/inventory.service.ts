// ─────────────────────────────────────────────────────────────────────────────
// Service: Inventory
// ─────────────────────────────────────────────────────────────────────────────
// Manages stock levels and the immutable audit trail.
//
// Key invariant: every change to stockQty or unitPrice MUST produce an
// InventoryAuditEntry row.  Do not update the item directly — always go
// through addStock() or updatePrice() so the audit is never skipped.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/connectors/prisma";
import type { InventoryItem, InventoryAuditEntry } from "@/generated/prisma/client";

export type AddStockInput = {
  inventoryItemId: string;
  qty: number;
  comment?: string;  // one of comment or fileUrl must be provided
  fileUrl?: string;
  actorId?: string;
  actorName?: string;
};

export type UpdatePriceInput = {
  inventoryItemId: string;
  newPrice: number;
  comment?: string;
  fileUrl?: string;
  actorId?: string;
  actorName?: string;
};

// Deducted automatically when an SR invoice is raised
export type DeductStockInput = {
  inventoryItemId: string;
  qty: number;
  relatedSrId: string;
  actorId?: string;
  actorName?: string;
};

export class InventoryService {
  async listByGarage(garageId: string): Promise<InventoryItem[]> {
    return prisma.inventoryItem.findMany({
      where: { garageId, isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async getWithAudit(
    id: string
  ): Promise<(InventoryItem & { auditEntries: InventoryAuditEntry[] }) | null> {
    return prisma.inventoryItem.findUnique({
      where: { id },
      include: { auditEntries: { orderBy: { createdAt: "desc" } } },
    });
  }

  // Add stock — requires at least one of comment or fileUrl (business rule)
  async addStock(input: AddStockInput): Promise<InventoryItem> {
    if (!input.comment && !input.fileUrl) {
      throw new Error("Either a comment or a file must be provided to add stock.");
    }

    return prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUniqueOrThrow({
        where: { id: input.inventoryItemId },
      });

      // Prisma Decimal fields accept plain numbers — store as string for precision
      const oldQty = Number(item.stockQty);
      const newQty = oldQty + input.qty;

      const updated = await tx.inventoryItem.update({
        where: { id: input.inventoryItemId },
        data: { stockQty: newQty },
      });

      await tx.inventoryAuditEntry.create({
        data: {
          inventoryItemId: input.inventoryItemId,
          type: "STOCK_ADD",
          actorId: input.actorId,
          actorName: input.actorName,
          oldQty,
          newQty,
          comment: input.comment,
          fileUrl: input.fileUrl,
        },
      });

      return updated;
    });
  }

  // Update unit price — requires at least one of comment or fileUrl
  async updatePrice(input: UpdatePriceInput): Promise<InventoryItem> {
    if (!input.comment && !input.fileUrl) {
      throw new Error("Either a comment or a file must be provided to update price.");
    }

    return prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUniqueOrThrow({
        where: { id: input.inventoryItemId },
      });

      const updated = await tx.inventoryItem.update({
        where: { id: input.inventoryItemId },
        data: { unitPrice: input.newPrice },
      });

      await tx.inventoryAuditEntry.create({
        data: {
          inventoryItemId: input.inventoryItemId,
          type: "PRICE_UPDATE",
          actorId: input.actorId,
          actorName: input.actorName,
          oldPrice: Number(item.unitPrice),
          newPrice: input.newPrice,
          comment: input.comment,
          fileUrl: input.fileUrl,
        },
      });

      return updated;
    });
  }

  // Auto-deduct when an invoice is raised — no comment required (system action)
  async deductStock(input: DeductStockInput): Promise<InventoryItem> {
    return prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUniqueOrThrow({
        where: { id: input.inventoryItemId },
      });

      const oldQty = Number(item.stockQty);
      const newQty = oldQty - input.qty;

      if (newQty < 0) {
        throw new Error(`Insufficient stock for item "${item.name}"`);
      }

      const updated = await tx.inventoryItem.update({
        where: { id: input.inventoryItemId },
        data: { stockQty: newQty },
      });

      await tx.inventoryAuditEntry.create({
        data: {
          inventoryItemId: input.inventoryItemId,
          type: "STOCK_DEDUCT",
          actorId: input.actorId,
          actorName: input.actorName,
          oldQty,
          newQty,
          relatedSrId: input.relatedSrId,
          comment: `Auto-deducted on invoice for SR ${input.relatedSrId}`,
        },
      });

      return updated;
    });
  }
}
