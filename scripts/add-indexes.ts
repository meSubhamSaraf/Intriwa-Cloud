/**
 * One-time script: add missing indexes to production DB.
 * Run with: tsx scripts/add-indexes.ts
 * Uses DIRECT_URL (session-mode pooler) so DDL works correctly.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { Client } from "pg";

const INDEXES = [
  // ServiceRequest — hit by every list/filter/join query
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sr_garage_id   ON "ServiceRequest"("garageId")`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sr_vehicle_id  ON "ServiceRequest"("vehicleId")`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sr_customer_id ON "ServiceRequest"("customerId")`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sr_opened_at   ON "ServiceRequest"("openedAt")`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sr_status      ON "ServiceRequest"("status")`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sr_mechanic_id ON "ServiceRequest"("mechanicId")`,

  // Invoice — joined on serviceRequestId in analytics + invoice list
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_sr_id    ON "Invoice"("serviceRequestId")`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_garage_id ON "Invoice"("garageId")`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_status    ON "Invoice"("status")`,

  // Vehicle — customer detail page, vehicle list
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_customer ON "Vehicle"("customerId")`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_garage   ON "Vehicle"("garageId")`,

  // Customer — every customers list query
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_garage ON "Customer"("garageId")`,

  // ServiceRequestItem — joined on every SR detail/invoice
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sr_item_sr_id ON "ServiceRequestItem"("serviceRequestId")`,

  // FollowUp — SR detail sidebar
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_followup_sr_id ON "FollowUp"("serviceRequestId")`,

  // Observation — SR detail
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_observation_sr_id ON "Observation"("serviceRequestId")`,
];

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  console.log("Connected to database.\n");

  for (const sql of INDEXES) {
    const name = sql.match(/idx_\w+/)?.[0] ?? sql.slice(0, 60);
    process.stdout.write(`  Creating ${name}… `);
    try {
      await client.query(sql);
      console.log("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`SKIP (${msg})`);
    }
  }

  await client.end();
  console.log("\nAll indexes applied.");
}

main().catch((e) => { console.error(e); process.exit(1); });
