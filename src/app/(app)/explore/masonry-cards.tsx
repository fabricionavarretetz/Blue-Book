import Link from "next/link";
import type {
  ForYouItem,
  ForYouTrack,
  ForYouArtist,
  ForYouAlbum,
} from "@/lib/explore";

/**
 * Cards de la grilla masonry (Pinterest-style) de /explore.
 *
 * El contenedor pone `columns-2 md:columns-3` y cada card va con
 * `break-inside-avoid` + `mb-3`. CSS columns: el gap vertical se controla
 * con margin (no `gap`).
 *
 * Cada card decide su altura natural — aspect ratio variable por fuente
 * para tracks, círculo para artists, cuadrado para albums, texto variable
 * para entries y users. Esa heterogeneidad genera el efecto masonry.
 */

// ----------------------------------------------------------------------------
//  ForYouCard — dispatcher: track / artist / album.
// ----------------------------------------------------------------------------

export function ForYouCard({ item }: { item: ForYouItem }) {
  switch (item.kind) {
    case "track":
      return <TrackForYouCard track={item} />;
    case "artist":
      return <ArtistForYouCard artist={item} />;
    case "album":
      return <AlbumForYouCard album={item} />;
  }
}

// ----------------------------------------------------------------------------
//  Track card — cover con título sobrepuesto, aspect variable por fuente.
// ----------------------------------------------------------------------------

const ASPECT_BY_SOURCE: Record<ForYouTrack["source"], string> = {
  "top-track": "aspect-[3/4]",
  "top-artist": "aspect-square",
  "recently-played": "aspect-[4/5]",
};

const LABEL_BY_SOURCE: Record<ForYouTrack["source"], string> = {
  "top-track": "tu top",
  "top-artist": "más de",
  "recently-played": "hoy",
};

function TrackForYouCard({ track }: { track: ForYouTrack }) {
  const cover = track.album.images[0]?.url ?? null;
  return (
    <Link
      href={`/diary/new?track=${track.id}`}
      className="group mb-3 block break-inside-avoid overflow-hidden rounded-2xl shadow-sm transition-shadow hover:shadow-lg"
    >
      <div className={`relative ${ASPECT_BY_SOURCE[track.source]} bg-ink-fade`}>
        {cover && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/90 backdrop-blur-sm">
          {LABEL_BY_SOURCE[track.source]}
        </span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3">
          <p className="truncate text-sm font-bold text-white">{track.name}</p>
          <p className="truncate text-[11px] text-white/80">
            {track.artists.map((a) => a.name).join(", ")}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ----------------------------------------------------------------------------
//  Artist card — círculo grande, fondo con degradado oscuro, label "artista".
// ----------------------------------------------------------------------------

function ArtistForYouCard({ artist }: { artist: ForYouArtist }) {
  const photo = artist.images[0]?.url ?? null;
  return (
    <Link
      href={`/explore/artist/${artist.id}`}
      className="group mb-3 block break-inside-avoid bg-transparent p-3 text-center"
    >
      <span className="mb-3 inline-block rounded-full border border-line px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
        artista
      </span>
      <div className="mx-auto aspect-square w-full max-w-[140px] overflow-hidden rounded-full shadow-md ring-1 ring-line">
        {photo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={photo}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-amber-300 via-amber-700 to-stone-900" />
        )}
      </div>
      <p className="mt-3 truncate text-sm font-bold text-ink">{artist.name}</p>
      {artist.followers > 0 && (
        <p className="mt-0.5 text-[11px] text-ink-muted">
          {formatFollowers(artist.followers)} seguidores
        </p>
      )}
    </Link>
  );
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ----------------------------------------------------------------------------
//  Album card — cuadrado con cover + nombre + artista debajo.
// ----------------------------------------------------------------------------

function AlbumForYouCard({ album }: { album: ForYouAlbum }) {
  const cover = album.images[0]?.url ?? null;
  return (
    <Link
      href={`/explore/album/${album.id}`}
      className="group mb-3 block break-inside-avoid overflow-hidden rounded-2xl border border-line bg-paper-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square bg-ink-fade">
        {cover && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/90 backdrop-blur-sm">
          álbum
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium text-ink">{album.name}</p>
        <p className="truncate text-xs text-ink-soft">
          {album.artists.map((a) => a.name).join(", ")}
        </p>
      </div>
    </Link>
  );
}

// ----------------------------------------------------------------------------
//  TrendingMasonryCard — momento PUBLIC con reflexión cursive.
// ----------------------------------------------------------------------------

type TrendingEntryShape = {
  id: string;
  reaction: string;
  reflection: string | null;
  trackSnapshot: unknown;
  user: { username: string; displayName: string; avatarUrl: string | null };
  _count: { reactions: number };
};

type TrackSnap = {
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string; image: string | null };
};

function readSnap(v: unknown): TrackSnap | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.name !== "string" || !Array.isArray(o.artists)) return null;
  const album =
    o.album && typeof o.album === "object" ? (o.album as Record<string, unknown>) : {};
  return {
    name: o.name,
    artists: (o.artists as Array<{ name: string }>) ?? [],
    album: {
      name: typeof album.name === "string" ? album.name : "",
      image: typeof album.image === "string" ? album.image : null,
    },
  };
}

export function TrendingMasonryCard({ entry }: { entry: TrendingEntryShape }) {
  const snap = readSnap(entry.trackSnapshot);
  if (!snap) return null;

  return (
    <article className="mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-line bg-paper-card shadow-sm transition-shadow hover:shadow-md">
      <Link
        href={`/u/${entry.user.username}/${entry.id}`}
        className="block"
      >
        {snap.album.image && (
          <div className="relative aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={snap.album.image}
              alt=""
              className="h-full w-full object-cover"
            />
            <span className="absolute right-3 top-3 text-3xl drop-shadow-md">
              {entry.reaction}
            </span>
          </div>
        )}
        <div className="p-4">
          <p className="truncate text-sm font-medium text-ink">{snap.name}</p>
          <p className="truncate text-xs text-ink-soft">
            {snap.artists.map((a) => a.name).join(", ")}
          </p>
          {entry.reflection && (
            <p className="font-hand mt-3 line-clamp-4 text-base leading-snug text-ink">
              {entry.reflection}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between text-[11px] text-ink-muted">
            <span>@{entry.user.username}</span>
            {entry._count.reactions > 0 && (
              <span>
                {entry._count.reactions} reacc
                {entry._count.reactions === 1 ? "ión" : "iones"}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}

// ----------------------------------------------------------------------------
//  UserMasonryCard — perfil con avatar centrado, bio si la hay.
// ----------------------------------------------------------------------------

type UserCardShape = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  _count: { entries: number; followers: number };
};

export function UserMasonryCard({ user }: { user: UserCardShape }) {
  return (
    <Link
      href={`/u/${user.username}`}
      className="mb-3 block break-inside-avoid rounded-2xl border border-line bg-paper-card p-5 text-center shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mx-auto h-16 w-16 overflow-hidden rounded-full bg-gradient-to-br from-amber-300 via-amber-700 to-stone-900 ring-2 ring-paper-card">
        {user.avatarUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={user.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <p className="mt-3 truncate text-sm font-medium text-ink">
        {user.displayName}
      </p>
      <p className="truncate text-xs text-ink-soft">@{user.username}</p>
      {user.bio && (
        <p className="mt-2 line-clamp-3 text-xs text-ink-muted">{user.bio}</p>
      )}
      <p className="mt-3 text-[11px] text-ink-muted">
        {user._count.entries} momento{user._count.entries === 1 ? "" : "s"} ·{" "}
        {user._count.followers} seguidor{user._count.followers === 1 ? "" : "es"}
      </p>
    </Link>
  );
}
