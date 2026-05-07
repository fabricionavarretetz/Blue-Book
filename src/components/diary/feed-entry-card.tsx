import Link from "next/link";

/**
 * Card de entry para el feed. Diferentes layouts según el rail:
 *  - "self": tu propia entry, link a /diary/[id], sin avatar.
 *  - "social" / "discovery": entry de otro user, link a /u/:user/[entryId],
 *     con avatar y nombre arriba.
 */

type TrackSnapshot = {
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string; image: string | null };
};

function isTrackSnapshot(v: unknown): v is TrackSnapshot {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.name === "string" && Array.isArray(o.artists);
}

type Author = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type Entry = {
  id: string;
  reaction: string;
  reflection: string | null;
  moodTags: string[];
  contextTags: string[];
  trackSnapshot: unknown;
};

type Props =
  | { entry: Entry; mode: "self" }
  | { entry: Entry; author: Author; mode: "social" | "discovery" };

export function FeedEntryCard(props: Props) {
  const { entry, mode } = props;
  const snap = isTrackSnapshot(entry.trackSnapshot) ? entry.trackSnapshot : null;
  const href =
    mode === "self"
      ? `/diary/${entry.id}`
      : `/u/${(props as { author: Author }).author.username}/${entry.id}`;

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-line bg-paper-card p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Header con autor (solo en social/discovery) */}
      {mode !== "self" && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <div className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-amber-300 via-amber-700 to-stone-900">
            {(props as { author: Author }).author.avatarUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={(props as { author: Author }).author.avatarUrl ?? ""}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <p className="truncate text-ink">
            <span className="font-medium">
              {(props as { author: Author }).author.displayName}
            </span>{" "}
            <span className="text-ink-muted">
              @{(props as { author: Author }).author.username}
            </span>
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-shrink-0">
          {snap?.album.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={snap.album.image}
              alt=""
              className="h-16 w-16 rounded-lg object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-ink-fade" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink group-hover:underline">
                {snap?.name ?? "Canción"}
              </p>
              <p className="truncate text-xs text-ink-soft">
                {snap?.artists.map((a) => a.name).join(", ") ?? ""}
              </p>
            </div>
            <span className="flex-shrink-0 text-xl leading-none">{entry.reaction}</span>
          </div>

          {(entry.moodTags.length > 0 || entry.contextTags.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1">
              {entry.moodTags.slice(0, 3).map((t) => (
                <span
                  key={`m-${t}`}
                  className="rounded-full bg-[var(--color-tag-mood-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-tag-mood-text)]"
                >
                  {t}
                </span>
              ))}
              {entry.contextTags.slice(0, 3).map((t) => (
                <span
                  key={`c-${t}`}
                  className="rounded-full bg-[var(--color-tag-context-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-tag-context-text)]"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {entry.reflection && (
            <p className="mt-2 line-clamp-2 font-hand text-base leading-snug text-ink">
              {entry.reflection}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
