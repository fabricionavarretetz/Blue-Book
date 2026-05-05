import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

/**
 * GET /api/users/search?q=anita&limit=10
 *
 * Búsqueda de users por username o displayName (insensitive). Usado por
 * la página /people. Devuelve datos públicos: username, displayName,
 * avatarUrl, bio, totalEntries.
 *
 * No requiere auth — los perfiles son públicos por diseño del producto.
 */

const querySchema = z.object({
  q: z.string().min(1).max(60),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get("q") ?? "",
    limit: searchParams.get("limit") ?? "10",
  });

  if (!parsed.success) {
    return NextResponse.json({ users: [] });
  }

  const { q, limit } = parsed.data;

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      _count: { select: { entries: true, followers: true } },
    },
    orderBy: [
      // Match exacto de username primero
      { username: "asc" },
    ],
    take: limit,
  });

  return NextResponse.json({
    users: users.map((u) => ({
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      bio: u.bio,
      entryCount: u._count.entries,
      followerCount: u._count.followers,
    })),
  });
}
