import Link from "next/link";
import { requireAuth } from "@/lib/auth-guard";
import { SPOTIFY_OAUTH_ENABLED } from "@/auth";
import { prisma } from "@/lib/db";
import { connectSpotifyAction } from "@/lib/actions/spotify";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getTrendingEntries,
  getNewUsersToDiscover,
  getSpotifyForYou,
} from "@/lib/explore";
import { ExploreSearch } from "./explore-search";
import {
  ForYouCard,
  TrendingMasonryCard,
  UserMasonryCard,
} from "./masonry-cards";

/**
 * /explore — descubrimiento. Tres rails con grilla masonry (Pinterest-style):
 *   1. Para ti — mezcla de tracks/artists/albums Spotify.
 *   2. Tendencia — momentos PUBLIC más reaccionados.
 *   3. Nuevos en Blue Book — personas con momentos.
 *
 * Masonry vía CSS `columns` shorthand (column-width: 16rem) en lugar de
 * column-count con breakpoints. El browser calcula automáticamente cuántas
 * columnas caben — en max-w-5xl da ~4 columnas desktop, ~3 tablet, ~2
 * mobile. Más estable que columns-2 md:columns-3 con Tailwind v4.
 */
const MASONRY_STYLE: React.CSSProperties = {
  // 14rem (~224px) hace que en max-w-5xl quepan 4 columnas en lugar de 3.
  // Cards más densas y la sensación masonry asimétrica se sostiene mejor.
  columns: "14rem",
  columnGap: "0.75rem",
};
export default async function ExplorePage() {
  const session = await requireAuth("/explore");
  const userId = session.user.id;

  const hasSpotify = SPOTIFY_OAUTH_ENABLED
    ? !!(await prisma.account.findFirst({
        where: { userId, provider: "spotify" },
        select: { id: true },
      }))
    : false;

  const [trending, newUsersResult, forYou] = await Promise.all([
    getTrendingEntries(userId, 10),
    getNewUsersToDiscover(userId, 8),
    hasSpotify ? getSpotifyForYou(userId, 14) : Promise.resolve([]),
  ]);
  const { users: newUsers, mode: newUsersMode } = newUsersResult;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-ink">Explorar</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Descubre canciones, personas y momentos que te pueden gustar.
        </p>
      </header>

      <div className="mb-10 max-w-2xl">
        <ExploreSearch />
      </div>

      {SPOTIFY_OAUTH_ENABLED && !hasSpotify && (
        <Card className="mb-8 flex max-w-2xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink">
              Conecta Spotify para tu rail Para ti
            </p>
            <p className="text-xs text-ink-soft">
              Recomendaciones basadas en lo que escuchas.
            </p>
          </div>
          <form action={connectSpotifyAction}>
            <Button type="submit" variant="secondary" size="sm">
              Conectar
            </Button>
          </form>
        </Card>
      )}

      {forYou.length > 0 && (
        <Rail
          title="Para ti"
          subtitle="Canciones, artistas y álbumes para descubrir"
        >
          <div style={MASONRY_STYLE}>
            {forYou.map((it) => (
              <ForYouCard key={`${it.kind}-${it.id}`} item={it} />
            ))}
          </div>
        </Rail>
      )}

      <Rail
        title="Tendencia"
        subtitle={
          trending.length === 0
            ? "Aún no hay momentos públicos para mostrar."
            : "Los momentos con más reacciones de la plataforma"
        }
      >
        {trending.length > 0 && (
          <div style={MASONRY_STYLE}>
            {trending.map((e) => (
              <TrendingMasonryCard key={e.id} entry={e} />
            ))}
          </div>
        )}
      </Rail>

      <Rail
        title="Nuevos en Blue Book"
        subtitle={
          newUsers.length === 0
            ? "Cuando alguien nuevo se una, aparecerá aquí."
            : newUsersMode === "unfollowed"
              ? "Personas que aún no sigues"
              : "Personas con momentos en Blue Book"
        }
        action={{ label: "Ver más en Personas", href: "/people" }}
      >
        {newUsers.length > 0 && (
          <div style={MASONRY_STYLE}>
            {newUsers.map((u) => (
              <UserMasonryCard key={u.username} user={u} />
            ))}
          </div>
        )}
      </Rail>
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
  children?: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <header className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>
          )}
        </div>
        {action && (
          <Link
            href={action.href}
            className="text-xs text-ink-soft hover:text-ink"
          >
            {action.label} →
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}
