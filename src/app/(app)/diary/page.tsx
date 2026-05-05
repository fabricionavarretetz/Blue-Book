import Link from "next/link";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { EntryMenu } from "./entry-menu";

/**
 * /diary — vista principal del usuario logueado.
 *
 * Día 9 (funcional): lista real de entries desde DB con metadata del
 * trackSnapshot. Sin polish visual final — eso vuelve cuando se retome
 * la integración del design system.
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

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours === 0) {
      const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return `hace ${mins} min`;
    }
    return `hace ${hours}h`;
  }
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem`;
  return date.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

export default async function DiaryPage() {
  const session = await requireAuth("/diary");

  const entries = await prisma.entry.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="px-12 py-10">
      <header className="mb-10 flex items-start gap-12">
        <div className="flex flex-1 items-start gap-10">
          <div>
            <h1 className="text-5xl font-bold tracking-tight text-ink leading-[1.05]">
              Mi diario
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft max-w-[260px]">
              Cada canción guarda un momento.
              <br />
              Cada momento te cuenta algo.
            </p>
          </div>

          <p className="font-hand max-w-[200px] pt-3 text-[20px] leading-snug text-ink-soft">
            no es solo música,
            <br />
            es todo lo que vivías
            <br />
            cuando la escuchabas.{" "}
            <span className="text-[var(--color-heart)]">♥</span>
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
          <Link
            href="/diary/new"
            className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <span className="text-base leading-none">+</span> Nueva entrada
          </Link>
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper-card p-12 text-center">
          <p className="font-hand text-3xl text-ink-soft">
            @{session.user.username} · 0 momentos
          </p>
          <p className="mt-4 text-ink-muted">
            Empieza tu diario:{" "}
            <Link href="/diary/new" className="underline hover:text-ink">
              guarda tu primer momento
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {entries.map((e) => {
            const snap = isTrackSnapshot(e.trackSnapshot) ? e.trackSnapshot : null;
            return (
              <li
                key={e.id}
                className="group relative"
              >
                {/* Card como Link entera. El menú vive FUERA del Link
                    posicionado absoluto en la esquina, evitando anidación
                    inválida <button> dentro de <a>. */}
                <Link
                  href={`/diary/${e.id}`}
                  className="block rounded-2xl border border-line bg-paper-card p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex gap-4">
                    {/* Cover */}
                    <div className="flex-shrink-0">
                      {snap?.album.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={snap.album.image}
                          alt=""
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-lg bg-ink-fade" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3 pr-16">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-ink group-hover:underline">
                            {snap?.name ?? "Canción"}
                          </p>
                          <p className="truncate text-sm text-ink-soft">
                            {snap?.artists.map((a) => a.name).join(", ") ?? ""}
                          </p>
                        </div>
                        <span className="flex-shrink-0 text-2xl leading-none">
                          {e.reaction}
                        </span>
                      </div>

                      {/* Tags */}
                      {(e.moodTags.length > 0 || e.contextTags.length > 0) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {e.moodTags.map((t) => (
                            <span
                              key={`m-${t}`}
                              className="rounded-full bg-[var(--color-tag-mood-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-tag-mood-text)]"
                            >
                              {t}
                            </span>
                          ))}
                          {e.contextTags.map((t) => (
                            <span
                              key={`c-${t}`}
                              className="rounded-full bg-[var(--color-tag-context-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-tag-context-text)]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Reflexión */}
                      {e.reflection && (
                        <p className="mt-3 font-hand text-[20px] leading-snug text-ink">
                          {e.reflection}
                        </p>
                      )}

                      <p className="mt-3 text-[11px] text-ink-muted">
                        {formatRelative(e.createdAt)}
                      </p>
                    </div>
                  </div>
                </Link>

                {/* Menú "⋯" absoluto en la esquina, FUERA del Link */}
                <div className="absolute right-5 top-5 z-10">
                  <EntryMenu entryId={e.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
