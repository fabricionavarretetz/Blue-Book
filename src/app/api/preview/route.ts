import { NextResponse } from "next/server";
import { z } from "zod";
import { getApplePreviewUrl } from "@/lib/apple-music";
import {
  spotifyFetch,
  spotifyCache,
  SpotifyApiError,
} from "@/lib/spotify";

/**
 * GET /api/preview?track=<spotifyId>&name=<...>&artist=<...>
 *
 * Resuelve la preview URL de un track para el mini player. Estrategia:
 *   1. Si trackId Spotify es válido, intentar `/tracks/{id}` y leer
 *      `preview_url` (casi siempre null en Dev Mode post-Nov 2024).
 *   2. Si no hay preview, fallback a iTunes Search API por (name, artist).
 *   3. Si nada hay, devolver `{ previewUrl: null }`.
 *
 * Cacheado a través de los caches internos (spotifyCache 5min,
 * apple-music cache 24h). Sin auth — endpoint utilitario para el player.
 */

const querySchema = z.object({
  track: z.string().regex(/^[A-Za-z0-9]{20,30}$/).optional(),
  name: z.string().min(1).max(200),
  artist: z.string().min(1).max(200),
});

type SpotifyTrackResp = {
  name: string;
  preview_url: string | null;
  artists: Array<{ name: string }>;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    track: searchParams.get("track") ?? undefined,
    name: searchParams.get("name") ?? "",
    artist: searchParams.get("artist") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json({ previewUrl: null }, { status: 400 });
  }

  const { track, name, artist } = parsed.data;

  // Paso 1: si tenemos trackId, probar Spotify primero.
  if (track) {
    try {
      const data = (await spotifyCache.getOrSet(
        `track:${track}`,
        () => spotifyFetch<SpotifyTrackResp>(`/tracks/${track}`),
        10 * 60_000,
      )) as SpotifyTrackResp;
      if (data.preview_url) {
        return NextResponse.json({ previewUrl: data.preview_url, source: "spotify" });
      }
    } catch (e) {
      if (!(e instanceof SpotifyApiError)) {
        console.error("[api/preview] spotify fail:", e);
      }
      // Sigue al fallback iTunes.
    }
  }

  // Paso 2: fallback iTunes.
  const apple = await getApplePreviewUrl(name, artist);
  return NextResponse.json({
    previewUrl: apple,
    source: apple ? "apple" : null,
  });
}
