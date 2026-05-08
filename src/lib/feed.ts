import "server-only";
import { prisma } from "@/lib/db";
import {
  getUserSpotifyAccessToken,
  spotifyFetch,
  SpotifyAuthError,
  SpotifyApiError,
} from "@/lib/spotify";
import type { EntryModel as Entry } from "@/generated/prisma/models/Entry";

/**
 * Hybrid feed — 3 rails que componen la home cuando hay sesión.
 *
 * 1. Rail SELF: tus últimas 3-5 entries.
 * 2. Rail SOCIAL: entries PUBLIC de los users que sigues, cronológico desc.
 * 3. Rail DISCOVERY: entries PUBLIC recientes de users que NO sigues. Si el
 *    user tiene Spotify conectado, scoring por afinidad musical (entries cuyo
 *    artista esté en sus top artists). Si no, recencia pura.
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

/**
 * Top artist IDs del user en Spotify. Devuelve [] si no tiene Spotify
 * conectado o si la API falla — el caller debe degradar grácilmente.
 */
async function getUserTopArtistIds(userId: string, limit = 20): Promise<string[]> {
  let token: string;
  try {
    token = await getUserSpotifyAccessToken(userId);
  } catch (e) {
    if (e instanceof SpotifyAuthError) return [];
    throw e;
  }
  try {
    const r = await spotifyFetch<{ items: Array<{ id: string }> }>(
      "/me/top/artists",
      { userAccessToken: token, params: { limit, time_range: "medium_term" } },
    );
    return r.items.map((a) => a.id);
  } catch (e) {
    if (e instanceof SpotifyApiError) return [];
    throw e;
  }
}

/**
 * Extrae los IDs de artistas de un trackSnapshot. El snapshot es JSON, así
 * que validamos defensivamente.
 */
function artistIdsFromSnapshot(snapshot: unknown): string[] {
  if (!snapshot || typeof snapshot !== "object") return [];
  const artists = (snapshot as { artists?: unknown }).artists;
  if (!Array.isArray(artists)) return [];
  const ids: string[] = [];
  for (const a of artists) {
    if (a && typeof a === "object" && typeof (a as { id?: unknown }).id === "string") {
      ids.push((a as { id: string }).id);
    }
  }
  return ids;
}

export async function getDiscoveryRail(
  userId: string,
  limit = 12,
): Promise<FeedEntry[]> {
  // Traemos un buffer mayor al limit final para tener material que reordenar.
  // El scoring por afinidad sólo aplica si tenemos top artists; si no,
  // entregamos los más recientes tal cual.
  const candidates = await prisma.entry.findMany({
    where: {
      visibility: "PUBLIC",
      userId: { not: userId },
      user: {
        NOT: {
          followers: { some: { followerId: userId } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: Math.max(limit * 4, 40),
    include: {
      user: {
        select: { username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  const topArtists = await getUserTopArtistIds(userId, 20);
  if (topArtists.length === 0) {
    return candidates.slice(0, limit);
  }

  const topSet = new Set(topArtists);
  const scored = candidates.map((entry) => {
    const artistIds = artistIdsFromSnapshot(entry.trackSnapshot);
    const matches = artistIds.filter((id) => topSet.has(id)).length;
    return { entry, matches };
  });

  // Sort: más matches primero; dentro del mismo score, mantener el orden
  // por createdAt desc (que es estable porque candidates ya viene ordenado).
  scored.sort((a, b) => b.matches - a.matches);

  return scored.slice(0, limit).map((s) => s.entry);
}
