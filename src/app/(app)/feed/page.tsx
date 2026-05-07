import Link from "next/link";
import { requireAuth } from "@/lib/auth-guard";
import { SPOTIFY_OAUTH_ENABLED, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { connectSpotifyAction } from "@/lib/actions/spotify";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeedEntryCard } from "@/components/diary/feed-entry-card";
import { getSelfRail, getSocialRail, getDiscoveryRail } from "@/lib/feed";

/**
 * /feed — hybrid feed con 3 rails. Es la home del producto cuando hay sesión
 * (la URL `/` redirige aquí desde page.tsx raíz).
 *
 * Rails:
 *   1. Tu diario — tus últimas 5 entries (link al detalle privado).
 *   2. De gente que sigues — entries PUBLIC de tus follows (link al detalle público).
 *   3. Para ti — entries recientes de users que NO sigues (discovery).
 */
export default async function FeedPage() {
  const session = await requireAuth("/feed");

  const [self, social, discovery, hasSpotify] = await Promise.all([
    getSelfRail(session.user.id, 5),
    getSocialRail(session.user.id, 15),
    getDiscoveryRail(session.user.id, 12),
    SPOTIFY_OAUTH_ENABLED
      ? prisma.account
          .findFirst({
            where: { userId: session.user.id, provider: "spotify" },
            select: { id: true },
          })
          .then((a) => !!a)
      : Promise.resolve(false),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:px-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-ink">Inicio</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Tu diario, gente que sigues y momentos que te pueden gustar.
        </p>
      </header>

      {SPOTIFY_OAUTH_ENABLED && !hasSpotify && (
        <Card className="mb-8 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink">Conecta tu Spotify</p>
            <p className="text-xs text-ink-soft">
              Para sugerencias basadas en lo que escuchas.
            </p>
          </div>
          <form action={connectSpotifyAction}>
            <Button type="submit" variant="secondary" size="sm">
              Conectar
            </Button>
          </form>
        </Card>
      )}

      <Rail
        title="Tu diario"
        subtitle={
          self.length === 0
            ? "Aún no has guardado momentos."
            : "Tus últimos momentos"
        }
        action={
          self.length === 0
            ? { label: "Guardar el primero", href: "/diary/new" }
            : { label: "Ver todo", href: "/diary" }
        }
      >
        {self.length > 0 && (
          <ul className="space-y-3">
            {self.map((e) => (
              <li key={e.id}>
                <FeedEntryCard entry={e} mode="self" />
              </li>
            ))}
          </ul>
        )}
      </Rail>

      <Rail
        title="De gente que sigues"
        subtitle={
          social.length === 0
            ? "Sigue a gente para ver sus momentos aquí."
            : `Últimos ${social.length} momentos`
        }
        action={
          social.length === 0 ? { label: "Buscar gente", href: "/people" } : undefined
        }
      >
        {social.length > 0 && (
          <ul className="space-y-3">
            {social.map((e) => (
              <li key={e.id}>
                <FeedEntryCard entry={e} author={e.user} mode="social" />
              </li>
            ))}
          </ul>
        )}
      </Rail>

      {discovery.length > 0 && (
        <Rail title="Para ti" subtitle="Momentos recientes que te pueden gustar">
          <ul className="space-y-3">
            {discovery.map((e) => (
              <li key={e.id}>
                <FeedEntryCard entry={e} author={e.user} mode="discovery" />
              </li>
            ))}
          </ul>
        </Rail>
      )}

      <footer className="mt-16 flex items-center justify-between border-t border-line pt-6 text-xs text-ink-muted">
        <Link
          href={`/u/${session.user.username ?? ""}`}
          className="hover:text-ink"
        >
          Ver tu perfil público →
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className="hover:text-ink">
            Cerrar sesión
          </button>
        </form>
      </footer>
    </main>
  );
}

function Rail({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <header className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
        </div>
        {action && (
          <Link href={action.href} className="text-xs text-ink-soft hover:text-ink">
            {action.label} →
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}
