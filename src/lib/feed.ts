import "server-only";
import { prisma } from "@/lib/db";
import type { EntryModel as Entry } from "@/generated/prisma/models/Entry";

/**
 * Hybrid feed — 3 rails que componen la home cuando hay sesión.
 *
 * 1. Rail SELF: tus últimas 3-5 entries.
 * 2. Rail SOCIAL: entries PUBLIC de los users que sigues, cronológico desc.
 * 3. Rail DISCOVERY: entries PUBLIC recientes de users que NO sigues, ordenadas
 *    por engagement (followers count del autor) — heurística simple para MVP.
 *
 * Cada rail trae solo data necesaria para renderizar la card. La lógica de
 * caching/pagination viene en Phase 2; para MVP las consultas son directas.
 */

type AuthorRef = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type FeedEntry = Entry & {
  user: AuthorRef;
};

export async function getSelfRail(userId: string, limit = 5): Promise<Entry[]> {
  return prisma.entry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getSocialRail(userId: string, limit = 15): Promise<FeedEntry[]> {
  return prisma.entry.findMany({
    where: {
      visibility: "PUBLIC",
      user: {
        followers: { some: { followerId: userId } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: { username: true, displayName: true, avatarUrl: true },
      },
    },
  });
}

export async function getDiscoveryRail(
  userId: string,
  limit = 12,
): Promise<FeedEntry[]> {
  // Entries PUBLIC de users que NO seguimos y NO somos nosotros.
  // Ordenadas por followers del autor desc + recencia. Para MVP, sin Spotify
  // recommendations todavía.
  return prisma.entry.findMany({
    where: {
      visibility: "PUBLIC",
      userId: { not: userId },
      user: {
        // Excluir users que ya seguimos
        NOT: {
          followers: { some: { followerId: userId } },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    include: {
      user: {
        select: { username: true, displayName: true, avatarUrl: true },
      },
    },
  });
}
