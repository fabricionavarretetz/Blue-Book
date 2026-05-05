"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Server actions de follows. El modelo `Follow` con PK compuesta
 * (followerId, followeeId) ya existe en el schema desde Día 2.
 */

/**
 * Sigue al user con username dado. No-op si ya lo sigues (idempotente).
 * No puedes seguirte a ti mismo.
 */
export async function followAction(targetUsername: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  const target = await prisma.user.findUnique({
    where: { username: targetUsername },
    select: { id: true },
  });

  if (!target) {
    throw new Error("Usuario no encontrado");
  }
  if (target.id === session.user.id) {
    throw new Error("No puedes seguirte a ti mismo");
  }

  // upsert para idempotencia: si ya existe, no hace nada.
  await prisma.follow.upsert({
    where: {
      followerId_followeeId: {
        followerId: session.user.id,
        followeeId: target.id,
      },
    },
    create: {
      followerId: session.user.id,
      followeeId: target.id,
    },
    update: {}, // si ya existe, no actualiza nada
  });

  revalidatePath(`/u/${targetUsername}`);
  revalidatePath("/people");
}

/**
 * Deja de seguir al user con username dado. No-op si no lo sigues.
 */
export async function unfollowAction(targetUsername: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  const target = await prisma.user.findUnique({
    where: { username: targetUsername },
    select: { id: true },
  });

  if (!target) return; // no-op si target no existe

  // deleteMany para tolerar caso "no sigue" sin lanzar error.
  await prisma.follow.deleteMany({
    where: {
      followerId: session.user.id,
      followeeId: target.id,
    },
  });

  revalidatePath(`/u/${targetUsername}`);
  revalidatePath("/people");
}
