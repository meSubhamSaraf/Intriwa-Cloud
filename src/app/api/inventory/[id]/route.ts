// GET    /api/inventory/[id]  — fetch item with full audit trail
// PATCH  /api/inventory/[id]  — update item fields (costPrice, mrp, name, etc.)
// DELETE /api/inventory/[id]  — soft-delete (sets isActive=false)

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { InventoryService } from "@/lib/services/inventory.service";
import { prisma } from "@/lib/connectors/prisma";

const inventoryService = new InventoryService();

export const GET = withAuthParams<{ id: string }>(async (_req, _ctx, { id }) => {
  const item = await inventoryService.getWithAudit(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
});

export const PATCH = withAuthParams<{ id: string }>(async (req, { garageId }, { id }) => {
  const body = await req.json() as { costPrice?: number; mrp?: number; name?: string };
  const item = await prisma.inventoryItem.findFirst({ where: { id, garageId } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await prisma.inventoryItem.update({ where: { id }, data: body });
  return NextResponse.json(updated);
});

export const DELETE = withAuthParams<{ id: string }>(async (_req, { garageId }, { id }) => {
  const item = await prisma.inventoryItem.findFirst({ where: { id, garageId } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
});
