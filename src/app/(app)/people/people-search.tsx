"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Búsqueda live de users con debounce 300ms. Sin estado al cargar; muestra
 * placeholder hasta que el visitante escriba.
 */

type User = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  entryCount: number;
  followerCount: number;
};

export function PeopleSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/users/search?q=${encodeURIComponent(query)}&limit=20`,
        );
        if (r.ok) {
          const data = (await r.json()) as { users: User[] };
          setResults(data.users);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por username o nombre…"
        className="rounded-lg border border-line bg-paper-card px-4 py-3 text-base focus:border-ink focus:outline-none"
      />

      {searching && <p className="text-xs text-ink-muted">buscando…</p>}

      {!searching && query.trim() && results.length === 0 && (
        <p className="text-sm text-ink-muted">
          Nadie con ese nombre. Intenta con otra búsqueda.
        </p>
      )}

      {!query.trim() && (
        <p className="text-sm text-ink-muted">
          Escribe el nombre o @username de alguien para encontrarle.
        </p>
      )}

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((u) => (
            <li key={u.username}>
              <Link
                href={`/u/${u.username}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-paper-card p-4 transition-shadow hover:shadow-md"
              >
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-amber-300 via-amber-700 to-stone-900 ring-2 ring-paper-card">
                  {u.avatarUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={u.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{u.displayName}</p>
                  <p className="truncate text-sm text-ink-soft">@{u.username}</p>
                  {u.bio && (
                    <p className="mt-0.5 truncate text-xs text-ink-muted">{u.bio}</p>
                  )}
                </div>
                <p className="flex-shrink-0 text-right text-xs text-ink-muted">
                  {u.entryCount} momento{u.entryCount === 1 ? "" : "s"}
                  <br />
                  {u.followerCount} seguidor{u.followerCount === 1 ? "" : "es"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
