import Link from "next/link";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { getProfileStats } from "@/lib/profile-stats";
import { ProfileForm } from "./profile-form";

/**
 * /profile — perfil privado del usuario logueado.
 *
 * Permite editar displayName, username, bio y avatarUrl.
 * Muestra link a la versión pública (/u/:username) y stats simples.
 */
export default async function ProfilePage() {
  const session = await requireAuth("/profile");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      displayName: true,
      username: true,
      bio: true,
      avatarUrl: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) {
    // Edge case: sesión válida pero user borrado de DB.
    return <p>Tu cuenta ya no existe.</p>;
  }

  const stats = await getProfileStats(session.user.id);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-ink">Tu perfil</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Cambios visibles en tu vista pública{" "}
            <Link
              href={`/u/${user.username}`}
              className="text-ink underline hover:opacity-80"
            >
              @{user.username}
            </Link>
            .
          </p>
        </div>
      </header>

      {/* Stats card */}
      <section className="mb-8 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-line bg-paper-card p-4">
          <p className="text-xs uppercase tracking-wider text-ink-muted">Momentos</p>
          <p className="mt-1 text-2xl font-bold text-ink">{stats.totalEntries}</p>
        </div>
        <div className="rounded-xl border border-line bg-paper-card p-4">
          <p className="text-xs uppercase tracking-wider text-ink-muted">Mood top</p>
          <p className="font-hand mt-1 text-2xl text-ink">
            {stats.topMood ? stats.topMood.tag : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-paper-card p-4">
          <p className="text-xs uppercase tracking-wider text-ink-muted">Top artista</p>
          <p className="mt-1 truncate text-base font-semibold text-ink">
            {stats.topArtist ? stats.topArtist.name : "—"}
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="rounded-2xl border border-line bg-paper-card p-6">
        <h2 className="mb-5 text-lg font-semibold text-ink">Editar perfil</h2>
        <ProfileForm
          initial={{
            displayName: user.displayName,
            username: user.username,
            bio: user.bio ?? "",
            avatarUrl: user.avatarUrl ?? "",
          }}
        />
      </section>

      {/* Email (read-only) */}
      <section className="mt-6 rounded-2xl border border-dashed border-line bg-paper p-4 text-sm">
        <p className="text-ink-soft">
          <span className="font-medium text-ink">Email:</span> {user.email}
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Cambiar email requiere re-verificación. Función no disponible en MVP.
        </p>
      </section>
    </main>
  );
}
