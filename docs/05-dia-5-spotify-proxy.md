# Día 5 — Proxy a la Spotify API

**Fecha:** 2026-05-02
**Objetivo:** la app debe poder buscar canciones, leer detalles de un track y obtener datos del user en Spotify (top tracks). Todo con caché para evitar rate limits y refresh automático del token de usuario cuando expire.

---

## Contexto

Día 4 dejó al user vinculando su Spotify y guardando `access_token` + `refresh_token` en la tabla `Account`. Pero esos tokens no se usaban para nada todavía. Hoy montamos la capa que **habla con Spotify** desde el server:

- Búsqueda de canciones (necesario para que el user encuentre qué loggear).
- Detalles de un track (cuando vea info antes de loggear).
- Datos personales del user (top tracks → para sugerencias y stats).

## Conceptos clave

### Spotify Web API: dos modos de auth

Spotify expone dos flujos OAuth, y como cliente de la API usamos los dos según el caso:

1. **Client Credentials** — token de la **aplicación** (no de un user). Sirve para endpoints públicos: search, info de tracks/albums/artists. **No tiene acceso a datos personales**. Se obtiene mandando `client_id:client_secret` codificado en base64. Vale 1h.

2. **Authorization Code** (lo que hicimos en Día 4) — token de un **user específico**, autorizado por él. Sirve para `/me/...` (top tracks, recently played, playlists). Vale 1h pero viene con un `refresh_token` para renovarlo sin pedir consent de nuevo.

Regla práctica: usamos el menor privilegio posible. Búsqueda anónima → Client Credentials. Datos del user → user token.

### TTL cache

"Time to live": un valor cacheado expira automáticamente después de X tiempo. En vez de recordar "¿cuándo lo metí?" y compararlo manualmente, el cache mismo se encarga.

Patrón estándar:
```ts
const cache = new TtlCache(60_000); // 1 min default
const data = await cache.getOrSet("key", () => expensiveFetch());
```

`getOrSet` devuelve el valor cacheado si existe y no expiró; si no, llama `factory`, cachea el resultado y lo devuelve. Atómico desde el punto de vista del caller.

### Refresh de access token

OAuth `access_token` típicamente vive 1 hora. Cuando expira, **no** hay que mandar al user a re-autenticar — para eso existe el `refresh_token`. Patrón:

```ts
POST https://accounts.spotify.com/api/token
  Authorization: Basic <base64(client_id:client_secret)>
  body: grant_type=refresh_token&refresh_token=<old refresh_token>
→ devuelve { access_token, expires_in, [refresh_token] }
```

Detalle: Spotify **a veces** devuelve un `refresh_token` nuevo. Si lo hace, hay que persistirlo (el viejo puede invalidarse). Si no lo devuelve, el viejo sigue siendo válido.

### Decisión: refresh server-side, no en JWT callback

Auth.js v5 con strategy `"jwt"` permite refrescar tokens dentro del callback `jwt({ token })`. **Pero**: ese callback corre en cada request, y como vivimos con strategy JWT, los cambios al token solo viven en la cookie del cliente, no en DB. Si el `Account` en DB queda con `access_token` vencido, los próximos refreshes fallarían.

Approach que tomamos: **una función server-side `getUserSpotifyAccessToken(userId)`** que cada endpoint llama antes de pegarle a Spotify. Lee `Account`, refresca si hace falta, **persiste a DB**, devuelve token válido. Lazy y consistente con el storage real.

### Cursor de errores: SpotifyAuthError vs SpotifyApiError

Diferenciar:
- **SpotifyAuthError** — el problema está en la autenticación del user (no conectó su Spotify, o lo desconectó desde su cuenta). UX: pedirle reconectar.
- **SpotifyApiError** — Spotify respondió con HTTP error (404, 502, 429 rate limit). UX: error técnico, retry o avisar.

Tener clases separadas evita el caller tener que parsear strings de error.

## Lo que hicimos paso a paso

### 1. `src/lib/cache.ts` — TtlCache genérico

Clase con tres métodos: `get`, `set` (con TTL opcional), `getOrSet` (atómico). Cada entrada tiene su propio `expiresAt`. `prune()` para limpiar expirados (opcional, llamar periódicamente si crece mucho).

Decisión: in-memory, no persistente. Para MVP en una sola instancia es óptimo. En producción serverless multi-instancia, cada lambda tiene su cache aislado — no es problema porque las entradas son inmutables y compartibles entre users (no son data específica de un user).

### 2. `src/lib/spotify.ts` — cliente centralizado

#### Client Credentials con cache singleton

```ts
let clientToken: { value: string; expiresAt: number } | null = null;

export async function getClientCredentialsToken(): Promise<string> {
  if (clientToken && clientToken.expiresAt > Date.now() + 60_000) {
    return clientToken.value;
  }
  // ... POST a /api/token con Basic auth
  clientToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return clientToken.value;
}
```

El `+ 60_000` es un margen: renovamos cuando queda 1 min de vida, antes de que expire.

#### User token con refresh

```ts
export async function getUserSpotifyAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "spotify" },
    select: { id, access_token, refresh_token, expires_at },
  });
  if (!account || !account.access_token || !account.refresh_token) {
    throw new SpotifyAuthError("USER_NOT_CONNECTED");
  }

  const stillValid = (account.expires_at ?? 0) - Math.floor(Date.now() / 1000) > 300; // 5min margen
  if (stillValid) return account.access_token;

  // ... POST a /api/token con grant_type=refresh_token
  // Spotify puede devolver un nuevo refresh_token; si lo hace, lo guardamos.
  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: data.access_token,
      expires_at: newExpiresAt,
      ...(data.refresh_token && { refresh_token: data.refresh_token }),
    },
  });
  return data.access_token;
}
```

#### `spotifyFetch<T>()` wrapper

```ts
export async function spotifyFetch<T>(path, opts) {
  const token = opts.userAccessToken ?? (await getClientCredentialsToken());
  const url = new URL(`${SPOTIFY_API}${path}`);
  // ... aplica params si vienen
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new SpotifyApiError(r.status, await r.text());
  return await r.json() as T;
}
```

Si pasas `userAccessToken`, usa ese (modo user). Si no, usa Client Credentials. Tipos genéricos para que el endpoint dicte la forma del response.

### 3. `GET /api/search`

Query schema con zod:
```ts
const querySchema = z.object({
  q: z.string().min(1).max(100),
  type: z.enum(["track", "album", "artist"]).default("track"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
```

Cache key: `search:${type}:${limit}:${q.toLowerCase()}`. TTL: 5 min (default del cache).

Manejo de errores: si `SpotifyApiError`, devolvemos 502 con status original. Otros errores se propagan (Next.js 500).

### 4. `GET /api/tracks/[id]`

Validación del param: regex base62 (caracteres alfanuméricos, 20-30 chars). Spotify ids son consistentemente de esta forma.

Cache: 10 min (la metadata cambia poco). Si Spotify devuelve 404, lo propagamos como 404 (no 502).

### 5. `GET /api/me/spotify/top-tracks` (smoke test del flow user)

```ts
const { session, error } = await requireAuthApi();
if (error) return error;

const userToken = await getUserSpotifyAccessToken(session.user.id);
const data = await spotifyFetch("/me/top/tracks", {
  userAccessToken: userToken,
  params: { time_range: "medium_term", limit: 20 },
});
return NextResponse.json(data);
```

Manejo de errores con códigos diferenciados:
- `SpotifyAuthError("USER_NOT_CONNECTED")` → 400 con mensaje "Conecta tu Spotify primero".
- `SpotifyAuthError("REFRESH_FAILED")` → 401 con mensaje "Reconéctalo".
- `SpotifyApiError` → 502.

Ranges válidos (Spotify):
- `short_term` ≈ último mes
- `medium_term` ≈ últimos 6 meses (default)
- `long_term` ≈ últimos años

## Smoke tests ejecutados

Con dev server en `http://127.0.0.1:3000`:

| Endpoint | Query | Resultado | OK? |
|---|---|---|---|
| `/api/search` | `q=mitski&limit=2` | JSON con tracks de Mitski | ✓ |
| `/api/search` | sin `q` | 400 `{"error":"Parámetros inválidos","details":{"q":["q requerido"]}}` | ✓ |
| `/api/tracks/<id>` | id real de Spotify | JSON con metadata completa del track | ✓ |
| `/api/tracks/foo` | id inválido | 400 `{"error":"Track id inválido"}` | ✓ |
| `/api/me/spotify/top-tracks` | sin sesión | 401 `{"error":"No autorizado"}` | ✓ |
| `/api/me/spotify/top-tracks` | con sesión + Spotify conectado | JSON real con tus top tracks (Tom Misch, Sade, Kendrick, etc.) | ✓ |

## Estado final del Día 5

### Archivos nuevos

```
src/
├── lib/
│   ├── cache.ts                   # TtlCache genérico
│   └── spotify.ts                 # cliente Spotify (CC + user token + fetch)
└── app/api/
    ├── search/route.ts            # GET búsqueda
    ├── tracks/[id]/route.ts       # GET detalle de track
    └── me/spotify/top-tracks/
        └── route.ts               # GET top tracks del user
```

### Funcional end-to-end

- Búsqueda de canciones con cache.
- Detalle de un track con cache.
- Top tracks personales con refresh automático del token.
- Errores tipados y mapeados a HTTP codes razonables.

## Lecciones técnicas (no obvias)

1. **Margen de expiración**: nunca renovar exactamente cuando expira el token — siempre con margen (60s para Client Credentials, 5 min para user). Evita race conditions con clock drift y latencia de red.

2. **Spotify a veces refresca el `refresh_token` también** en la respuesta del refresh. Si lo hace, hay que persistirlo. Si no, el viejo sigue siendo válido. Asumir que viene **siempre** rompería las cuentas.

3. **In-memory cache funciona perfecto en serverless** mientras los datos sean compartibles entre users. Para datos específicos de un user (top tracks), el cache no debe estar en memoria global o se comparten datos entre users — por eso `/api/me/...` no se cachea aquí.

4. **Errores tipados (SpotifyAuthError vs SpotifyApiError)** > strings. El caller mapea a UX con un `instanceof`, no parseando mensajes.

5. **Strategy `"jwt"` y refresh de tokens**: la lógica de refresh debe vivir donde el storage real está (DB), no en el JWT callback. Auth.js v5 con strategy JWT no escribe a DB en cada request, así que confiar en eso para refresh es frágil.

## Pendientes (van a Día 6)

- Despliegue inicial en Vercel.
- Configurar variables de entorno en Vercel (todo lo del `.env`).
- Configurar URI de producción en Spotify Developer dashboard (con HTTPS).
- Conectar la DB Supabase desde el deploy de producción.
- Smoke test post-deploy.
