import Link from "next/link";
import { TrackPreview } from "./track-preview";
import { ReactionBar } from "./reaction-bar";
import type { AggregatedReactions } from "@/lib/reactions";

/**
 * Vista de detalle de un momento. Renderiza la entry con cover grande,
 * tags, reflexión expandida, fecha completa, link al artista de Spotify.
 *
 * Compartido entre vista privada (/diary/[id]) y pública (/u/:user/[entryId]).
 * `mode` controla detalles UX (link al diario propio vs ajeno).
 */

type TrackSnapshot = {
  name: string;
  artists: Array<{ id?: string; name: string }>;
  album: { id?: string; name: string; image: string | null };
  externalUrl?: string | null;
  previewUrl?: string | null;
};

type Entry = {
  id: string;
  spotifyId: string;
  reaction: string;
  reflection: string | null;
  moodTags: string[];
  contextTags: string[];
  createdAt: Date;
  trackSnapshot: TrackSnapshot;
};

type Author = {
  username: string;
  displayName: string;
};

type Mode =
  | { type: "private"; menu: React.ReactNode; reactions?: AggregatedReactions }
  | {
      type: "public";
      author: Author;
      reactions: AggregatedReactions;
      /** True si el viewer puede reaccionar (logueado y NO autor). */
      canReact: boolean;
    };

function formatFull(date: Date): string {
  return date.toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function EntryDetail({ entry, mode }: { entry: Entry; mode: Mode }) {
  const snap = entry.trackSnapshot;

  return (
    <article className="mx-auto max-w-2xl px-6 py-12">
      {/* Top: link de regreso + menú o autor */}
      <div className="mb-8 flex items-center justify-between text-sm">
        {mode.type === "private" ? (
          <Link href="/diary" className="text-ink-soft hover:text-ink">
            ← Mi diario
          </Link>
        ) : (
          <Link
            href={`/u/${mode.author.username}`}
            className="text-ink-soft hover:text-ink"
          >
            ← Diario de {mode.author.displayName}
          </Link>
        )}
        {mode.type === "private" && mode.menu}
      </div>

      {/* Cover grande */}
      <div className="mb-6 flex justify-center">
        {snap.album.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={snap.album.image}
            alt={`Cover de ${snap.album.name}`}
            className="h-64 w-64 rounded-2xl object-cover shadow-lg md:h-80 md:w-80"
          />
        ) : (
          <div className="h-64 w-64 rounded-2xl bg-ink-fade md:h-80 md:w-80" />
        )}
      </div>

      {/* Reaction enorme */}
      <div className="mb-6 text-center text-6xl">{entry.reaction}</div>

      {/* Track info */}
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{snap.name}</h1>
        <p className="mt-1 text-base text-ink-soft">
          {snap.artists.map((a) => a.name).join(", ")}
        </p>
        <p className="mt-1 text-xs text-ink-muted">{snap.album.name}</p>
        {snap.externalUrl && (
          <a
            href={snap.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs text-ink-soft underline hover:text-ink"
          >
            Abrir en Spotify ↗
          </a>
        )}
      </header>

      {/* Trigger del mini player global. Mostramos el botón aunque la
          previewUrl venga null en el snapshot — el PlayerContext intentará
          el fallback iTunes en runtime al pulsar play. */}
      <div className="mb-6">
        <TrackPreview
          track={{
            id: entry.spotifyId,
            name: snap.name,
            artists: snap.artists.map((a) => ({ name: a.name })),
            albumImage: snap.album.image,
            previewUrl: snap.previewUrl ?? null,
            externalUrl: snap.externalUrl ?? null,
          }}
        />
      </div>

      {/* Tags */}
      {(entry.moodTags.length > 0 || entry.contextTags.length > 0) && (
        <div className="mb-6 flex flex-wrap justify-center gap-1.5">
          {entry.moodTags.map((t) => (
            <span
              key={`m-${t}`}
              className="rounded-full bg-[var(--color-tag-mood-bg)] px-3 py-1 text-xs font-medium text-[var(--color-tag-mood-text)]"
            >
              {t}
            </span>
          ))}
          {entry.contextTags.map((t) => (
            <span
              key={`c-${t}`}
              className="rounded-full bg-[var(--color-tag-context-bg)] px-3 py-1 text-xs font-medium text-[var(--color-tag-context-text)]"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Reflexión expandida en cursiva */}
      {entry.reflection && (
        <div className="mx-auto mb-6 max-w-xl rounded-2xl border border-line bg-paper-card p-6">
          <p className="font-hand text-2xl leading-relaxed text-ink whitespace-pre-wrap">
            {entry.reflection}
          </p>
        </div>
      )}

      {/* Reactions — vista pública y privada (en privada solo lectura) */}
      {mode.type === "public" && (
        <div className="mb-6">
          <ReactionBar
            entryId={entry.id}
            initial={mode.reactions}
            interactive={mode.canReact}
          />
        </div>
      )}
      {mode.type === "private" && mode.reactions && mode.reactions.total > 0 && (
        <div className="mb-6">
          <ReactionBar
            entryId={entry.id}
            initial={mode.reactions}
            interactive={false}
          />
        </div>
      )}

      {/* Fecha + autor (si público) */}
      <footer className="mt-8 text-center text-xs text-ink-muted">
        <p>{formatFull(entry.createdAt)}</p>
        {mode.type === "public" && (
          <p className="mt-1">
            por{" "}
            <Link
              href={`/u/${mode.author.username}`}
              className="text-ink-soft hover:text-ink"
            >
              @{mode.author.username}
            </Link>
          </p>
        )}
      </footer>
    </article>
  );
}
