import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { EntryDetail } from "@/components/diary/entry-detail";

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
 * /u/[username]/[entryId] — vista PÚBLICA de un momento individual.
 *
 * Sin auth (entries con visibility=PUBLIC). URL compartible — usable para
 * pegar en redes sociales, mensajes, etc. Esta es la base del crecimiento
 * orgánico: cuando alguien comparte una entry, otros llegan al producto.
 *
 * 404 si la entry no existe, no es PUBLIC, o el username no coincide.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; entryId: string }>;
}): Promise<Metadata> {
  const { username, entryId } = await params;

  const entry = await prisma.entry.findFirst({
    where: {
      id: entryId,
      visibility: "PUBLIC",
      user: { username },
    },
    include: { user: { select: { displayName: true } } },
  });

  if (!entry || !isTrackSnapshot(entry.trackSnapshot)) {
    return { title: "Momento no encontrado" };
  }

  const artists = entry.trackSnapshot.artists.map((a) => a.name).join(", ");
  return {
    title: `${entry.trackSnapshot.name} · ${artists}`,
    description:
      entry.reflection ??
      `${entry.user.displayName} guardó este momento con ${entry.trackSnapshot.name}.`,
    openGraph: {
      title: `${entry.trackSnapshot.name} · ${artists}`,
      description: entry.reflection ?? undefined,
      images: entry.trackSnapshot.album.image
        ? [{ url: entry.trackSnapshot.album.image }]
        : undefined,
    },
  };
}

export default async function PublicEntryPage({
  params,
}: {
  params: Promise<{ username: string; entryId: string }>;
}) {
  const { username, entryId } = await params;

  const entry = await prisma.entry.findFirst({
    where: {
      id: entryId,
      visibility: "PUBLIC",
      user: { username },
    },
    include: {
      user: {
        select: { username: true, displayName: true },
      },
    },
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
      mode={{
        type: "public",
        author: { username: entry.user.username, displayName: entry.user.displayName },
      }}
    />
  );
}
