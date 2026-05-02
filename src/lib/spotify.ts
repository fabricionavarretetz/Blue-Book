import "server-only";
import { prisma } from "@/lib/db";
import { TtlCache } from "@/lib/cache";

/**
 * Cliente para la Spotify Web API.
 *
 * Dos modos de autenticación:
 * 1. **Client Credentials** — token de la app, sin user. Para búsqueda y
 *    catálogo público. Se cachea en memoria, dura 1h, lo refrescamos antes.
 * 2. **Token de usuario** — el `access_token` que Spotify devolvió al
 *    conectar la cuenta del user. Vive en `Account.access_token` y expira
 *    en 1h. Lo refrescamos con `Account.refresh_token` cuando hace falta.
 */

const SPOTIFY_API = "https://api.spotify.com/v1";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

// ============================================================================
//  Client Credentials flow
// ============================================================================

let clientToken: { value: string; expiresAt: number } | null = null;

export async function getClientCredentialsToken(): Promise<string> {
  if (clientToken && clientToken.expiresAt > Date.now() + 60_000) {
    return clientToken.value;
  }

  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("Faltan SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET en el entorno");
  }

  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const r = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) {
    throw new Error(`Spotify client_credentials: HTTP ${r.status}`);
  }
  const data = (await r.json()) as { access_token: string; expires_in: number };

  clientToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return clientToken.value;
}

// ============================================================================
//  User token (con refresh automático)
// ============================================================================

/**
 * Devuelve un access_token válido del user para hacer llamadas a Spotify.
 * Si el token guardado en `Account` está por expirar (<5 min), lo refresca
 * usando el `refresh_token` y actualiza la fila en DB.
 *
 * Lanza error si el user no tiene Spotify conectado o si Spotify rechaza
 * el refresh (ej. el user revocó el acceso desde su cuenta).
 */
export async function getUserSpotifyAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "spotify" },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  });

  if (!account || !account.access_token || !account.refresh_token) {
    throw new SpotifyAuthError("USER_NOT_CONNECTED");
  }

  const expiresAt = account.expires_at ?? 0;
  const nowSec = Math.floor(Date.now() / 1000);
  const stillValid = expiresAt - nowSec > 300; // 5 min de margen

  if (stillValid) {
    return account.access_token;
  }

  // Refrescar
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("Faltan SPOTIFY_CLIENT_ID o SPOTIFY_CLIENT_SECRET en el entorno");
  }
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");

  const r = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });

  if (!r.ok) {
    // Si Spotify rechaza el refresh (token revocado, etc.), señalizamos para
    // que el caller pueda pedir al user que reconecte.
    throw new SpotifyAuthError("REFRESH_FAILED");
  }

  const data = (await r.json()) as {
    access_token: string;
    expires_in: number;
    // Spotify puede devolver un nuevo refresh_token, pero usualmente NO.
    refresh_token?: string;
    scope?: string;
  };

  const newExpiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: data.access_token,
      expires_at: newExpiresAt,
      ...(data.refresh_token && { refresh_token: data.refresh_token }),
      ...(data.scope && { scope: data.scope }),
    },
  });

  return data.access_token;
}

export class SpotifyAuthError extends Error {
  constructor(public readonly code: "USER_NOT_CONNECTED" | "REFRESH_FAILED") {
    super(code);
    this.name = "SpotifyAuthError";
  }
}

// ============================================================================
//  Wrapper de fetch
// ============================================================================

type SpotifyFetchOptions = {
  /** Si se omite, usa Client Credentials. */
  userAccessToken?: string;
  /** Query string params. */
  params?: Record<string, string | number | undefined>;
};

export async function spotifyFetch<T>(
  path: string,
  opts: SpotifyFetchOptions = {},
): Promise<T> {
  const token = opts.userAccessToken ?? (await getClientCredentialsToken());

  const url = new URL(`${SPOTIFY_API}${path}`);
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new SpotifyApiError(r.status, text || `HTTP ${r.status}`);
  }
  return (await r.json()) as T;
}

export class SpotifyApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "SpotifyApiError";
  }
}

// ============================================================================
//  Cache compartido para resultados (search, tracks)
// ============================================================================

export const spotifyCache = new TtlCache<string, unknown>(5 * 60_000); // 5 min default
