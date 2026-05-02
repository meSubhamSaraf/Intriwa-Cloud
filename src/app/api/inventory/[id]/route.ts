// GET /api/inventory/[id]  — fetch item with full audit trail

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { InventoryService } from "@/lib/services/inventory.service";

const inventoryService = new InventoryService();

export const GET = withAuthParams<{ id: string }>(async (_req, _ctx, { id }) => {
  const item = await inventoryService.getWithAudit(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
});
