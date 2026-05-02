import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi } from "@/lib/auth-guard";
import {
  spotifyFetch,
  getUserSpotifyAccessToken,
  SpotifyApiError,
  SpotifyAuthError,
} from "@/lib/spotify";

/**
 * GET /api/me/spotify/top-tracks?range=short_term&limit=20
 *
 * Top tracks del user logueado. Requiere:
 *   - Sesión activa (Auth.js).
 *   - Spotify conectado (fila Account con provider=spotify).
 *
 * Ranges soportados (Spotify):
 *   - short_term  ≈ último mes
 *   - medium_term ≈ últimos 6 meses (default)
 *   - long_term   ≈ últimos años
 *
 * Sirve como smoke test del flow de refresh: si el access_token guardado
 * está vencido, getUserSpotifyAccessToken() lo refresca y actualiza la DB
 * antes de devolverlo.
 */

const querySchema = z.object({
  range: z.enum(["short_term", "medium_term", "long_term"]).default("medium_term"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: Request) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    range: searchParams.get("range") ?? "medium_term",
    limit: searchParams.get("limit") ?? "20",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const userToken = await getUserSpotifyAccessToken(session.user.id);
    const data = await spotifyFetch<unknown>("/me/top/tracks", {
      userAccessToken: userToken,
      params: { time_range: parsed.data.range, limit: parsed.data.limit },
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof SpotifyAuthError) {
      const code = err.code === "USER_NOT_CONNECTED" ? 400 : 401;
      return NextResponse.json(
        {
          error:
            err.code === "USER_NOT_CONNECTED"
              ? "Conecta tu Spotify primero"
              : "Tu Spotify expiró o se desconectó. Reconéctalo.",
          code: err.code,
        },
        { status: code },
      );
    }
    if (err instanceof SpotifyApiError) {
      return NextResponse.json(
        { error: "Spotify error", status: err.status },
        { status: 502 },
      );
    }
    throw err;
  }
}
