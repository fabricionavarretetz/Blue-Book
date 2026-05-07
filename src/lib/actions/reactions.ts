"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Server actions de reactions sobre entries de OTROS users.
 *
 * Modelo: EntryReaction tiene @@unique([entryId, userId]) — un user puede
 * tener UNA reacción por entry. Cambiar de emoji = upsert. Quitar = delete.
 *
 * Reglas:
 *   - No puedes reaccionar a tu propia entry.
 *   - Solo entries con visibility=PUBLIC son reaccionables (FOLLOWERS/PRIVATE
 *     no aceptan reacciones de externos para MVP).
 */

const REACTION_EMOJIS = ["🫶", "🥹", "✨", "🔥", "😭", "🌙"] as const;
type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

const reactionSchema = z.object({
  entryId: z.string().min(1),
  emoji: z.string().refine((v) => (REACTION_EMOJIS as readonly string[]).includes(v), {
    message: "Emoji no permitido",
  }),
});

export type ReactionState = { ok: boolean; error?: string };

export async function addReactionAction(
  entryId: string,
  emoji: string,
): Promise<ReactionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "No autorizado" };
  }

  const parsed = reactionSchema.safeParse({ entryId, emoji });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  // Verificar entry existe, es PUBLIC, y no es del propio user.
  const entry = await prisma.entry.findUnique({
    where: { id: parsed.data.entryId },
    select: {
      userId: true,
      visibility: true,
      user: { select: { username: true } },
    },
  });
  if (!entry) return { ok: false, error: "Entry no encontrada" };
  if (entry.userId === session.user.id) {
    return { ok: false, error: "No puedes reaccionar a tu propia entry" };
  }
  if (entry.visibility !== "PUBLIC") {
    return { ok: false, error: "Esta entry no acepta reacciones" };
  }

  // Upsert — si ya reaccionaste, cambia el emoji.
  await prisma.entryReaction.upsert({
    where: {
      entryId_userId: {
        entryId: parsed.data.entryId,
        userId: session.user.id,
      },
    },
    create: {
      entryId: parsed.data.entryId,
      userId: session.user.id,
      emoji: parsed.data.emoji,
    },
    update: {
      emoji: parsed.data.emoji,
    },
  });

  revalidatePath(`/u/${entry.user.username}/${parsed.data.entryId}`);
  return { ok: true };
}

export async function removeReactionAction(entryId: string): Promise<ReactionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "No autorizado" };
  }

  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    select: { user: { select: { username: true } } },
  });

  // deleteMany para tolerar caso "no había reaccionado".
  await prisma.entryReaction.deleteMany({
    where: { entryId, userId: session.user.id },
  });

  if (entry) revalidatePath(`/u/${entry.user.username}/${entryId}`);
  return { ok: true };
}
