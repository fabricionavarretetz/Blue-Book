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
 * /explore/album/[id] — tracklist de un álbum en Spotify.
 *
 * Una sola llamada (cacheada 10 min): /albums/{id} ya incluye los tracks
 * en `tracks.items`, así que no necesitamos un segundo round-trip.
 *
 * Cada track lleva a /diary/new?track=<id> — recordatorio del modelo: el
 * álbum no se "guarda" como entry, solo es un lente para llegar al track.
 */

const ID_RE = /^[A-Za-z0-9]{20,30}$/;
const TEN_MIN = 10 * 60_000;

type SpotifyAlbumDetail = {
  id: string;
  name: string;
  album_type: "album" | "single" | "compilation";
  release_date: string;
  total_tracks: number;
  images: Array<{ url: string }>;
  artists: Array<{ id: string; name: string }>;
  label: string;
  tracks: {
    items: Array<{
      id: string;
      name: string;
      track_number: number;
      duration_ms: number;
      artists: Array<{ id: string; name: string }>;
    }>;
  };
};

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  if (!ID_RE.test(id)) notFound();

  let album: SpotifyAlbumDetail;
  try {
    album = (await spotifyCache.getOrSet(
      `album:${id}`,
      () => spotifyFetch<SpotifyAlbumDetail>(`/albums/${id}`),
      TEN_MIN,
    )) as SpotifyAlbumDetail;
  } catch (e) {
    if (e instanceof SpotifyApiError && e.status === 404) notFound();
    throw e;
  }

  const cover = album.images[0]?.url ?? null;
  const totalDuration = album.tracks.items.reduce(
    (acc, t) => acc + t.duration_ms,
    0,
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <div className="mb-6 text-xs">
        <Link href="/explore" className="text-ink-soft hover:text-ink">
          ← Explorar
        </Link>
      </div>

      {/* Header */}
      <header className="mb-10 flex flex-col items-center gap-6 text-center md:flex-row md:items-end md:text-left">
        <div className="h-56 w-56 flex-shrink-0 overflow-hidden rounded-2xl bg-ink-fade shadow-lg md:h-64 md:w-64">
          {cover && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={cover} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {album.album_type === "single" ? "single" : "álbum"}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-ink md:text-4xl">
            {album.name}
          </h1>
          <p className="mt-3 text-sm text-ink-soft">
            {album.artists.map((a, i) => (
              <span key={a.id}>
                {i > 0 && ", "}
                <Link
                  href={`/explore/artist/${a.id}`}
                  className="hover:text-ink"
                >
                  {a.name}
                </Link>
              </span>
            ))}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {yearOf(album.release_date)} · {album.total_tracks} canciones ·{" "}
            {formatTotalDuration(totalDuration)}
          </p>
        </div>
      </header>

      {/* Tracklist */}
      <section>
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-ink-muted">
          Canciones
        </h2>
        <ol className="divide-y divide-line-soft">
          {album.tracks.items.map((t) => (
            <li key={t.id}>
              <TrackPlayRow
                number={t.track_number}
                track={{
                  id: t.id,
                  name: t.name,
                  artists: t.artists.map((a) => ({ name: a.name })),
                  durationMs: t.duration_ms,
                }}
                subtitle={t.artists.map((a) => a.name).join(", ")}
              />
            </li>
          ))}
        </ol>
      </section>

      {album.label && (
        <footer className="mt-10 text-xs text-ink-muted">
          {album.label} · {album.release_date}
        </footer>
      )}
    </main>
  );
}

function formatTotalDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const hours = Math.floor(total / 3600);
  const min = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${min}min`;
  return `${min}min`;
}

function yearOf(releaseDate: string): string {
  return releaseDate.slice(0, 4);
}
