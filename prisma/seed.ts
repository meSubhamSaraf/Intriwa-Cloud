// ─────────────────────────────────────────────────────────────────────────────
// Prisma Seed Script
// ─────────────────────────────────────────────────────────────────────────────
// Populates the database with a demo garage, ops manager account, mechanics,
// customers, and inventory so the app is usable right after `prisma db push`.
//
// Run: npm run db:seed   (or: npx prisma db seed)
// Safe to re-run — uses upsert on unique fields so it won't create duplicates.
// ─────────────────────────────────────────────────────────────────────────────

import { config } from "dotenv";
config({ path: ".env.local" });
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // ── Demo garage ──────────────────────────────────────────────────────────────
  const garage = await prisma.garage.upsert({
    where: { id: "demo-garage-1" },
    create: {
      id: "demo-garage-1",
      name: "Intriwa Auto Care",
      territory: "Bengaluru North",
      address: "12, Industrial Layout, Hebbal, Bengaluru — 560024",
      phone: "+91 98765 43210",
      email: "ops@intriwa.in",
      status: "TRIAL",
    },
    update: {},
  });
  console.log(`  ✅ Garage: ${garage.name}`);

  // ── Mechanic skills ───────────────────────────────────────────────────────────
  const skillLabels = [
    "Engine Repair",
    "Tyre Change",
    "AC Service",
    "Electrical",
    "Body Work",
    "Suspension",
    "Brake Service",
    "Oil Change",
  ];
  for (const label of skillLabels) {
    await prisma.mechanicSkill.upsert({
      where: { label },
      create: { label, isPreset: true },
      update: {},
    });
  }
  console.log(`  ✅ Skills: ${skillLabels.length} preset skills`);

  // ── Mechanics ─────────────────────────────────────────────────────────────────
  const mechanics = [
    { id: "mech-1", name: "Ravi Kumar", phone: "+91 99001 11001", employmentType: "FULL_TIME" as const, rating: 4.8 },
    { id: "mech-2", name: "Anand Rao", phone: "+91 99001 11002", employmentType: "FULL_TIME" as const, rating: 4.5 },
    { id: "mech-3", name: "Suresh B.", phone: "+91 99001 11003", employmentType: "FULL_TIME" as const, rating: 4.2 },
    { id: "mech-4", name: "Mohan Das", phone: "+91 99001 11004", employmentType: "PART_TIME" as const, rating: 3.9 },
    { id: "mech-5", name: "Kiran M.", phone: "+91 99001 11005", employmentType: "FREELANCE" as const, rating: 4.6 },
    { id: "mech-6", name: "Vijay P.", phone: "+91 99001 11006", employmentType: "FULL_TIME" as const, rating: 4.1 },
  ];
  for (const m of mechanics) {
    await prisma.mechanic.upsert({
      where: { id: m.id },
      create: { ...m, garageId: garage.id },
      update: {},
    });
  }
  console.log(`  ✅ Mechanics: ${mechanics.length}`);

  // ── Inventory items ───────────────────────────────────────────────────────────
  const items = [
    { id: "inv-1", name: "Engine Oil 5W-40 (1L)", category: "Lubricants", unit: "litres", stockQty: 48, unitPrice: 420 },
    { id: "inv-2", name: "Oil Filter", category: "Filters", unit: "pcs", stockQty: 24, unitPrice: 180 },
    { id: "inv-3", name: "Air Filter", category: "Filters", unit: "pcs", stockQty: 15, unitPrice: 320 },
    { id: "inv-4", name: "Brake Fluid DOT 4 (500ml)", category: "Fluids", unit: "pcs", stockQty: 12, unitPrice: 280 },
    { id: "inv-5", name: "Coolant (1L)", category: "Fluids", unit: "litres", stockQty: 20, unitPrice: 350 },
    { id: "inv-6", name: "Wiper Fluid (500ml)", category: "Fluids", unit: "pcs", stockQty: 18, unitPrice: 120 },
    { id: "inv-7", name: "Tyre Puncture Kit", category: "Accessories", unit: "pcs", stockQty: 8, unitPrice: 650 },
    { id: "inv-8", name: "Spark Plug", category: "Spare Parts", unit: "pcs", stockQty: 30, unitPrice: 240 },
    { id: "inv-9", name: "Brake Pad Set (Front)", category: "Spare Parts", unit: "set", stockQty: 10, unitPrice: 1800 },
    { id: "inv-10", name: "Car Shampoo (500ml)", category: "Cleaning", unit: "pcs", stockQty: 25, unitPrice: 180 },
  ];
  for (const item of items) {
    await prisma.inventoryItem.upsert({
      where: { id: item.id },
      create: { ...item, garageId: garage.id },
      update: {},
    });
  }
  console.log(`  ✅ Inventory: ${items.length} items`);

  // ── Customers ─────────────────────────────────────────────────────────────────
  const customers = [
    { id: "cust-1", name: "Arjun Mehta", phone: "+91 98100 11001", email: "arjun.mehta@gmail.com" },
    { id: "cust-2", name: "Priya Sharma", phone: "+91 98100 11002", email: "priya.s@gmail.com" },
    { id: "cust-3", name: "Rohit Verma", phone: "+91 98100 11003" },
  ];
  for (const c of customers) {
    await prisma.customer.upsert({
      where: { id: c.id },
      create: { ...c, garageId: garage.id },
      update: {},
    });
  }
  console.log(`  ✅ Customers: ${customers.length}`);

  console.log("\n✨ Seed complete. You can now run: npm run dev");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
