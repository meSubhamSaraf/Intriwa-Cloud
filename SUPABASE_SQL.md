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

All migrations are safe to run multiple times (`IF NOT EXISTS`). Run them in the Supabase SQL Editor under Database → SQL Editor.
