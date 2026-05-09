"use client";

import Link from "next/link";
import { usePlayer } from "./player-context";

/**
 * Row de track con botón play que dispara el mini player global. Reusado
 * en /explore/artist/[id] (top tracks) y /explore/album/[id] (tracklist).
 *
 * Estructura: el `<Link>` envuelve el contenido visual y lleva al user a
 * `/diary/new?track=<id>`. El botón play vive FUERA del `<Link>` en el
 * mismo padre `relative group`, posicionado absolute. Un `<button>` dentro
 * de un `<a>` es HTML inválido y rompe el hover state en algunos browsers.
 *
 * `number` puede ser índice 1-based o track_number del álbum.
 * `albumImage` opcional: si lo pasas se muestra como thumb 48x48 (top
 * tracks de artist); si lo omites no se muestra (tracklist de álbum donde
 * el cover ya está en el header).
 */

type Props = {
  number: number;
  track: {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    durationMs: number;
  };
  albumImage?: string | null;
  /** Subtítulo (album name para artist top tracks, artist names para album tracklist). */
  subtitle: string;
};

export function TrackPlayRow({ number, track, albumImage, subtitle }: Props) {
  const player = usePlayer();
  const isThisTrack = player.track?.id === track.id;
  const isPlayingThis = isThisTrack && player.isPlaying;
  const hasThumb = albumImage !== undefined;

  const handlePlay = () => {
    if (isPlayingThis) {
      player.pause();
    } else if (isThisTrack) {
      player.resume();
    } else {
      player.play({
        id: track.id,
        name: track.name,
        artists: track.artists,
        albumImage: albumImage ?? null,
        previewUrl: null,
      });
    }
  };

  return (
    <div className="group relative">
      <Link
        href={`/diary/new?track=${track.id}`}
        className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-paper-card"
      >
        <span className="w-5 flex-shrink-0 text-center text-sm font-medium text-ink-muted">
          {number}
        </span>

        {hasThumb && (
          <div
            style={{ width: 48, height: 48 }}
            className="flex-shrink-0 overflow-hidden rounded-md bg-ink-fade"
          >
            {albumImage && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={albumImage}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{track.name}</p>
          <p className="truncate text-xs text-ink-soft">{subtitle}</p>
        </div>

        <span className="flex-shrink-0 text-xs text-ink-muted">
          {formatDuration(track.durationMs)}
        </span>
      </Link>

      {/* Botón play absolute. Posición:
          - Con thumb: sobrepuesto sobre el thumb (left=p-2 + number w-5 + gap-3 = ~40px,
            thumb es 48px → centro del thumb a 64px del izq).
          - Sin thumb: pill a la derecha, antes del duration. */}
      <button
        type="button"
        onClick={handlePlay}
        aria-label={isPlayingThis ? "Pausar" : "Reproducir"}
        style={{ color: "white" }}
        className={
          hasThumb
            ? `absolute left-10 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 translate-x-2 items-center justify-center rounded-full bg-ink shadow-md transition ${
                isThisTrack ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`
            : `absolute right-14 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-ink shadow-md transition ${
                isThisTrack ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`
        }
      >
        {isPlayingThis ? <PauseIcon /> : <PlayIcon />}
      </button>
    </div>
  );
}

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 translate-x-px" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
