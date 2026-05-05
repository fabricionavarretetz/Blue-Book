import "server-only";
import { prisma } from "@/lib/db";

/**
 * Stats agregadas del perfil de un usuario.
 * Calculadas en SQL/Prisma; no requiere caché en MVP (pocos entries por user).
 */

export type ProfileStats = {
  totalEntries: number;
  topMood: { tag: string; count: number } | null;
  topArtist: { name: string; count: number } | null;
  lastEntryAt: Date | null;
};

type ArtistRef = { name?: unknown };
type SnapshotShape = { artists?: ArtistRef[] };

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  // Consulta plana de todas las entries del user — para MVP suficiente.
  const entries = await prisma.entry.findMany({
    where: { userId },
    select: {
      moodTags: true,
      trackSnapshot: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 1000, // tope defensivo
  });

  if (entries.length === 0) {
    return { totalEntries: 0, topMood: null, topArtist: null, lastEntryAt: null };
  }

  // Top mood
  const moodCount = new Map<string, number>();
  for (const e of entries) {
    for (const m of e.moodTags) {
      moodCount.set(m, (moodCount.get(m) ?? 0) + 1);
    }
  }
  const topMoodEntry = [...moodCount.entries()].sort((a, b) => b[1] - a[1])[0];

  // Top artist
  const artistCount = new Map<string, number>();
  for (const e of entries) {
    const snap = e.trackSnapshot as SnapshotShape | null;
    if (!snap?.artists) continue;
    for (const a of snap.artists) {
      const name = typeof a.name === "string" ? a.name : null;
      if (name) artistCount.set(name, (artistCount.get(name) ?? 0) + 1);
    }
  }
  const topArtistEntry = [...artistCount.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    totalEntries: entries.length,
    topMood: topMoodEntry ? { tag: topMoodEntry[0], count: topMoodEntry[1] } : null,
    topArtist: topArtistEntry ? { name: topArtistEntry[0], count: topArtistEntry[1] } : null,
    lastEntryAt: entries[0].createdAt,
  };
}
