import "server-only";
import { prisma } from "@/lib/db";
import {
  getUserSpotifyAccessToken,
  spotifyFetch,
  SpotifyAuthError,
  SpotifyApiError,
} from "@/lib/spotify";

/**
 * Helpers de la página /explore — descubrimiento social y algorítmico.
 */

type AuthorRef = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

/**
 * Entries PUBLIC ordenadas por reactions count desc, luego por createdAt desc.
 * Sin ventana temporal — con el volumen actual de la plataforma, filtrar por
 * "últimos 7 días" deja todo vacío. Cuando crezca, basta con re-introducir
 * el filtro o paginar.
 */
export async function getTrendingEntries(viewerId: string, limit = 8) {
  const candidates = await prisma.entry.findMany({
    where: {
      visibility: "PUBLIC",
      userId: { not: viewerId },
    },
    take: 30,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { username: true, displayName: true, avatarUrl: true } },
      _count: { select: { reactions: true } },
    },
  });

  // Sort estable: más reactions primero, dentro del mismo score gana el más
  // reciente (candidates ya viene ordenado por createdAt desc).
  return candidates
    .sort((a, b) => b._count.reactions - a._count.reactions)
    .slice(0, limit);
}

/**
 * Users con momentos para el rail "Nuevos en Blue Book". Primero intenta los
 * que NO sigues (verdaderos "nuevos para ti"). Si la plataforma todavía no
 * tiene volumen suficiente, hace fallback a cualquier user con entries
 * (incluyendo los que ya sigues) — mejor mostrar gente que un rail vacío.
 */
export async function getNewUsersToDiscover(viewerId: string, limit = 6) {
  const baseSelect = {
    username: true,
    displayName: true,
    avatarUrl: true,
    bio: true,
    _count: { select: { entries: true, followers: true } },
  } as const;

  const unfollowed = await prisma.user.findMany({
    where: {
      id: { not: viewerId },
      entries: { some: { visibility: "PUBLIC" } },
      NOT: {
        followers: { some: { followerId: viewerId } },
      },
    },
    select: baseSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  if (unfollowed.length > 0) {
    return { users: unfollowed, mode: "unfollowed" as const };
  }

  // Fallback: si ya sigues a todos, muestra cualquier user con momentos.
  const fallback = await prisma.user.findMany({
    where: {
      id: { not: viewerId },
      entries: { some: { visibility: "PUBLIC" } },
    },
    select: baseSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return { users: fallback, mode: "fallback" as const };
}

// ============================================================================
//  Para ti — mezcla heterogénea de tracks + artists + albums Spotify
// ============================================================================

/**
 * Discriminated union: el rail "Para ti" mezcla 3 tipos de items para dar
 * la sensación masonry/Pinterest. El kind controla el card que se renderiza
 * y la ruta del link (track → /diary/new, artist → /explore/artist, album
 * → /explore/album).
 *
 * Nota de modelo: artists y albums son lentes para descubrir tracks. NO se
 * guardan como entries en el diario — solo navegación. Las entries siempre
 * son por canción.
 */
export type ForYouTrack = {
  kind: "track";
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: { id: string; name: string; images: Array<{ url: string }> };
  source: "top-track" | "top-artist" | "recently-played";
};

export type ForYouArtist = {
  kind: "artist";
  id: string;
  name: string;
  images: Array<{ url: string }>;
  followers: number;
};

export type ForYouAlbum = {
  kind: "album";
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  images: Array<{ url: string }>;
  releaseDate: string;
};

export type ForYouItem = ForYouTrack | ForYouArtist | ForYouAlbum;

type SpotifyTrackLite = {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: { id: string; name: string; images: Array<{ url: string }> };
};

type SpotifyArtistLite = {
  id: string;
  name: string;
  images: Array<{ url: string }>;
  followers?: { total: number };
};

type SpotifyAlbumLite = {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  images: Array<{ url: string }>;
  release_date: string;
};

/**
 * "Para ti" — mezcla en memoria de fuentes Spotify disponibles en Dev Mode
 * (post deprecación de /recommendations Nov 2024). Promise.all + safe()
 * tolera fallos parciales sin tumbar el rail.
 *
 * Buckets:
 *   - tracks: /me/top/tracks + /me/player/recently-played + top-tracks de
 *     tus top artists
 *   - artists: /me/top/artists (los mismos artists, también como cards)
 *   - albums: /browse/new-releases
 *
 * Round-robin entre 3 buckets: track → artist → album → track ... para que
 * la grilla se sienta variada (no 6 tracks seguidos).
 */
export async function getSpotifyForYou(
  userId: string,
  limit = 14,
): Promise<ForYouItem[]> {
  let userToken: string;
  try {
    userToken = await getUserSpotifyAccessToken(userId);
  } catch (e) {
    if (e instanceof SpotifyAuthError) return [];
    throw e;
  }

  // Paso 1: top artists primero — los necesitamos como seeds para
  // "top-tracks de tus top artists" Y también van directo al bucket artist.
  const topArtistsRes = await safe(() =>
    spotifyFetch<{ items: SpotifyArtistLite[] }>("/me/top/artists", {
      userAccessToken: userToken,
      params: { limit: 5, time_range: "medium_term" },
    }),
  );
  const topArtists = topArtistsRes?.items ?? [];
  const topArtistIds = topArtists.slice(0, 3).map((a) => a.id);

  // Paso 2: en paralelo, las fuentes de tracks y albums.
  const [topTracksRes, recentRes, newReleasesRes, ...artistTopTracksRes] =
    await Promise.all([
      safe(() =>
        spotifyFetch<{ items: SpotifyTrackLite[] }>("/me/top/tracks", {
          userAccessToken: userToken,
          params: { limit: 10, time_range: "medium_term" },
        }),
      ),
      safe(() =>
        spotifyFetch<{ items: Array<{ track: SpotifyTrackLite }> }>(
          "/me/player/recently-played",
          { userAccessToken: userToken, params: { limit: 10 } },
        ),
      ),
      safe(() =>
        spotifyFetch<{ albums: { items: SpotifyAlbumLite[] } }>(
          "/browse/new-releases",
          { userAccessToken: userToken, params: { limit: 8 } },
        ),
      ),
      ...topArtistIds.map((id) =>
        safe(() =>
          spotifyFetch<{ tracks: SpotifyTrackLite[] }>(
            `/artists/${id}/top-tracks`,
            { userAccessToken: userToken, params: { market: "from_token" } },
          ),
        ),
      ),
    ]);

  const trackBucket: ForYouTrack[] = [];
  for (const t of topTracksRes?.items ?? []) {
    trackBucket.push(asTrack(t, "top-track"));
  }
  for (const r of artistTopTracksRes) {
    for (const t of (r?.tracks ?? []).slice(0, 3)) {
      trackBucket.push(asTrack(t, "top-artist"));
    }
  }
  for (const it of recentRes?.items ?? []) {
    trackBucket.push(asTrack(it.track, "recently-played"));
  }

  const artistBucket: ForYouArtist[] = topArtists.map((a) => ({
    kind: "artist",
    id: a.id,
    name: a.name,
    images: a.images,
    followers: a.followers?.total ?? 0,
  }));

  const albumBucket: ForYouAlbum[] = (newReleasesRes?.albums.items ?? []).map(
    (alb) => ({
      kind: "album",
      id: alb.id,
      name: alb.name,
      artists: alb.artists.map((a) => ({ id: a.id, name: a.name })),
      images: alb.images,
      releaseDate: alb.release_date,
    }),
  );

  // Round-robin entre buckets, dedupe por (kind, id).
  const buckets: ForYouItem[][] = [trackBucket, artistBucket, albumBucket];
  const seen = new Set<string>();
  const out: ForYouItem[] = [];
  let cursor = 0;
  while (out.length < limit) {
    let progressed = false;
    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[(cursor + i) % buckets.length];
      while (bucket.length > 0) {
        const next = bucket.shift()!;
        const key = `${next.kind}:${next.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(next);
        progressed = true;
        break;
      }
      if (out.length >= limit) break;
    }
    if (!progressed) break;
    cursor++;
  }
  return out;
}

function asTrack(t: SpotifyTrackLite, source: ForYouTrack["source"]): ForYouTrack {
  return {
    kind: "track",
    id: t.id,
    name: t.name,
    artists: t.artists.map((a) => ({ id: a.id, name: a.name })),
    album: {
      id: t.album.id,
      name: t.album.name,
      images: t.album.images,
    },
    source,
  };
}

/**
 * Wrapper de fetch tolerante a errores Spotify. Si falla con SpotifyAuthError
 * o SpotifyApiError, devolvemos null para que el caller siga adelante con
 * el resto de fuentes.
 */
async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof SpotifyAuthError || e instanceof SpotifyApiError) {
      return null;
    }
    throw e;
  }
}

export type TrendingEntry = Awaited<
  ReturnType<typeof getTrendingEntries>
>[number];

export type NewUsersResult = Awaited<ReturnType<typeof getNewUsersToDiscover>>;

export type { AuthorRef };
