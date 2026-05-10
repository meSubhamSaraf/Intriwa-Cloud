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

---

Both migrations are safe to run multiple times (`IF NOT EXISTS`). Run them in the Supabase SQL Editor under Database → SQL Editor.
