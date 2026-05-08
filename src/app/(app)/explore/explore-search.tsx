"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Search global para /explore — un solo input, cuatro secciones de resultados:
 * tracks (Spotify) + artists (Spotify) + albums (Spotify) + users (DB) en
 * paralelo.
 *
 * Cada tipo lleva a una ruta distinta:
 *   - track  → /diary/new?track=<id>     (crear momento — el flow del diario)
 *   - artist → /explore/artist/<id>      (discografía + top tracks)
 *   - album  → /explore/album/<id>       (tracklist)
 *   - user   → /u/<username>
 */

type Track = {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: { id: string; name: string; image: string | null };
  externalUrl: string;
};

type Artist = {
  id: string;
  name: string;
  image: string | null;
};

type Album = {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  image: string | null;
  year: string;
};

type User = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  entryCount: number;
  followerCount: number;
};

type Results = {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  users: User[];
};

const EMPTY: Results = { tracks: [], artists: [], albums: [], users: [] };

export function ExploreSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) return;
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/explore/search?q=${encodeURIComponent(query)}&limit=6`,
        );
        if (r.ok) {
          const data = (await r.json()) as Results;
          setResults(data);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleQueryChange(next: string) {
    setQuery(next);
    if (!next.trim()) {
      setResults(EMPTY);
      setSearching(false);
    } else {
      setSearching(true);
    }
  }

  const totalResults =
    results.tracks.length +
    results.artists.length +
    results.albums.length +
    results.users.length;
  const showEmpty = !searching && query.trim() && totalResults === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Buscar canciones, artistas, álbumes, personas…"
          className="w-full rounded-xl border border-line bg-paper-card px-4 py-3.5 pl-11 text-base focus:border-ink focus:outline-none"
        />
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4.35-4.35" />
        </svg>
      </div>

      {searching && <p className="text-xs text-ink-muted">buscando…</p>}

      {showEmpty && (
        <p className="text-sm text-ink-muted">
          Sin resultados para «{query}». Prueba con otro término.
        </p>
      )}

      {results.tracks.length > 0 && (
        <ResultSection title="Canciones">
          {results.tracks.map((t) => (
            <ResultRow
              key={t.id}
              href={`/diary/new?track=${t.id}`}
              image={t.album.image}
              imageShape="rounded"
              title={t.name}
              subtitle={t.artists.map((a) => a.name).join(", ")}
              cta="guardar →"
            />
          ))}
        </ResultSection>
      )}

      {results.artists.length > 0 && (
        <ResultSection title="Artistas">
          {results.artists.map((a) => (
            <ResultRow
              key={a.id}
              href={`/explore/artist/${a.id}`}
              image={a.image}
              imageShape="circle"
              title={a.name}
              subtitle="Artista"
              cta="ver →"
            />
          ))}
        </ResultSection>
      )}

      {results.albums.length > 0 && (
        <ResultSection title="Álbumes">
          {results.albums.map((alb) => (
            <ResultRow
              key={alb.id}
              href={`/explore/album/${alb.id}`}
              image={alb.image}
              imageShape="rounded"
              title={alb.name}
              subtitle={`${alb.year} · ${alb.artists.map((a) => a.name).join(", ")}`}
              cta="ver →"
            />
          ))}
        </ResultSection>
      )}

      {results.users.length > 0 && (
        <ResultSection title="Personas">
          {results.users.map((u) => (
            <ResultRow
              key={u.username}
              href={`/u/${u.username}`}
              image={u.avatarUrl}
              imageShape="circle"
              title={u.displayName}
              subtitle={`@${u.username} · ${u.entryCount} momento${
                u.entryCount === 1 ? "" : "s"
              }`}
            />
          ))}
        </ResultSection>
      )}
    </div>
  );
}

function ResultSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
        {title}
      </h3>
      <ul className="space-y-1.5">{children}</ul>
    </section>
  );
}

function ResultRow({
  href,
  image,
  imageShape,
  title,
  subtitle,
  cta,
}: {
  href: string;
  image: string | null;
  imageShape: "circle" | "rounded";
  title: string;
  subtitle: string;
  cta?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-lg border border-line bg-paper-card p-2.5 transition-shadow hover:shadow-sm"
      >
        <div
          className={`h-12 w-12 flex-shrink-0 overflow-hidden bg-ink-fade ${
            imageShape === "circle" ? "rounded-full" : "rounded-md"
          }`}
        >
          {image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={image} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{title}</p>
          <p className="truncate text-xs text-ink-soft">{subtitle}</p>
        </div>
        {cta && (
          <span className="flex-shrink-0 text-xs text-ink-muted">{cta}</span>
        )}
      </Link>
    </li>
  );
}
