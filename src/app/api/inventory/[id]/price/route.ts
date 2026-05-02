// PATCH /api/inventory/[id]/price
// Update the unit price of an inventory item. Requires comment OR fileUrl.

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { InventoryService } from "@/lib/services/inventory.service";

const inventoryService = new InventoryService();

export const PATCH = withAuthParams<{ id: string }>(async (req, { profile }, { id }) => {
  const { newPrice, comment, fileUrl } = await req.json();
  const updated = await inventoryService.updatePrice({
    inventoryItemId: id,
    newPrice,
    comment,
    fileUrl,
    actorId: profile.id,
    actorName: profile.name,
  });
  return NextResponse.json(updated);
});
