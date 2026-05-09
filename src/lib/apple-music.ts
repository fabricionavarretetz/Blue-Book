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

    // Match estricto: artist debe coincidir Y track debe coincidir (alguno
    // de: igual, startsWith en cualquier dirección — tolera "Track -
    // Remastered" o "Track (feat. X)").
    for (const item of data.results) {
      if (!item.previewUrl) continue;
      const itemTrack = (item.trackName ?? "").toLowerCase().trim();
      const itemArtist = (item.artistName ?? "").toLowerCase().trim();
      if (!itemArtist.includes(wantedArtist)) continue;
      const sameTrack =
        itemTrack === wantedTrack ||
        itemTrack.startsWith(wantedTrack) ||
        wantedTrack.startsWith(itemTrack);
      if (sameTrack) {
        cache.set(key, item.previewUrl);
        return item.previewUrl;
      }
    }

    // NO devolvemos el primer resultado con preview como fallback — antes
    // hacíamos eso y reproducía canciones distintas (ej. para "Slow Tonight"
    // de Tom Misch iTunes devolvía otra canción con palabra "Slow").
    // Mejor mostrar "sin preview disponible" que reproducir música ajena.
    cache.set(key, null);
    return null;
  } catch {
    cache.set(key, null);
    return null;
  }
}
