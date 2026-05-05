"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { deleteEntryAction } from "@/lib/actions/entries";

/**
 * Menú "⋯" para una entry: Editar / Borrar.
 *
 * - Click en ⋯ abre dropdown.
 * - "Borrar" pide confirmación inline.
 * - useTransition mantiene UI responsive durante el server action.
 */
export function EntryMenu({ entryId }: { entryId: string }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const onDelete = () => {
    startTransition(async () => {
      await deleteEntryAction(entryId);
      setOpen(false);
      setConfirming(false);
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Opciones"
        className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-paper-card-hover hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-lg border border-line bg-paper-card shadow-lg">
          {!confirming ? (
            <>
              <Link
                href={`/diary/${entryId}/edit`}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-paper-card-hover"
                onClick={() => setOpen(false)}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
                Editar
              </Link>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="flex w-full items-center gap-2 border-t border-line-soft px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
                Borrar
              </button>
            </>
          ) : (
            <div className="p-3">
              <p className="text-xs text-ink">¿Borrar este momento?</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={pending}
                  className="flex-1 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {pending ? "..." : "Borrar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                  className="flex-1 rounded border border-line bg-white px-2 py-1 text-xs text-ink hover:bg-paper-card-hover"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
