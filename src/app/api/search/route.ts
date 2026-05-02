import { NextResponse } from "next/server";
import { z } from "zod";
import { spotifyFetch, spotifyCache, SpotifyApiError } from "@/lib/spotify";

/**
 * GET /api/search?q=mitski&type=track&limit=20
 *
 * Búsqueda en Spotify. Usa Client Credentials (no requiere user logueado).
 * Tipos soportados: track | album | artist (single, no múltiples).
 *
 * Cacheamos por (q, type, limit) durante 5 minutos: si dos users buscan
 * lo mismo, no pegamos a Spotify dos veces.
 */

const querySchema = z.object({
  q: z.string().min(1, "q requerido").max(100),
  type: z.enum(["track", "album", "artist"]).default("track"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

type SpotifyTrack = {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: { id: string; name: string; images: Array<{ url: string; width: number }> };
  duration_ms: number;
  external_urls: { spotify: string };
};

type SearchResponse = {
  tracks?: { items: SpotifyTrack[] };
  albums?: { items: unknown[] };
  artists?: { items: unknown[] };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get("q") ?? "",
    type: searchParams.get("type") ?? "track",
    limit: searchParams.get("limit") ?? "20",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { q, type, limit } = parsed.data;
  const cacheKey = `search:${type}:${limit}:${q.toLowerCase()}`;

  try {
    const data = await spotifyCache.getOrSet(cacheKey, () =>
      spotifyFetch<SearchResponse>("/search", { params: { q, type, limit } }),
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof SpotifyApiError) {
      return NextResponse.json(
        { error: "Spotify error", status: err.status },
        { status: 502 },
      );
    }
    throw err;
  }
}
