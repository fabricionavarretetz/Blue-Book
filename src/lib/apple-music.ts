import "server-only";
import { TtlCache } from "@/lib/cache";

/**
 * iTunes Search API (catálogo Apple Music) — fallback de previewUrl
 * cuando Spotify devuelve null (~todos los tracks en Development Mode).
 *
 * Pública, sin auth, devuelve preview de 30s en m4a.
 * Docs: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
 */

type ItunesTrack = {
  trackName?: string;
  artistName?: string;
  previewUrl?: string;
};

type ItunesResponse = {
  resultCount: number;
  results: ItunesTrack[];
};

const cache = new TtlCache<string, string | null>(24 * 60 * 60_000); // 24h
const ENDPOINT = "https://itunes.apple.com/search";

/**
 * Busca el preview de 30s de un track en iTunes/Apple Music por nombre + artista.
 *
 * Estrategia simple:
 *   1. Consulta `term="<name> <artist>"`, entity=song, limit=3.
 *   2. Toma el primer resultado que matchee razonablemente (case-insensitive).
 *   3. Devuelve previewUrl o null si no hay match aceptable.
 *
 * Cache 24h por (name|artist) — evita golpear iTunes si el mismo track
 * se loggea varias veces.
 */
export async function getApplePreviewUrl(
  trackName: string,
  artistName: string,
): Promise<string | null> {
  const key = `${trackName.toLowerCase()}|${artistName.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  try {
    const term = `${trackName} ${artistName}`.trim();
    const url = new URL(ENDPOINT);
    url.searchParams.set("term", term);
    url.searchParams.set("entity", "song");
    url.searchParams.set("limit", "5");

    const r = await fetch(url, {
      // iTunes responde rápido, pero ponemos timeout defensivo
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) {
      cache.set(key, null);
      return null;
    }

    const data = (await r.json()) as ItunesResponse;
    const wantedTrack = trackName.toLowerCase().trim();
    const wantedArtist = artistName.toLowerCase().trim();

    // Buscar mejor match por similitud de nombre + artista
    for (const item of data.results) {
      const itemTrack = (item.trackName ?? "").toLowerCase();
      const itemArtist = (item.artistName ?? "").toLowerCase();
      // Match aceptable si artistas coinciden y track empieza con el wanted
      // (tolera versiones tipo "Track - Remastered" del catálogo Apple)
      if (
        item.previewUrl &&
        itemArtist.includes(wantedArtist) &&
        (itemTrack.startsWith(wantedTrack) || wantedTrack.startsWith(itemTrack))
      ) {
        cache.set(key, item.previewUrl);
        return item.previewUrl;
      }
    }

    // Fallback: primer resultado con previewUrl, sin validación estricta
    // (mejor un preview de la versión "remastered" que ningún preview)
    const firstWithPreview = data.results.find((i) => !!i.previewUrl);
    const fallback = firstWithPreview?.previewUrl ?? null;
    cache.set(key, fallback);
    return fallback;
  } catch {
    cache.set(key, null);
    return null;
  }
}
