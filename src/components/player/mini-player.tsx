"use client";

import { usePlayer } from "./player-context";

/**
 * Mini player persistente — footer fijo que solo se renderiza si hay track
 * activa en el contexto. Cover + título + artista + play/pause + progress
 * + close. Estética del mockup: redondeado, fondo papel, borde sutil.
 *
 * Toca preview de 30s vía HTML5 audio (sin Spotify SDK / sin Premium).
 * Cuando un track no tiene preview, mostramos error amigable + link
 * "Abrir en Spotify ↗" como salida.
 */
export function MiniPlayer() {
  const { track, isPlaying, currentTime, duration, loading, error, toggle, seek, close } =
    usePlayer();

  if (!track) return null;

  const total = duration || 30;
  const progress = total > 0 ? (currentTime / total) * 100 : 0;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        width: "calc(100% - 24px)",
        maxWidth: "640px",
      }}
      className="flex items-center gap-3 rounded-2xl border border-line bg-paper-card/95 p-3 shadow-2xl backdrop-blur-md"
      role="region"
      aria-label="Reproductor"
    >
      {/* Cover */}
      <div
        style={{ width: 48, height: 48 }}
        className="flex-shrink-0 overflow-hidden rounded-md bg-ink-fade"
      >
        {track.albumImage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={track.albumImage}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* Track info + progress */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{track.name}</p>
        <p className="truncate text-xs text-ink-soft">
          {track.artists.map((a) => a.name).join(", ")}
        </p>

        {error ? (
          <p className="mt-1 truncate text-[11px] text-red-700">
            {error}
            {track.externalUrl && (
              <>
                {" · "}
                <a
                  href={track.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-ink"
                >
                  Abrir en Spotify ↗
                </a>
              </>
            )}
          </p>
        ) : (
          <ProgressBar
            progress={progress}
            currentTime={currentTime}
            duration={total}
            onSeek={(pct) => seek((pct / 100) * total)}
          />
        )}
      </div>

      {/* Play/Pause */}
      <button
        type="button"
        onClick={toggle}
        disabled={loading || !!error}
        style={{ color: "white" }}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ink transition hover:bg-ink-soft disabled:opacity-40"
        aria-label={isPlaying ? "Pausar" : "Reproducir"}
      >
        {loading ? (
          <Spinner />
        ) : isPlaying ? (
          <PauseIcon />
        ) : (
          <PlayIcon />
        )}
      </button>

      {/* Close */}
      <button
        type="button"
        onClick={close}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper-card-hover hover:text-ink"
        aria-label="Cerrar reproductor"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

function ProgressBar({
  progress,
  currentTime,
  duration,
  onSeek,
}: {
  progress: number;
  currentTime: number;
  duration: number;
  onSeek: (pct: number) => void;
}) {
  return (
    <div className="mt-1.5">
      <div
        role="slider"
        aria-label="Progreso"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        tabIndex={0}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = ((e.clientX - rect.left) / rect.width) * 100;
          onSeek(pct);
        }}
        className="group relative h-1 cursor-pointer rounded-full bg-line"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-ink transition-[width] duration-200 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-ink-muted">
        <span>{formatTime(currentTime)}</span>
        <span>preview · {formatTime(duration)}</span>
      </div>
    </div>
  );
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const total = Math.floor(s);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 1-9 9" />
    </svg>
  );
}
