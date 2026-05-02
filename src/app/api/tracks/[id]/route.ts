import { NextResponse } from "next/server";
import { spotifyFetch, spotifyCache, SpotifyApiError } from "@/lib/spotify";

/**
 * GET /api/tracks/:id — info completa de un track Spotify.
 *
 * Cacheada 10 minutos: la metadata cambia muy poco. Sirve como base
 * cuando el user vea detalles de un track antes de loggear un momento.
 */

const TEN_MIN = 10 * 60_000;

// Validación mínima del param: id de Spotify es base62 22 chars.
const ID_RE = /^[A-Za-z0-9]{20,30}$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: "Track id inválido" }, { status: 400 });
  }

  const cacheKey = `track:${id}`;

  try {
    const data = await spotifyCache.getOrSet(
      cacheKey,
      () => spotifyFetch<unknown>(`/tracks/${id}`),
      TEN_MIN,
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof SpotifyApiError) {
      if (err.status === 404) {
        return NextResponse.json({ error: "Track no encontrado" }, { status: 404 });
      }
      return NextResponse.json(
        { error: "Spotify error", status: err.status },
        { status: 502 },
      );
    }
    throw err;
  }
}
