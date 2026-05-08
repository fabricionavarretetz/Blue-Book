import { requireAuth } from "@/lib/auth-guard";
import { spotifyFetch, SpotifyApiError } from "@/lib/spotify";
import { NewEntryForm } from "./new-entry-form";

/**
 * /diary/new — pantalla de creación de entry.
 *
 * Acepta `?track=<spotifyId>` para preseleccionar un track (entrada desde
 * /explore). Si el id es inválido o Spotify devuelve 404, ignoramos el param
 * y abrimos el form en modo búsqueda normal.
 */

const ID_RE = /^[A-Za-z0-9]{20,30}$/;

type SpotifyTrack = {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string; images: Array<{ url: string; height: number }> };
};

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  await requireAuth("/diary/new");
  const { track: trackId } = await searchParams;

  let initialTrack: SpotifyTrack | null = null;
  if (trackId && ID_RE.test(trackId)) {
    try {
      initialTrack = await spotifyFetch<SpotifyTrack>(`/tracks/${trackId}`);
    } catch (e) {
      if (!(e instanceof SpotifyApiError)) throw e;
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ink">Nueva entrada</h1>
        <p className="mt-1 text-sm text-ink-soft">Captura un momento.</p>
      </header>
      <NewEntryForm initialTrack={initialTrack} />
    </main>
  );
}
