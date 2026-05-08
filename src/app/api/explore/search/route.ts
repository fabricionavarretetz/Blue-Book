import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { spotifyFetch, spotifyCache, SpotifyApiError } from "@/lib/spotify";

/**
 * GET /api/explore/search?q=lana&limit=6
 *
 * Búsqueda unificada para /explore: tracks + artists + albums (Spotify) +
 * users (DB) en paralelo. Cap bajo (6 c/u) — preview, no página de
 * resultados completa.
 *
 * El catálogo Spotify usa Client Credentials (no requiere user logueado);
 * los users son perfiles públicos. No hay datos sensibles en la response.
 */

const querySchema = z.object({
  q: z.string().min(1).max(80),
  limit: z.coerce.number().int().min(1).max(15).default(6),
});

type SpotifyTrack = {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: { id: string; name: string; images: Array<{ url: string }> };
  external_urls: { spotify: string };
};

type SpotifyArtist = {
  id: string;
  name: string;
  images: Array<{ url: string }>;
};

type SpotifyAlbum = {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  images: Array<{ url: string }>;
  release_date: string;
};

type SpotifySearchResponse = {
  tracks?: { items: SpotifyTrack[] };
  artists?: { items: SpotifyArtist[] };
  albums?: { items: SpotifyAlbum[] };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get("q") ?? "",
    limit: searchParams.get("limit") ?? "6",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { tracks: [], artists: [], albums: [], users: [] },
      { status: 400 },
    );
  }

  const { q, limit } = parsed.data;
  const cacheKey = `explore-search-v2:${limit}:${q.toLowerCase()}`;

  const [spotifyResult, users] = await Promise.allSettled([
    spotifyCache.getOrSet(cacheKey, () =>
      spotifyFetch<SpotifySearchResponse>("/search", {
        params: { q, type: "track,artist,album", limit },
      }),
    ),
    prisma.user.findMany({
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
      take: limit,
    }),
  ]);

  const tracks: Array<{
    id: string;
    name: string;
    artists: Array<{ id: string; name: string }>;
    album: { id: string; name: string; image: string | null };
    externalUrl: string;
  }> = [];
  const artists: Array<{
    id: string;
    name: string;
    image: string | null;
  }> = [];
  const albums: Array<{
    id: string;
    name: string;
    artists: Array<{ id: string; name: string }>;
    image: string | null;
    year: string;
  }> = [];

  if (spotifyResult.status === "fulfilled") {
    const data = spotifyResult.value as SpotifySearchResponse;
    for (const t of data.tracks?.items ?? []) {
      tracks.push({
        id: t.id,
        name: t.name,
        artists: t.artists.map((a) => ({ id: a.id, name: a.name })),
        album: {
          id: t.album.id,
          name: t.album.name,
          image: t.album.images[0]?.url ?? null,
        },
        externalUrl: t.external_urls.spotify,
      });
    }
    for (const a of data.artists?.items ?? []) {
      artists.push({
        id: a.id,
        name: a.name,
        image: a.images[0]?.url ?? null,
      });
    }
    for (const alb of data.albums?.items ?? []) {
      albums.push({
        id: alb.id,
        name: alb.name,
        artists: alb.artists.map((a) => ({ id: a.id, name: a.name })),
        image: alb.images[0]?.url ?? null,
        year: alb.release_date.slice(0, 4),
      });
    }
  } else if (!(spotifyResult.reason instanceof SpotifyApiError)) {
    console.error("[explore/search] spotify fail:", spotifyResult.reason);
  }

  const userList =
    users.status === "fulfilled"
      ? users.value.map((u) => ({
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          bio: u.bio,
          entryCount: u._count.entries,
          followerCount: u._count.followers,
        }))
      : [];

  return NextResponse.json({ tracks, artists, albums, users: userList });
}
