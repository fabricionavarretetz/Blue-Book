import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/tags?type=MOOD|CONTEXT
 *
 * Devuelve la taxonomía de tags sugeridos. Para autocomplete y chips.
 * No requiere auth — son datos públicos del producto.
 *
 * Cacheable por 1h en Vercel; el seed cambia raramente.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const tags = await prisma.tag.findMany({
    where: type === "MOOD" || type === "CONTEXT" ? { type } : undefined,
    orderBy: [{ usageCount: "desc" }, { label: "asc" }],
  });

  return NextResponse.json(
    { tags: tags.map((t) => ({ slug: t.slug, label: t.label, type: t.type })) },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
