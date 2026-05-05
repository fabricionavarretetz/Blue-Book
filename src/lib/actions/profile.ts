"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Server actions de perfil.
 *
 * Editable: displayName, bio, avatarUrl, username.
 * NOT editable: email (sería re-verificación), passwordHash (cambio de password
 * va en una action separada cuando lo implementemos).
 */

const profileSchema = z.object({
  displayName: z.string().min(1, "Requerido").max(50),
  bio: z.string().max(160, "Máximo 160 caracteres").optional().or(z.literal("")),
  avatarUrl: z.string().url("URL inválida").max(500).optional().or(z.literal("")),
  username: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(20, "Máximo 20")
    .regex(/^[a-z0-9_]+$/, "Solo minúsculas, números y guion bajo"),
});

export type ProfileFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function updateProfileAction(
  _prev: ProfileFormState | undefined,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "No autorizado" };
  }

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio") || undefined,
    avatarUrl: formData.get("avatarUrl") || undefined,
    username: formData.get("username"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Si el username cambió, verificar que no esté tomado por otro user.
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });

  if (currentUser?.username !== parsed.data.username) {
    const taken = await prisma.user.findFirst({
      where: { username: parsed.data.username, NOT: { id: session.user.id } },
      select: { id: true },
    });
    if (taken) {
      return { ok: false, error: "Ese username ya está tomado." };
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      displayName: parsed.data.displayName,
      username: parsed.data.username,
      bio: parsed.data.bio || null,
      avatarUrl: parsed.data.avatarUrl || null,
    },
  });

  // Revalidar páginas que muestran datos del user.
  revalidatePath("/profile");
  revalidatePath("/diary");
  revalidatePath(`/u/${parsed.data.username}`);

  return { ok: true };
}
