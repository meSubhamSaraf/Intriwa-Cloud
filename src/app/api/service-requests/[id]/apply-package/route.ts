// POST /api/service-requests/[id]/apply-package
// Apply a service package snapshot to an SR:
//   1. Create SRServicePackage + SRServicePackageItem rows (price snapshot)
//   2. Deduct inventory stock for items that have inventoryItemId
//   3. Create a ServiceItem for the package total (so it appears in invoice)

import { NextResponse } from "next/server";
import { withAuthParams } from "@/app/api/_helpers/auth";
import { prisma } from "@/lib/connectors/prisma";

export const POST = withAuthParams<{ id: string }>(async (req, { garageId, userId, profile }, { id: srId }) => {
  const { packageId } = (await req.json()) as { packageId: string };

  if (!packageId) {
    return NextResponse.json({ error: "packageId is required" }, { status: 400 });
  }

  // Verify the SR belongs to this garage
  const sr = await prisma.serviceRequest.findFirst({
    where: { id: srId, garageId },
  });
  if (!sr) return NextResponse.json({ error: "Service request not found" }, { status: 404 });

  // Load the package with items — must belong to same garage
  const pkg = await prisma.servicePackage.findFirst({
    where: { id: packageId, garageId, isActive: true },
    include: { items: true },
  });
  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  const mrpTotal = pkg.items.reduce(
    (sum, item) => sum + Number(item.mrpPrice) * item.quantity,
    0
  );

  const srPackage = await prisma.$transaction(async (tx) => {
    // 1. Create the snapshot record
    const created = await tx.sRServicePackage.create({
      data: {
        srId,
        packageId,
        packageName: pkg.name,
        packagePrice: pkg.packagePrice,
        mrpTotal,
        items: {
          create: pkg.items.map((item) => ({
            description: item.description,
            mrpPrice: item.mrpPrice,
            quantity: item.quantity,
            inventoryItemId: item.inventoryItemId ?? null,
          })),
        },
      },
      include: { items: true },
    });

    // 2. Deduct inventory stock for items that reference an inventory item
    for (const item of pkg.items) {
      if (!item.inventoryItemId) continue;

      const invItem = await tx.inventoryItem.findUnique({
        where: { id: item.inventoryItemId },
      });
      if (!invItem) continue;

      const oldQty = Number(invItem.stockQty);
      const newQty = oldQty - item.quantity;
      // Allow negative stock — caller can reconcile; just log it
      await tx.inventoryItem.update({
        where: { id: item.inventoryItemId },
        data: { stockQty: newQty },
      });

      await tx.inventoryAuditEntry.create({
        data: {
          inventoryItemId: item.inventoryItemId,
          type: "STOCK_DEDUCT",
          actorId: userId,
          actorName: profile.name,
          oldQty,
          newQty,
          relatedSrId: srId,
          comment: `Package applied: ${pkg.name} (SR ${sr.srNumber})`,
        },
      });
    }

    // 3. Create a ServiceItem so the package total rolls up into invoice totals.
    // isPackageItem: true signals the earnings route to skip this item (the
    // SRServicePackage loop handles commission on the labor-only base instead).
    await tx.serviceItem.create({
      data: {
        serviceRequestId: srId,
        description: pkg.name,
        quantity: 1,
        unitPrice: pkg.packagePrice,
        total: pkg.packagePrice,
        isService: true,
        isPackageItem: true,
      },
    });

    return created;
  });

  return NextResponse.json(srPackage, { status: 201 });
});
