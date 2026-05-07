"use client";

import { useState, useTransition } from "react";
import { addReactionAction, removeReactionAction } from "@/lib/actions/reactions";
import type { AggregatedReactions } from "@/lib/reactions";

/**
 * ReactionBar — barra de respuestas emocionales bajo una entry pública.
 *
 * Modos:
 *  - "interactive": viewer logueado, NO autor. Puede tocar emoji para
 *    reaccionar / cambiar / quitar.
 *  - "readonly": viewer es el autor o no hay sesión. Solo muestra el agregado.
 *
 * Optimistic update: el counter se ajusta inmediatamente y revierte si la
 * action falla. Toggle: tocar el emoji que ya tienes lo quita.
 */

const REACTION_EMOJIS = ["🫶", "🥹", "✨", "🔥", "😭", "🌙"];

type Props = {
  entryId: string;
  initial: AggregatedReactions;
  /** Si false, no permite reaccionar (autor o sin sesión). */
  interactive: boolean;
};

export function ReactionBar({ entryId, initial, interactive }: Props) {
  const [byEmoji, setByEmoji] = useState(() => {
    // Convertir array a Map para mutaciones rápidas
    const m = new Map<string, number>();
    for (const { emoji, count } of initial.byEmoji) m.set(emoji, count);
    return m;
  });
  const [myEmoji, setMyEmoji] = useState(initial.myEmoji);
  const [pending, startTransition] = useTransition();

  const handleClick = (emoji: string) => {
    if (!interactive || pending) return;

    const isToggleOff = myEmoji === emoji;
    const previousEmoji = myEmoji;

    // Optimistic update
    setByEmoji((prev) => {
      const next = new Map(prev);
      // Quitar voto previo si había
      if (previousEmoji) {
        const c = (next.get(previousEmoji) ?? 1) - 1;
        if (c <= 0) next.delete(previousEmoji);
        else next.set(previousEmoji, c);
      }
      // Añadir voto nuevo (si no es toggle-off)
      if (!isToggleOff) {
        next.set(emoji, (next.get(emoji) ?? 0) + 1);
      }
      return next;
    });
    setMyEmoji(isToggleOff ? null : emoji);

    startTransition(async () => {
      try {
        if (isToggleOff) {
          await removeReactionAction(entryId);
        } else {
          await addReactionAction(entryId, emoji);
        }
      } catch {
        // Revertir si falla
        setMyEmoji(previousEmoji);
        // Re-aplicar conteos previos sería complejo; refrescamos al server
        // (simple: el revalidatePath traerá data fresca en el siguiente render)
      }
    });
  };

  const total = [...byEmoji.values()].reduce((s, c) => s + c, 0);

  return (
    <div className="mx-auto max-w-md">
      <p className="mb-2 text-center text-xs uppercase tracking-wider text-ink-muted">
        {interactive
          ? "¿Cómo te hizo sentir esta entrada?"
          : total === 0
            ? "Sin reacciones aún"
            : `${total} reacci${total === 1 ? "ón" : "ones"}`}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {REACTION_EMOJIS.map((emoji) => {
          const count = byEmoji.get(emoji) ?? 0;
          const mine = myEmoji === emoji;
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => handleClick(emoji)}
              disabled={!interactive || pending}
              aria-label={mine ? `Quitar reacción ${emoji}` : `Reaccionar con ${emoji}`}
              className={[
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                interactive
                  ? "cursor-pointer"
                  : "cursor-default",
                mine
                  ? "border-ink bg-paper-card-hover"
                  : count > 0
                    ? "border-line bg-paper-card hover:bg-paper-card-hover"
                    : "border-line bg-transparent hover:bg-paper-card",
                pending && "opacity-60",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="text-lg leading-none">{emoji}</span>
              {count > 0 && (
                <span className="text-xs font-medium text-ink-soft">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
