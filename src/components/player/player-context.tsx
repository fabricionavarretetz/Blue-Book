"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * PlayerContext — estado global del mini player persistente.
 *
 * Un solo `HTMLAudioElement` por sesión, vive en este provider y persiste
 * a través de navegaciones (mientras el layout no se desmonte). El mini
 * player es una vista de este estado.
 *
 * Política de preview: la app NO guarda track completo. Si Spotify tiene
 * `previewUrl` (raro en Dev Mode post-Nov 2024) se usa; si no, llamamos a
 * `/api/preview?track=<id>&name=&artist=` que intenta el fallback iTunes
 * con `getApplePreviewUrl`. Si nada hay, mostramos error en el mini player.
 */

export type PlayerTrack = {
  /** Spotify track id, o un id estable si la fuente es otra. */
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  albumImage: string | null;
  /** Si null, el provider intenta resolver via /api/preview. */
  previewUrl: string | null;
  /** URL externa Spotify (para "abrir en Spotify" cuando no hay preview). */
  externalUrl?: string | null;
};

type PlayerState = {
  track: PlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loading: boolean;
  error: string | null;
};

type PlayerContextValue = PlayerState & {
  play: (track: PlayerTrack) => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  close: () => void;
};

const PlayerCtx = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerCtx);
  if (!ctx) throw new Error("usePlayer fuera de <PlayerProvider>");
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({
    track: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    loading: false,
    error: null,
  });

  // Lazy-init del audio element: lo creamos al primer play. Evita warnings
  // de SSR y permite que browsers lo asocien al user gesture inicial.
  function ensureAudio(): HTMLAudioElement {
    if (!audioRef.current) {
      const a = new Audio();
      a.preload = "none";
      a.crossOrigin = "anonymous";
      a.addEventListener("timeupdate", () => {
        setState((s) => ({ ...s, currentTime: a.currentTime }));
      });
      a.addEventListener("loadedmetadata", () => {
        setState((s) => ({ ...s, duration: a.duration || 30 }));
      });
      a.addEventListener("play", () => {
        setState((s) => ({ ...s, isPlaying: true }));
      });
      a.addEventListener("pause", () => {
        setState((s) => ({ ...s, isPlaying: false }));
      });
      a.addEventListener("ended", () => {
        setState((s) => ({ ...s, isPlaying: false, currentTime: 0 }));
      });
      a.addEventListener("error", () => {
        setState((s) => ({
          ...s,
          isPlaying: false,
          loading: false,
          error: "No se pudo reproducir el preview.",
        }));
      });
      audioRef.current = a;
    }
    return audioRef.current;
  }

  const play = useCallback(async (track: PlayerTrack) => {
    const audio = ensureAudio();

    // Si es el mismo track y solo está pausado → resume.
    if (state.track?.id === track.id && audio.src && !audio.ended) {
      try {
        await audio.play();
      } catch {
        // El user gesture ya quedó atrás; ignoramos error de autoplay.
      }
      return;
    }

    // Track distinto: cambiar source y resetear progreso.
    setState({
      track,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      loading: true,
      error: null,
    });

    let url = track.previewUrl;
    if (!url) {
      // Fallback runtime via Apple Music (iTunes Search).
      try {
        const r = await fetch(
          `/api/preview?track=${encodeURIComponent(track.id)}&name=${encodeURIComponent(track.name)}&artist=${encodeURIComponent(track.artists[0]?.name ?? "")}`,
        );
        if (r.ok) {
          const d = (await r.json()) as { previewUrl: string | null };
          url = d.previewUrl;
        }
      } catch {
        url = null;
      }
    }

    if (!url) {
      setState((s) => ({
        ...s,
        loading: false,
        error: "Sin preview disponible para este track.",
      }));
      return;
    }

    audio.src = url;
    audio.currentTime = 0;
    setState((s) => ({ ...s, loading: false }));
    try {
      await audio.play();
    } catch (e) {
      setState((s) => ({
        ...s,
        isPlaying: false,
        error: e instanceof Error ? e.message : "Error al reproducir.",
      }));
    }
  }, [state.track?.id]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(async () => {
    const a = audioRef.current;
    if (!a || !a.src) return;
    try {
      await a.play();
    } catch {
      // ignored
    }
  }, []);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play().catch(() => {});
    } else {
      a.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(time, a.duration || 30));
  }, []);

  const close = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    setState({
      track: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      loading: false,
      error: null,
    });
  }, []);

  // Cleanup al desmontar el provider (debería ser raro — vive en (app)/layout).
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      ...state,
      play,
      pause,
      resume,
      toggle,
      seek,
      close,
    }),
    [state, play, pause, resume, toggle, seek, close],
  );

  return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>;
}
