"use server";

import { signIn } from "@/auth";

/**
 * Inicia el flow OAuth de Spotify. Auth.js redirige al user a Spotify,
 * intercepta el callback, crea la fila Account vinculada al User logueado.
 */
export async function connectSpotifyAction() {
  await signIn("spotify", { redirectTo: "/" });
}
