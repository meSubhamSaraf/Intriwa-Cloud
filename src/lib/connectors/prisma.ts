// ─────────────────────────────────────────────────────────────────────────────
// Connector: Prisma
// ─────────────────────────────────────────────────────────────────────────────
// Prisma 7 requires an explicit database adapter instead of reading the URL
// from the schema.  We use @prisma/adapter-pg (backed by the `pg` pool) which
// is the standard adapter for PostgreSQL in Node.js / Next.js / Vercel.
//
// Singleton pattern: attach to globalThis so the same pool survives Next.js
// hot-reloads in development.  In production there is one module instance.
// ─────────────────────────────────────────────────────────────────────────────

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

type PrismaClientSingleton = ReturnType<typeof makePrismaClient>;

function makePrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Keep pool small for serverless — Supabase pooler handles the real pooling
    max: 2,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton;
};

export const prisma = globalForPrisma.prisma ?? makePrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
