import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-guard";
import {
  spotifyFetch,
  spotifyCache,
  SpotifyApiError,
} from "@/lib/spotify";
import { TrackPlayRow } from "@/components/player/track-play-row";

/**
 * /explore/artist/[id] — página de detalle de un artista en Spotify.
 *
 * Llamadas (en paralelo, cacheadas 10 min):
 *   - /artists/{id}             → header (foto, nombre, followers)
 *   - /artists/{id}/albums      → "Discografía"
 *
 * Después, secuencial:
 *   - /albums/{first_album_id}  → tracks de "Lo más reciente"
 *
 * Nota técnica: `/artists/{id}/top-tracks` está deprecado para apps en
 * Development Mode (devuelve 403, igual que /recommendations). Mostramos
 * los tracks del álbum más reciente como aproximación honesta de "lo que
 * más vale la pena escuchar ahora mismo de este artista".
 *
 * Modelo del producto: NO se "guarda" un artista. Es lente para llegar a
 * la canción que sí va al diario.
 */

const ID_RE = /^[A-Za-z0-9]{20,30}$/;
const TEN_MIN = 10 * 60_000;

type SpotifyArtist = {
  id: string;
  name: string;
  images: Array<{ url: string }>;
  followers?: { total: number };
  genres?: string[];
};

type SpotifyTrack = {
  id: string;
  name: string;
  duration_ms: number;
  artists: Array<{ name: string }>;
};

type SpotifyAlbum = {
  id: string;
  name: string;
  album_type: "album" | "single" | "compilation";
  release_date: string;
  images: Array<{ url: string }>;
  total_tracks: number;
};

type SpotifyAlbumDetail = SpotifyAlbum & {
  tracks: { items: SpotifyTrack[] };
};

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  if (!ID_RE.test(id)) notFound();

  const [artistRes, albumsRes] = await Promise.allSettled([
    spotifyCache.getOrSet(
      `artist-v3:${id}`,
      () => spotifyFetch<SpotifyArtist>(`/artists/${id}`),
      TEN_MIN,
    ),
    spotifyCache.getOrSet(
      `artist-v3:${id}:albums`,
      () =>
        spotifyFetch<{ items: SpotifyAlbum[] }>(`/artists/${id}/albums`, {
          params: {
            include_groups: "album,single",
            // Dev Mode apps tienen cap de 10 en este endpoint (15 ya falla
            // con 400 Invalid limit). Spotify devuelve sorted by release
            // date desc, así que estos 10 son los más recientes.
            limit: 10,
            market: "US",
          },
        }),
      TEN_MIN,
    ),
  ]);

  if (artistRes.status === "rejected") {
    if (
      artistRes.reason instanceof SpotifyApiError &&
      artistRes.reason.status === 404
    ) {
      notFound();
    }
    throw artistRes.reason;
  }

  const artist = artistRes.value as SpotifyArtist;

  let albums: SpotifyAlbum[] = [];
  if (albumsRes.status === "fulfilled") {
    const v = albumsRes.value as { items?: SpotifyAlbum[] };
    if (Array.isArray(v.items)) albums = dedupeAlbums(v.items);
  } else {
    console.error(
      `[artist/${id}] albums failed:`,
      albumsRes.reason instanceof SpotifyApiError
        ? `${albumsRes.reason.status} ${albumsRes.reason.message}`
        : albumsRes.reason,
    );
  }

  // Tracks del álbum más reciente (workaround a /top-tracks deprecado).
  let recentTracks: SpotifyTrack[] = [];
  let recentAlbum: SpotifyAlbum | null = null;
  if (albums.length > 0) {
    recentAlbum = albums[0];
    try {
      const detail = (await spotifyCache.getOrSet(
        `album-detail:${recentAlbum.id}`,
        () => spotifyFetch<SpotifyAlbumDetail>(`/albums/${recentAlbum!.id}`),
        TEN_MIN,
      )) as SpotifyAlbumDetail;
      if (Array.isArray(detail.tracks?.items)) {
        recentTracks = detail.tracks.items.slice(0, 5);
      }
    } catch (e) {
      console.error(`[artist/${id}] recent album detail failed:`, e);
    }
  }

  const photo = artist.images[0]?.url ?? null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <div className="mb-6 text-xs">
        <Link href="/explore" className="text-ink-soft hover:text-ink">
          ← Explorar
        </Link>
      </div>

      {/* Header */}
      <header className="mb-10 flex items-center gap-6">
        <div
          style={{ width: 160, height: 160 }}
          className="flex-shrink-0 overflow-hidden rounded-full shadow-md ring-1 ring-line"
        >
          {photo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-amber-300 via-amber-700 to-stone-900" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            artista
          </p>
          <h1 className="mt-1 text-3xl font-bold text-ink md:text-4xl">
            {artist.name}
          </h1>
          {artist.followers?.total != null && (
            <p className="mt-2 text-sm text-ink-soft">
              {artist.followers.total.toLocaleString("es")} seguidores en Spotify
            </p>
          )}
          {(artist.genres?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {artist.genres!.slice(0, 4).map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-paper-card-hover px-2.5 py-0.5 text-[11px] text-ink-soft"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Lo más reciente — tracks del último álbum */}
      {recentTracks.length > 0 && recentAlbum && (
        <section className="mb-12">
          <header className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold text-ink">Lo más reciente</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                de {recentAlbum.name} · {yearOf(recentAlbum.release_date)}
              </p>
            </div>
            <Link
              href={`/explore/album/${recentAlbum.id}`}
              className="text-xs text-ink-soft hover:text-ink"
            >
              Ver álbum →
            </Link>
          </header>
          <ol className="space-y-1.5">
            {recentTracks.map((t, idx) => (
              <li key={t.id}>
                <TrackPlayRow
                  number={idx + 1}
                  track={{
                    id: t.id,
                    name: t.name,
                    artists: t.artists.map((a) => ({ name: a.name })),
                    durationMs: t.duration_ms,
                  }}
                  albumImage={recentAlbum.images[0]?.url ?? null}
                  subtitle={t.artists.map((a) => a.name).join(", ")}
                />
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Discografía — los 10 más recientes (cap Spotify Dev Mode) */}
      <section className="mb-10">
        <header className="mb-4">
          <h2 className="text-xl font-bold text-ink">Discografía</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Lanzamientos más recientes
          </p>
        </header>
        {albums.length > 0 ? (
          <ul
            style={{ columns: "11rem", columnGap: "1rem" }}
            className="block"
          >
            {albums.map((alb) => (
              <li key={alb.id} className="mb-4 break-inside-avoid">
                <Link href={`/explore/album/${alb.id}`} className="group block">
                  <div className="aspect-square overflow-hidden rounded-xl bg-ink-fade shadow-sm transition-shadow group-hover:shadow-md">
                    {alb.images[0]?.url && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={alb.images[0].url}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-ink">
                    {alb.name}
                  </p>
                  <p className="truncate text-xs text-ink-soft">
                    {yearOf(alb.release_date)} ·{" "}
                    {alb.album_type === "single" ? "single" : "álbum"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">
            Sin discografía disponible.
          </p>
        )}
      </section>
    </main>
  );
}

/**
 * Spotify devuelve duplicados en /albums (mismo álbum en mercados distintos).
 * Deduplicamos por nombre normalizado conservando el primero (el más reciente
 * porque el endpoint devuelve sorted by release date desc por default).
 */
function dedupeAlbums(items: SpotifyAlbum[]): SpotifyAlbum[] {
  const seen = new Set<string>();
  const out: SpotifyAlbum[] = [];
  for (const alb of items) {
    const key = alb.name.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(alb);
  }
  return out;
}

function yearOf(releaseDate: string): string {
  return releaseDate.slice(0, 4);
}
