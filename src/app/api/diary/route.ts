import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

/**
 * GET /api/diary — devuelve las entries del usuario logueado, ordenadas
 * cronológicamente desc. Pagina simple via ?cursor=<entryId>&limit=N.
 *
 * Endpoint protegido: 401 si no hay sesión.
 */
export async function GET(request: Request) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 50);

  const entries = await prisma.entry.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit + 1, // pedimos uno extra para saber si hay siguiente página
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = entries.length > limit;
  const items = hasMore ? entries.slice(0, limit) : entries;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ entries: items, nextCursor });
}
