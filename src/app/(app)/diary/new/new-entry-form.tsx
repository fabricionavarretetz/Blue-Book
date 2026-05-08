"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createEntryAction, type CreateEntryState } from "@/lib/actions/entries";
import { Button } from "@/components/ui/button";
import { TagPicker } from "./tag-picker";

/**
 * Form de creación de entry — UI funcional sin polish visual.
 * Flow:
 *   1. Search en Spotify (debounce 300ms via /api/search).
 *   2. Selección de track de la lista.
 *   3. Elegir emoji de reacción (6 default + opcional escribir custom).
 *   4. Opcional: tags (coma-separados) + reflexión.
 *   5. Submit → server action → redirect /diary.
 */

type Track = {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string; images: Array<{ url: string; height: number }> };
};

const DEFAULT_EMOJIS = ["🔥", "💔", "😭", "✨", "🌙", "🌅"];

export function NewEntryForm({ initialTrack }: { initialTrack?: Track | null } = {}) {
  const [state, formAction, pending] = useActionState<CreateEntryState | undefined, FormData>(
    createEntryAction,
    undefined,
  );

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Track | null>(initialTrack ?? null);
  const [reaction, setReaction] = useState<string>("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || selected) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`);
        if (r.ok) {
          const data = (await r.json()) as { tracks: { items: Track[] } };
          setResults(data.tracks?.items ?? []);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* Hidden inputs para server action */}
      <input type="hidden" name="spotifyId" value={selected?.id ?? ""} />
      <input type="hidden" name="reaction" value={reaction} />

      {/* 1. Search */}
      <section>
        <label className="mb-2 block text-sm font-medium text-ink">
          ¿Qué canción quieres guardar?
        </label>
        {selected ? (
          <div className="flex items-center gap-3 rounded-lg border border-line bg-paper-card p-3">
            {selected.album.images?.[0]?.url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={selected.album.images[0].url}
                alt=""
                className="h-12 w-12 rounded object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{selected.name}</p>
              <p className="truncate text-xs text-ink-soft">
                {selected.artists.map((a) => a.name).join(", ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setQuery("");
                setResults([]);
              }}
              className="text-xs text-ink-soft underline hover:text-ink"
            >
              cambiar
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar canción o artista…"
              autoFocus
              className="w-full rounded-lg border border-line bg-paper-card px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
            {searching && (
              <p className="mt-2 text-xs text-ink-muted">buscando…</p>
            )}
            {results.length > 0 && (
              <ul className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-line bg-paper-card">
                {results.map((track) => (
                  <li key={track.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(track);
                        setResults([]);
                      }}
                      className="flex w-full items-center gap-3 border-b border-line-soft p-3 text-left transition hover:bg-paper-card-hover"
                    >
                      {track.album.images?.[0]?.url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={track.album.images[0].url}
                          alt=""
                          className="h-10 w-10 flex-shrink-0 rounded object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{track.name}</p>
                        <p className="truncate text-xs text-ink-soft">
                          {track.artists.map((a) => a.name).join(", ")}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* 2. Reaction */}
      {selected && (
        <section>
          <label className="mb-2 block text-sm font-medium text-ink">
            ¿Cómo te hizo sentir?
          </label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setReaction(emoji)}
                className={`flex h-12 w-12 items-center justify-center rounded-lg border text-2xl transition ${
                  reaction === emoji
                    ? "border-ink bg-paper-card-hover"
                    : "border-line bg-paper-card hover:bg-paper-card-hover"
                }`}
              >
                {emoji}
              </button>
            ))}
            <input
              type="text"
              maxLength={4}
              value={!DEFAULT_EMOJIS.includes(reaction) ? reaction : ""}
              onChange={(e) => setReaction(e.target.value)}
              placeholder="otro"
              className="h-12 w-20 rounded-lg border border-line bg-paper-card text-center text-xl focus:border-ink focus:outline-none"
            />
          </div>
          {state?.fieldErrors?.reaction && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.reaction[0]}</p>
          )}
        </section>
      )}

      {/* 3. Tags + reflexión (opcional) */}
      {selected && reaction && (
        <>
          <section>
            <TagPicker
              name="moodTags"
              type="MOOD"
              label="¿Cómo te hizo sentir? (opcional)"
              accentClass="bg-[var(--color-tag-mood-bg)] text-[var(--color-tag-mood-text)]"
            />
          </section>

          <section>
            <TagPicker
              name="contextTags"
              type="CONTEXT"
              label="¿Dónde o qué hacías? (opcional)"
              accentClass="bg-[var(--color-tag-context-bg)] text-[var(--color-tag-context-text)]"
            />
          </section>

          <section>
            <label className="mb-2 block text-sm font-medium text-ink">
              ¿Quieres escribir algo? <span className="text-xs text-ink-muted">(opcional)</span>
            </label>
            <textarea
              name="reflection"
              rows={4}
              maxLength={2000}
              placeholder="Empieza a escribir tu recuerdo…"
              className="w-full resize-none rounded-lg border border-line bg-paper-card px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </section>
        </>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex items-center justify-between gap-3">
        <Link href="/diary" className="text-sm text-ink-soft underline hover:text-ink">
          Cancelar
        </Link>
        <Button type="submit" disabled={pending || !selected || !reaction}>
          {pending ? "Guardando…" : "Guardar momento"}
        </Button>
      </div>
    </form>
  );
}
