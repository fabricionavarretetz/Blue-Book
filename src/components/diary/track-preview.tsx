"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Player simple de preview Spotify/Apple Music (30 segundos).
 *
 * Pill compacto con: botón play/pause + barra de progreso + label.
 * Auto-pausa cuando el preview termina.
 */

type Props = {
  url: string;
  /** Aceptado por compatibilidad; este player simple no muestra cover. */
  albumImage?: string | null;
};

export function TrackPreview({ url }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (audio.duration > 0) setProgress(audio.currentTime / audio.duration);
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
      audio.currentTime = 0;
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-sm items-center gap-3 rounded-full border border-line bg-paper-card px-4 py-2 shadow-sm">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={url} preload="metadata" />

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar preview" : "Reproducir preview"}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ink text-white transition-opacity hover:opacity-90"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-px" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex-1 overflow-hidden rounded-full bg-line">
        <div
          className="h-1 bg-ink transition-[width] duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <span className="text-[11px] uppercase tracking-wider text-ink-muted">
        preview · 30s
      </span>
    </div>
  );
}
