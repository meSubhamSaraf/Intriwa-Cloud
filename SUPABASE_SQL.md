# Supabase SQL — Run in SQL Editor

Run the following SQL statements in the Supabase SQL editor (Database → SQL Editor).

## Feature 1: Google Maps link on Customer

```sql
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "mapLink" TEXT;
```

---

That is the only schema change required. All other features (observations approval, payout management, custom items fix, photo URL) use existing columns.
