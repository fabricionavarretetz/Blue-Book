import "server-only";
import { prisma } from "@/lib/db";

/**
 * Agrega las reactions de una entry — agrupa por emoji con conteo, y devuelve
 * el emoji que el viewer (si está logueado) ya seleccionó (para resaltarlo
 * en la UI).
 */

export type AggregatedReactions = {
  /** Lista de emoji + count, ordenada por count desc. */
  byEmoji: Array<{ emoji: string; count: number }>;
  /** Total de reacciones. */
  total: number;
  /** Emoji que el viewer puso (si tiene), para resaltarlo. */
  myEmoji: string | null;
};

export async function getEntryReactions(
  entryId: string,
  viewerId?: string | null,
): Promise<AggregatedReactions> {
  const reactions = await prisma.entryReaction.findMany({
    where: { entryId },
    select: { emoji: true, userId: true },
  });

  const counts = new Map<string, number>();
  let myEmoji: string | null = null;
  for (const r of reactions) {
    counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
    if (viewerId && r.userId === viewerId) {
      myEmoji = r.emoji;
    }
  }

  const byEmoji = [...counts.entries()]
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count);

  return { byEmoji, total: reactions.length, myEmoji };
}
