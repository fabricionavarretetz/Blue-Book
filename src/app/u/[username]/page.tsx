import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getProfileStats } from "@/lib/profile-stats";
import { auth } from "@/auth";
import { FollowButton } from "@/components/people/follow-button";
import type { Metadata } from "next";

/**
 * /u/[username] — vista PÚBLICA del diario de un usuario.
 *
 * Accesible sin sesión. Muestra solo entries con visibility=PUBLIC.
 * Si el usuario está logueado y mira su propio perfil, ve un CTA para editar.
 *
 * No protegida por auth (intencional). El proxy de Next.js no aplica aquí
 * porque /u no está en PROTECTED_PATHS.
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
  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem`;
  return date.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { displayName: true, bio: true },
  });
  if (!user) return { title: "Usuario no encontrado" };
  return {
    title: `${user.displayName} (@${username})`,
    description: user.bio ?? `El diario musical de ${user.displayName}`,
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      displayName: true,
      username: true,
      bio: true,
      avatarUrl: true,
      createdAt: true,
      _count: { select: { followers: true, following: true } },
    },
  });

  if (!user) notFound();

  // ¿El visitante (si está logueado) ya sigue a este user?
  const session = await auth();
  const isOwnProfile = session?.user?.id === user.id;
  let initiallyFollowing = false;
  if (session?.user?.id && !isOwnProfile) {
    const fol = await prisma.follow.findUnique({
      where: {
        followerId_followeeId: {
          followerId: session.user.id,
          followeeId: user.id,
        },
      },
      select: { followerId: true },
    });
    initiallyFollowing = !!fol;
  }

  const [entries, stats] = await Promise.all([
    prisma.entry.findMany({
      where: { userId: user.id, visibility: "PUBLIC" },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    getProfileStats(user.id),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      {/* Header del perfil */}
      <header className="mb-10 flex items-start gap-5">
        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-amber-300 via-amber-700 to-stone-900 ring-4 ring-paper-card">
          {user.avatarUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold text-ink">{user.displayName}</h1>
              <p className="text-sm text-ink-soft">@{user.username}</p>
            </div>
            {/* Botón seguir solo si el visitante está logueado y NO es su propio perfil */}
            {session?.user?.id && !isOwnProfile && (
              <FollowButton
                targetUsername={user.username}
                initiallyFollowing={initiallyFollowing}
              />
            )}
            {isOwnProfile && (
              <Link
                href="/profile"
                className="rounded-full border border-line bg-paper-card px-4 py-1.5 text-sm font-medium text-ink hover:bg-paper-card-hover"
              >
                Editar perfil
              </Link>
            )}
          </div>
          {user.bio && <p className="mt-2 text-sm leading-relaxed text-ink">{user.bio}</p>}
          <p className="mt-3 text-xs text-ink-muted">
            <Link
              href={`/u/${user.username}/followers`}
              className="hover:text-ink"
            >
              <span className="text-ink">{user._count.followers}</span> seguidores
            </Link>
            {" · "}
            <Link
              href={`/u/${user.username}/following`}
              className="hover:text-ink"
            >
              <span className="text-ink">{user._count.following}</span> siguiendo
            </Link>
            {" · "}
            <span className="text-ink">{stats.totalEntries}</span> momento
            {stats.totalEntries === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <hr className="mb-8 border-line" />

      {/* Entries públicas */}
      {entries.length === 0 ? (
        <p className="text-center text-sm text-ink-muted">
          @{user.username} aún no tiene momentos públicos.
        </p>
      ) : (
        <ul className="space-y-4">
          {entries.map((e) => {
            const snap = isTrackSnapshot(e.trackSnapshot) ? e.trackSnapshot : null;
            return (
              <li
                key={e.id}
                className="group"
              >
                <Link
                  href={`/u/${user.username}/${e.id}`}
                  className="block rounded-2xl border border-line bg-paper-card p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex gap-4">
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

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-ink group-hover:underline">
                            {snap?.name ?? "Canción"}
                          </p>
                          <p className="truncate text-sm text-ink-soft">
                            {snap?.artists.map((a) => a.name).join(", ") ?? ""}
                          </p>
                        </div>
                        <span className="text-2xl leading-none">{e.reaction}</span>
                      </div>

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

                      {e.reflection && (
                        <p className="mt-3 font-hand text-[20px] leading-snug text-ink">
                          {e.reflection}
                        </p>
                      )}

                      <p className="mt-3 text-[11px] text-ink-muted">{formatRelative(e.createdAt)}</p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Footer minimal */}
      <footer className="mt-12 text-center">
        <Link href="/" className="font-hand text-2xl text-ink-soft hover:text-ink">
          Blue Book
        </Link>
        <p className="mt-1 text-xs text-ink-muted">tu diario de música</p>
      </footer>
    </main>
  );
}
