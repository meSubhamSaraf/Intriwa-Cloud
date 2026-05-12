# Supabase SQL — Run in SQL Editor

Run the following SQL statements in the Supabase SQL editor (Database → SQL Editor).

## Feature 1: Google Maps link on Customer

```sql
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "mapLink" TEXT;
```

## Feature 2: Distinguish service items from physical parts (for accurate payout calculation)

Run this **before** deploying the latest build. Existing rows default to `true` so no data is lost.

```sql
ALTER TABLE "ServiceItem" ADD COLUMN IF NOT EXISTS "isService" BOOLEAN NOT NULL DEFAULT TRUE;
```

## Feature 3: WhatsApp message history (chat between CRM and customers)

Run this **before** deploying the WhatsApp chat build.

```sql
CREATE TABLE IF NOT EXISTS "WhatsAppMessage" (
  "id"           TEXT        NOT NULL,
  "garageId"     TEXT        NOT NULL,
  "customerId"   TEXT        NOT NULL,
  "direction"    TEXT        NOT NULL,
  "body"         TEXT        NOT NULL,
  "templateName" TEXT,
  "status"       TEXT        NOT NULL DEFAULT 'sent',
  "msgkartId"    TEXT,
  "sentBy"       TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WhatsAppMessage"
  ADD CONSTRAINT IF NOT EXISTS "WhatsAppMessage_garageId_fkey"
  FOREIGN KEY ("garageId") REFERENCES "Garage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WhatsAppMessage"
  ADD CONSTRAINT IF NOT EXISTS "WhatsAppMessage_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "WhatsAppMessage_customerId_idx" ON "WhatsAppMessage"("customerId");
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_garageId_idx"   ON "WhatsAppMessage"("garageId");
```

---

## Feature 4: Service Packages, SR Package snapshots, and Operating Expenses

Run this **before** deploying the packages / P&L build.

```sql
-- ── Columns on existing tables ────────────────────────────────────────────────

ALTER TABLE "Garage"
  ADD COLUMN IF NOT EXISTS "fuelRatePerKm" DECIMAL(10,2) DEFAULT 6;

ALTER TABLE "ServiceRequest"
  ADD COLUMN IF NOT EXISTS "kmTravelled"   INTEGER,
  ADD COLUMN IF NOT EXISTS "fuelAllowance" DECIMAL(10,2);

-- ── ServicePackage ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ServicePackage" (
  "id"           TEXT           NOT NULL,
  "garageId"     TEXT           NOT NULL,
  "name"         TEXT           NOT NULL,
  "description"  TEXT,
  "packagePrice" DECIMAL(10,2)  NOT NULL,
  "isActive"     BOOLEAN        NOT NULL DEFAULT TRUE,
  "createdAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)   NOT NULL,
  CONSTRAINT "ServicePackage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ServicePackage"
  ADD CONSTRAINT IF NOT EXISTS "ServicePackage_garageId_fkey"
  FOREIGN KEY ("garageId") REFERENCES "Garage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── ServicePackageItem ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ServicePackageItem" (
  "id"              TEXT          NOT NULL,
  "packageId"       TEXT          NOT NULL,
  "description"     TEXT          NOT NULL,
  "mrpPrice"        DECIMAL(10,2) NOT NULL,
  "quantity"        INTEGER       NOT NULL DEFAULT 1,
  "inventoryItemId" TEXT,
  CONSTRAINT "ServicePackageItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ServicePackageItem"
  ADD CONSTRAINT IF NOT EXISTS "ServicePackageItem_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServicePackageItem"
  ADD CONSTRAINT IF NOT EXISTS "ServicePackageItem_inventoryItemId_fkey"
  FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── SRServicePackage ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "SRServicePackage" (
  "id"           TEXT          NOT NULL,
  "srId"         TEXT          NOT NULL,
  "packageId"    TEXT          NOT NULL,
  "packageName"  TEXT          NOT NULL,
  "packagePrice" DECIMAL(10,2) NOT NULL,
  "mrpTotal"     DECIMAL(10,2) NOT NULL,
  "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SRServicePackage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SRServicePackage"
  ADD CONSTRAINT IF NOT EXISTS "SRServicePackage_srId_fkey"
  FOREIGN KEY ("srId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SRServicePackage"
  ADD CONSTRAINT IF NOT EXISTS "SRServicePackage_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── SRServicePackageItem ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "SRServicePackageItem" (
  "id"              TEXT          NOT NULL,
  "srPackageId"     TEXT          NOT NULL,
  "description"     TEXT          NOT NULL,
  "mrpPrice"        DECIMAL(10,2) NOT NULL,
  "quantity"        INTEGER       NOT NULL DEFAULT 1,
  "inventoryItemId" TEXT,
  CONSTRAINT "SRServicePackageItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SRServicePackageItem"
  ADD CONSTRAINT IF NOT EXISTS "SRServicePackageItem_srPackageId_fkey"
  FOREIGN KEY ("srPackageId") REFERENCES "SRServicePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── GarageExpense ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "GarageExpense" (
  "id"          TEXT          NOT NULL,
  "garageId"    TEXT          NOT NULL,
  "category"    TEXT          NOT NULL,
  "description" TEXT          NOT NULL,
  "amount"      DECIMAL(10,2) NOT NULL,
  "date"        TIMESTAMP(3)  NOT NULL,
  "proofUrl"    TEXT,
  "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GarageExpense_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GarageExpense"
  ADD CONSTRAINT IF NOT EXISTS "GarageExpense_garageId_fkey"
  FOREIGN KEY ("garageId") REFERENCES "Garage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "GarageExpense_garageId_idx" ON "GarageExpense"("garageId");
```

---

All migrations are safe to run multiple times (`IF NOT EXISTS`). Run them in the Supabase SQL Editor under Database → SQL Editor.
