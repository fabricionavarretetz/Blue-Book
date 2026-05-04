"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { spotifyFetch, SpotifyApiError } from "@/lib/spotify";

/**
 * Server actions de entries (momentos del diario).
 *
 * Convención del producto:
 *  - El cliente envía spotifyId + reaction + (opcional) tags y reflection.
 *  - El SERVIDOR busca la metadata del track en Spotify y construye el
 *    `trackSnapshot`. Nunca confiamos en lo que mande el cliente para
 *    snapshot — solo confiamos en spotifyId.
 *  - Errores de validación se devuelven como AuthFormState style; éxito
 *    redirige a /diary.
 */

const ID_RE = /^[A-Za-z0-9]{20,30}$/;

const createSchema = z.object({
  spotifyId: z.string().regex(ID_RE, "ID de Spotify inválido"),
  reaction: z.string().min(1, "Elige un emoji").max(8),
  reflection: z.string().max(2000).optional().or(z.literal("")),
  moodTags: z.array(z.string().min(1).max(40)).max(10).default([]),
  contextTags: z.array(z.string().min(1).max(40)).max(10).default([]),
});

export type CreateEntryState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

type SpotifyTrack = {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: { id: string; name: string; images: Array<{ url: string; width: number }> };
  duration_ms: number;
  external_urls?: { spotify?: string };
  external_ids?: { isrc?: string };
};

export async function createEntryAction(
  _prev: CreateEntryState | undefined,
  formData: FormData,
): Promise<CreateEntryState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "No autorizado" };
  }

  // FormData no soporta arrays nativos — los serializamos como JSON string
  // desde el cliente.
  const moodRaw = formData.get("moodTags");
  const ctxRaw = formData.get("contextTags");
  const moodTags = parseStringArray(moodRaw);
  const contextTags = parseStringArray(ctxRaw);

  const parsed = createSchema.safeParse({
    spotifyId: formData.get("spotifyId"),
    reaction: formData.get("reaction"),
    reflection: formData.get("reflection") || undefined,
    moodTags,
    contextTags,
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Snapshot autoritativo: pegamos a Spotify para garantizar metadata real.
  let snapshot;
  try {
    const track = await spotifyFetch<SpotifyTrack>(`/tracks/${parsed.data.spotifyId}`);
    snapshot = {
      name: track.name,
      artists: track.artists.map((a) => ({ id: a.id, name: a.name })),
      album: {
        id: track.album.id,
        name: track.album.name,
        image: track.album.images?.[0]?.url ?? null,
      },
      durationMs: track.duration_ms,
      isrc: track.external_ids?.isrc ?? null,
      externalUrl: track.external_urls?.spotify ?? null,
    };
  } catch (err) {
    if (err instanceof SpotifyApiError && err.status === 404) {
      return { ok: false, error: "Esa canción no existe en Spotify" };
    }
    return { ok: false, error: "No pudimos verificar la canción. Intenta de nuevo." };
  }

  // Crear entry. Si el user tiene visibility default distinto en su perfil,
  // se aplicaría aquí — por ahora todas son PUBLIC.
  await prisma.entry.create({
    data: {
      userId: session.user.id,
      spotifyId: parsed.data.spotifyId,
      trackSnapshot: snapshot,
      reaction: parsed.data.reaction,
      reflection: parsed.data.reflection || null,
      moodTags: parsed.data.moodTags,
      contextTags: parsed.data.contextTags,
    },
  });

  // Refresh de la lista de /diary
  revalidatePath("/diary");
  redirect("/diary");
}

/** Parsea un FormDataEntryValue que puede ser JSON array string o csv. */
function parseStringArray(raw: FormDataEntryValue | null): string[] {
  if (!raw) return [];
  const s = raw.toString().trim();
  if (!s) return [];
  // Aceptamos JSON array o coma-separado
  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string" && x);
    } catch {
      // fallthrough a split coma
    }
  }
  return s
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Borra una entry del usuario. Devuelve a /diary tras éxito.
 */
export async function deleteEntryAction(entryId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  // Solo borra si la entry pertenece al user — protección de objetos ajenos.
  const result = await prisma.entry.deleteMany({
    where: { id: entryId, userId: session.user.id },
  });

  if (result.count === 0) {
    throw new Error("Entry no encontrada o sin permiso");
  }

  revalidatePath("/diary");
}
