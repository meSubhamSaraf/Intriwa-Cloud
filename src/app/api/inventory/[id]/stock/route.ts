// POST /api/inventory/[id]/stock
// Add stock to an inventory item. Requires comment OR fileUrl (business rule).

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { InventoryService } from "@/lib/services/inventory.service";

const inventoryService = new InventoryService();

export const POST = withAuthParams<{ id: string }>(async (req, { profile }, { id }) => {
  const { qty, comment, fileUrl } = await req.json();
  const updated = await inventoryService.addStock({
    inventoryItemId: id,
    qty,
    comment,
    fileUrl,
    actorId: profile.id,
    actorName: profile.name,
  });
  return NextResponse.json(updated);
});
