"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { updateEntryAction, type CreateEntryState } from "@/lib/actions/entries";
import { Button } from "@/components/ui/button";
import { TagPicker } from "../../new/tag-picker";

/**
 * Form de edición de entry. NO permite cambiar la canción — el momento
 * está atado a la canción específica. Solo edita emoji + tags + reflexión.
 */

type Props = {
  entry: {
    id: string;
    spotifyId: string;
    reaction: string;
    reflection: string | null;
    moodTags: string[];
    contextTags: string[];
    trackSnapshot: {
      name: string;
      artists: Array<{ name: string }>;
      album: { name: string; image: string | null };
    };
  };
};

const DEFAULT_EMOJIS = ["🔥", "💔", "😭", "✨", "🌙", "🌅"];

export function EditEntryForm({ entry }: Props) {
  const [state, formAction, pending] = useActionState<CreateEntryState | undefined, FormData>(
    updateEntryAction,
    undefined,
  );
  const [reaction, setReaction] = useState(entry.reaction);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="entryId" value={entry.id} />
      <input type="hidden" name="reaction" value={reaction} />

      {/* Track (read-only) */}
      <div className="flex items-center gap-3 rounded-lg border border-line bg-paper-card p-3">
        {entry.trackSnapshot.album.image && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={entry.trackSnapshot.album.image}
            alt=""
            className="h-12 w-12 rounded object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{entry.trackSnapshot.name}</p>
          <p className="truncate text-xs text-ink-soft">
            {entry.trackSnapshot.artists.map((a) => a.name).join(", ")}
          </p>
        </div>
        <p className="text-xs text-ink-muted">no editable</p>
      </div>

      {/* Reaction */}
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
      </section>

      {/* Tags */}
      <section>
        <TagPicker
          name="moodTags"
          type="MOOD"
          label="¿Cómo te hizo sentir? (opcional)"
          accentClass="bg-[var(--color-tag-mood-bg)] text-[var(--color-tag-mood-text)]"
          initial={entry.moodTags}
        />
      </section>

      <section>
        <TagPicker
          name="contextTags"
          type="CONTEXT"
          label="¿Dónde o qué hacías? (opcional)"
          accentClass="bg-[var(--color-tag-context-bg)] text-[var(--color-tag-context-text)]"
          initial={entry.contextTags}
        />
      </section>

      <section>
        <label className="mb-2 block text-sm font-medium text-ink">
          ¿Quieres escribir algo? <span className="text-xs text-ink-muted">(opcional)</span>
        </label>
        <textarea
          name="reflection"
          defaultValue={entry.reflection ?? ""}
          rows={5}
          maxLength={2000}
          placeholder="Empieza a escribir tu recuerdo…"
          className="w-full resize-none rounded-lg border border-line bg-paper-card px-3 py-2 text-sm focus:border-ink focus:outline-none"
        />
      </section>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex items-center justify-between gap-3">
        <Link href="/diary" className="text-sm text-ink-soft underline hover:text-ink">
          Cancelar
        </Link>
        <Button type="submit" disabled={pending || !reaction}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
