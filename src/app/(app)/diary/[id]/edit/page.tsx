import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { EditEntryForm } from "./edit-entry-form";

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

/**
 * /diary/[id]/edit — pantalla de edición de un momento.
 * Solo accesible si la entry pertenece al user logueado.
 */
export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAuth(`/diary/${id}/edit`);

  const entry = await prisma.entry.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!entry || !isTrackSnapshot(entry.trackSnapshot)) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ink">Editar momento</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Puedes editar el emoji, los tags y la reseña. La canción no se puede cambiar.
        </p>
      </header>

      <EditEntryForm
        entry={{
          id: entry.id,
          spotifyId: entry.spotifyId,
          reaction: entry.reaction,
          reflection: entry.reflection,
          moodTags: entry.moodTags,
          contextTags: entry.contextTags,
          trackSnapshot: entry.trackSnapshot,
        }}
      />
    </main>
  );
}
