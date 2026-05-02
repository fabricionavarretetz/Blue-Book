import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7: el datasource del config se usa para migraciones e introspección.
// En runtime, PrismaClient puede usar un adapter para apuntar al pooler.
// Para MVP usamos DIRECT_URL (Supabase, puerto 5432) en ambos casos.
//
// DATABASE_URL (con pooler, puerto 6543) queda en .env para cuando integremos
// un driver adapter en producción serverless.

const url = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];

if (!url) {
  throw new Error(
    "[prisma.config] Falta DIRECT_URL (o DATABASE_URL) en .env. Revisa .env.example.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url,
  },
});
