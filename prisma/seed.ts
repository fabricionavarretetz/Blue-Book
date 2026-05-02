/**
 * Seed inicial de Blue Book.
 *
 * Pobla la taxonomía de tags (Mood + Context) con sugerencias en español
 * para autosuggest en la UI. Los entries siguen siendo free-form: estos tags
 * NO son enum ni FK, solo aparecen en el picker como "sugerencias frecuentes".
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DIRECT_URL/DATABASE_URL en .env");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const MOODS: Array<{ slug: string; label: string }> = [
  { slug: "nostalgico", label: "nostálgico" },
  { slug: "euforico", label: "eufórico" },
  { slug: "melancolico", label: "melancólico" },
  { slug: "esperanzado", label: "esperanzado" },
  { slug: "enamorado", label: "enamorado" },
  { slug: "roto", label: "roto" },
  { slug: "introspectivo", label: "introspectivo" },
  { slug: "energico", label: "enérgico" },
  { slug: "relajado", label: "relajado" },
  { slug: "ansioso", label: "ansioso" },
  { slug: "empoderado", label: "empoderado" },
  { slug: "soñador", label: "soñador" },
];

const CONTEXTS: Array<{ slug: string; label: string }> = [
  { slug: "noche", label: "noche" },
  { slug: "manejando", label: "manejando" },
  { slug: "gym", label: "gym" },
  { slug: "estudiando", label: "estudiando" },
  { slug: "trabajando", label: "trabajando" },
  { slug: "corriendo", label: "corriendo" },
  { slug: "fiesta", label: "fiesta" },
  { slug: "caminando", label: "caminando" },
  { slug: "desvelado", label: "desvelado" },
  { slug: "cocinando", label: "cocinando" },
  { slug: "viaje", label: "viaje" },
  { slug: "en-cama", label: "en cama" },
];

async function main() {
  for (const m of MOODS) {
    await prisma.tag.upsert({
      where: { slug: m.slug },
      update: { label: m.label, type: "MOOD" },
      create: { slug: m.slug, label: m.label, type: "MOOD" },
    });
  }
  for (const c of CONTEXTS) {
    await prisma.tag.upsert({
      where: { slug: c.slug },
      update: { label: c.label, type: "CONTEXT" },
      create: { slug: c.slug, label: c.label, type: "CONTEXT" },
    });
  }

  const total = await prisma.tag.count();
  const moodCount = await prisma.tag.count({ where: { type: "MOOD" } });
  const ctxCount = await prisma.tag.count({ where: { type: "CONTEXT" } });
  console.log(`Seed OK. Total tags: ${total}  (MOOD: ${moodCount}, CONTEXT: ${ctxCount})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
