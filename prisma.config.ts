// ─────────────────────────────────────────────────────────────────────────────
// Prisma 7 config
// ─────────────────────────────────────────────────────────────────────────────
// DATABASE_URL is used by `prisma db push` and `prisma migrate`.
// For the actual runtime adapter (in Next.js), see src/lib/connectors/prisma.ts
// ─────────────────────────────────────────────────────────────────────────────
import { config } from "dotenv";
config({ path: ".env.local" });
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
  },
});
