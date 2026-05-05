"use client";

import { useEffect, useState } from "react";

/**
 * Picker de tags con chips clickables.
 *
 * - Carga sugerencias desde /api/tags?type=MOOD|CONTEXT (taxonomía seedeada).
 * - Click en chip lo añade al estado interno.
 * - "+ propio" abre input para tag custom.
 * - Estado actual se serializa como JSON en un hidden input para enviar al server.
 *
 * Uso:
 *   <TagPicker name="moodTags" type="MOOD" placeholder="..." />
 */

type Props = {
  name: string;
  type: "MOOD" | "CONTEXT";
  label: string;
  accentClass: string;
  /** Tags ya seleccionados (para vista de edición). */
  initial?: string[];
};

type SuggestedTag = { slug: string; label: string };

export function TagPicker({ name, type, label, accentClass, initial = [] }: Props) {
  const [suggested, setSuggested] = useState<SuggestedTag[]>([]);
  const [selected, setSelected] = useState<string[]>(initial);
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    fetch(`/api/tags?type=${type}`)
      .then((r) => (r.ok ? r.json() : { tags: [] }))
      .then((data: { tags: SuggestedTag[] }) => setSuggested(data.tags))
      .catch(() => setSuggested([]));
  }, [type]);

  const toggle = (label: string) => {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label],
    );
  };

  const addCustom = () => {
    const v = customInput.trim();
    if (!v) return;
    if (!selected.includes(v)) setSelected([...selected, v]);
    setCustomInput("");
    setShowCustom(false);
  };

  // Sugeridas que NO están seleccionadas, separadas para claridad visual
  const unselectedSuggested = suggested.filter((s) => !selected.includes(s.label));

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-ink">{label}</label>

      {/* Hidden input que el form action lee */}
      <input type="hidden" name={name} value={JSON.stringify(selected)} />

      {/* Seleccionados */}
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={`flex items-center gap-1 rounded-full ${accentClass} px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80`}
            >
              {tag}
              <span className="opacity-60">×</span>
            </button>
          ))}
        </div>
      )}

      {/* Sugeridos */}
      <div className="flex flex-wrap gap-1.5">
        {unselectedSuggested.map((tag) => (
          <button
            key={tag.slug}
            type="button"
            onClick={() => toggle(tag.label)}
            className="rounded-full border border-line bg-paper-card px-3 py-1 text-xs text-ink-soft transition-colors hover:bg-paper-card-hover hover:text-ink"
          >
            {tag.label}
          </button>
        ))}

        {!showCustom ? (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="rounded-full border border-dashed border-line bg-transparent px-3 py-1 text-xs text-ink-muted hover:border-ink-soft hover:text-ink-soft"
          >
            + propio
          </button>
        ) : (
          <span className="flex items-center gap-1">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
                if (e.key === "Escape") {
                  setShowCustom(false);
                  setCustomInput("");
                }
              }}
              autoFocus
              maxLength={40}
              placeholder="tu tag…"
              className="w-32 rounded-full border border-ink-soft bg-white px-3 py-1 text-xs focus:outline-none"
            />
            <button
              type="button"
              onClick={addCustom}
              className="text-xs text-ink-soft hover:text-ink"
            >
              ✓
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
