import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { EntryDetail } from "@/components/diary/entry-detail";
import { EntryMenu } from "../entry-menu";

type TrackSnapshot = {
  name: string;
  artists: Array<{ id?: string; name: string }>;
  album: { id?: string; name: string; image: string | null };
  externalUrl?: string | null;
};

function isTrackSnapshot(v: unknown): v is TrackSnapshot {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.name === "string" && Array.isArray(o.artists);
}

/**
 * /diary/[id] — vista de detalle privada del propio momento.
 * Solo accesible si la entry pertenece al user logueado.
 * Incluye menú "⋯" para Editar / Borrar.
 */
export default async function DiaryEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAuth(`/diary/${id}`);

  const entry = await prisma.entry.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!entry || !isTrackSnapshot(entry.trackSnapshot)) {
    notFound();
  }

  return (
    <EntryDetail
      entry={{
        id: entry.id,
        spotifyId: entry.spotifyId,
        reaction: entry.reaction,
        reflection: entry.reflection,
        moodTags: entry.moodTags,
        contextTags: entry.contextTags,
        createdAt: entry.createdAt,
        trackSnapshot: entry.trackSnapshot,
      }}
      mode={{ type: "private", menu: <EntryMenu entryId={entry.id} /> }}
    />
  );
}
