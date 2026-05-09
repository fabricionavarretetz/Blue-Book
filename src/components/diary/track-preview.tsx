"use client";

import { usePlayer, type PlayerTrack } from "@/components/player/player-context";

/**
 * Pill compact que dispara el mini player global al hacer click. Antes era
 * un player inline con su propio audio element; ahora delega al
 * PlayerContext para que la reproducción persista entre navegaciones.
 *
 * Si el track activo del player es este, el botón muestra pausa; si no,
 * play. Click en pause con el mismo track pausa el global.
 */

type Props = {
  /** Datos suficientes para que el player resuelva la preview URL. */
  track: PlayerTrack;
};

export function TrackPreview({ track }: Props) {
  const player = usePlayer();
  const isThisTrack = player.track?.id === track.id;
  const isPlayingThis = isThisTrack && player.isPlaying;

  const handleClick = () => {
    if (isPlayingThis) {
      player.pause();
    } else if (isThisTrack) {
      player.resume();
    } else {
      player.play(track);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="mx-auto flex max-w-sm items-center gap-3 rounded-full border border-line bg-paper-card px-4 py-2 shadow-sm transition-shadow hover:shadow-md"
    >
      <span
        style={{ color: "white" }}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ink"
      >
        {isPlayingThis ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 translate-x-px"
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </span>
      <span className="text-sm font-medium text-ink">
        {isPlayingThis ? "Reproduciendo" : "Reproducir preview"}
      </span>
      <span className="text-[11px] uppercase tracking-wider text-ink-muted">
        30s
      </span>
    </button>
  );
}
