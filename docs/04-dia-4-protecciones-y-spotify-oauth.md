# Día 4 — Protección de rutas y Spotify OAuth

**Fecha:** 2026-05-02
**Objetivo:** las rutas privadas (`/diary`) deben requerir sesión activa, los endpoints API protegidos deben devolver 401 si falta sesión, los users logueados deben poder vincular su Spotify, y el botón "Conectar Spotify" debe quedar funcional end-to-end.

---

## Contexto

Día 3 dejó auth funcional (login/register/sesión), pero todas las rutas eran públicas. Hoy montamos la capa de autorización: quién puede entrar dónde. También cerramos el loop de Spotify OAuth, que fue el subproblema más difícil del proyecto hasta ahora.

## Conceptos clave

### Middleware en Next.js

Código que se ejecuta **antes** del server component / API route, en el **edge runtime** (más rápido, más limitado: sin Node APIs ni librerías pesadas como Prisma o bcrypt).

Use case típico: verificar sesión y redirigir antes de que la petición consuma recursos del runtime principal.

```ts
// src/middleware.ts
export const middleware = ...;
export const config = { matcher: ["/((?!api|_next).*)"] };
```

El `matcher` define qué rutas activan el middleware. Sintaxis: regex con negative lookahead.

### Defensa en profundidad

Validar la sesión en **dos lugares**:
1. **Middleware** (rápido, edge) — primera barrera.
2. **Server component / API route** (runtime completo) — segunda barrera.

Si el middleware falla o se desactiva, la página/endpoint sigue protegida.

### `?from=` post-login redirect

Patrón estándar UX: si un user no autenticado intenta entrar a `/diary`, lo mandas a `/login?from=/diary`. Después del login, lo devuelves a `/diary` (no a la home).

Cuidado: validar que `from` sea path interno (`/...`) y no URL absoluta (`http://malicious.com/...`). Si no, abres un **open redirect** (vector de phishing).

### Cursor-based pagination

Para listas que cambian (feeds, diary), paginar con `cursor=<id>` en vez de `offset=<n>`. Razón: con offset, si alguien mete un item nuevo, los items se duplican o se saltan entre páginas. Con cursor, el orden es estable.

```ts
prisma.entry.findMany({
  take: limit + 1,                     // pedir uno extra para saber si hay más
  ...(cursor && { cursor: { id: cursor }, skip: 1 }),
});
```

### OAuth 2.1 + Spotify + loopback IP

Desde 2024, Spotify (siguiendo OAuth 2.1) **NO acepta `http://localhost` como Redirect URI** — solo loopback IP literal (`http://127.0.0.1:...` o `http://[::1]:...`) o HTTPS. Esto obliga a acceder a la app en desarrollo desde `http://127.0.0.1:3000`, no `http://localhost:3000`.

### `redirectProxyUrl` en Auth.js

Opción del provider OAuth para **forzar** la redirect_uri exacta enviada al provider externo, independiente del host del request. Útil cuando:
- Hay proxies que cambian el host.
- El servidor Node se identifica como `localhost` aunque el cliente venga por `127.0.0.1`.

**Trampa**: debe terminar en `/api/auth`, NO en `/api/auth/callback/<provider>`. Auth.js anexa `/callback/<provider>` automáticamente.

## Lo que hicimos paso a paso

### 1. Activar `callbacks.authorized` en `auth.config.ts`

Definí dos listas:

```ts
const PROTECTED_PATHS = ["/diary", "/profile", "/settings"];
const AUTH_PATHS = ["/login", "/register"];
```

Y en el callback:

```ts
authorized({ auth, request: { nextUrl } }) {
  const isLoggedIn = !!auth?.user;
  const { pathname } = nextUrl;

  if (PROTECTED_PATHS.some(p => pathname.startsWith(p)) && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("from", pathname + nextUrl.search);
    return Response.redirect(loginUrl);
  }

  if (AUTH_PATHS.some(p => pathname.startsWith(p)) && isLoggedIn) {
    return Response.redirect(new URL("/", nextUrl));
  }

  return true;
}
```

### 2. Crear `src/middleware.ts`

```ts
import NextAuth from "next-auth";
import authConfig from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
```

Importante: el middleware usa SOLO `authConfig` (edge-safe), NO el `auth` completo de `@/auth` (que importa Prisma + bcrypt).

El matcher excluye:
- `/api/*` — los endpoints API hacen su propia validación con `auth()`.
- `/_next/static`, `/_next/image` — assets de Next.
- `favicon.ico` y archivos estáticos (`.*\\..*`).

### 3. Helpers `requireAuth` y `requireAuthApi`

`src/lib/auth-guard.ts`:

```ts
import "server-only";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function requireAuth(currentPath?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    const params = new URLSearchParams();
    if (currentPath) params.set("from", currentPath);
    redirect(`/login${params.size ? `?${params}` : ""}`);
  }
  return session;
}

export async function requireAuthApi() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      session: null,
      error: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }
  return { session, error: null };
}
```

### 4. Página protegida `/diary`

```tsx
// src/app/diary/page.tsx
export default async function DiaryPage() {
  const session = await requireAuth("/diary");

  const entries = await prisma.entry.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // ...renderiza lista o estado vacío
}
```

### 5. Endpoint protegido `GET /api/diary`

Con cursor-based pagination:

```ts
export async function GET(request: Request) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 50);

  const entries = await prisma.entry.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = entries.length > limit;
  return NextResponse.json({
    entries: hasMore ? entries.slice(0, limit) : entries,
    nextCursor: hasMore ? entries[limit - 1].id : null,
  });
}
```

### 6. Soporte de `?from=` en login

Schema zod actualizado y server action:

```ts
const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
  from: z.string().optional(),
});

function safeRedirectTo(from: string | undefined): string {
  if (!from) return "/";
  if (!from.startsWith("/") || from.startsWith("//")) return "/";
  return from;
}
```

`safeRedirectTo` previene **open redirects**. Si `from` no empieza con `/` o empieza con `//` (que el browser interpreta como otro dominio), lo descartamos.

`LoginForm` recibe el `from` como prop y lo mete como `<input type="hidden">`.

### 7. Botón "Conectar Spotify"

`src/lib/actions/spotify.ts`:
```ts
"use server";
import { signIn } from "@/auth";

export async function connectSpotifyAction() {
  await signIn("spotify", { redirectTo: "/" });
}
```

Home page consulta si el user tiene `Account` con `provider="spotify"`, y muestra:
- Botón "Conectar Spotify" si NO conectado.
- "Spotify conectado" en verde si SÍ.

## Problemas y soluciones (Spotify OAuth)

Esta fue la parte más difícil. Documentado para no repetir.

### Problema 1: `Invalid URL` al iniciar el flow

**Síntoma:** click en "Conectar Spotify" → `Server error`. Log: `TypeError: Invalid URL at getAuthorizationUrl`.

**Causa:** override de `authorization` en el provider con objeto:
```ts
authorization: { params: { scope: SPOTIFY_SCOPES } }
```
reemplaza el objeto completo del default, perdiendo la URL base.

**Solución:** usar string format del default:
```ts
authorization: `https://accounts.spotify.com/authorize?scope=${encodeURIComponent(SPOTIFY_SCOPES)}`
```

### Problema 2: Spotify rechaza `http://localhost`

**Síntoma:** al añadir `http://localhost:3000/api/auth/callback/spotify` en el dashboard, Spotify dice "This redirect URI is not secure".

**Causa:** desde 2024 Spotify (OAuth 2.1) solo acepta loopback IP literal o HTTPS.

**Solución:** registrar `http://127.0.0.1:3000/api/auth/callback/spotify` y acceder a la app local desde `http://127.0.0.1:3000`.

### Problema 3: `Invalid redirect URI` en token exchange

**Síntoma:** llega al consent screen de Spotify, el user da Aceptar, vuelve al app y `Server error`. Log: `invalid_grant: Invalid redirect URI`.

**Diagnóstico:** insertar un fetch interceptor temporal en `src/auth.ts` para capturar el body que Auth.js envía a `/api/token`:

```ts
const origFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  if (url.includes("accounts.spotify.com/api/token")) {
    console.log("[DEBUG]", init?.body?.toString());
  }
  return origFetch(input, init);
};
```

Reveló que Auth.js enviaba `redirect_uri=http://localhost:3000/...` aunque el user accedía por `127.0.0.1`. Auth.js construye la redirect_uri basándose en el host del request actual; Node.js puede normalizar IPs loopback a `localhost` internamente.

**Solución parcial:** setear en `.env`:
```
AUTH_URL=http://127.0.0.1:3000
AUTH_TRUST_HOST=true
```

Y añadir `redirectProxyUrl` en el provider:
```ts
Spotify({
  ...,
  redirectProxyUrl: `${process.env.AUTH_URL}/api/auth`,
})
```

`redirectProxyUrl` fuerza la redirect_uri exacta independiente del host del request.

### Problema 4: redirect_uri duplicada

**Síntoma:** después de aplicar `redirectProxyUrl`, sigue el error pero ahora la URL es:
```
http://127.0.0.1:3000/api/auth/callback/spotify/callback/spotify
```

**Causa:** puse `redirectProxyUrl: ${AUTH_URL}/api/auth/callback/spotify`. Auth.js anexa automáticamente `/callback/<provider>` a la URL → quedó duplicado.

**Solución:** `redirectProxyUrl` debe terminar en `/api/auth`:
```ts
redirectProxyUrl: `${process.env.AUTH_URL}/api/auth`,
```

Auth.js completa con `/callback/spotify` para llegar a la URL final correcta.

## Estado final del Día 4

### Archivos nuevos

```
src/
├── middleware.ts                  # protección de rutas en edge
├── lib/
│   ├── auth-guard.ts              # requireAuth + requireAuthApi
│   └── actions/
│       └── spotify.ts             # connectSpotifyAction
├── app/
│   ├── diary/
│   │   └── page.tsx               # página protegida (placeholder)
│   └── api/
│       └── diary/
│           └── route.ts           # GET /api/diary (cursor-paginated)
```

### Archivos modificados

- `src/auth.config.ts` — `callbacks.authorized` con lógica de redirect.
- `src/auth.ts` — provider Spotify con `redirectProxyUrl`.
- `src/app/(auth)/login/page.tsx` y `login-form.tsx` — soporte `?from=`.
- `src/app/page.tsx` — botón "Conectar Spotify" + estado conectado.
- `src/lib/actions/auth.ts` — `safeRedirectTo` + uso en loginAction.
- `.env` y `.env.example` — `AUTH_URL` y `AUTH_TRUST_HOST`.
- `docs/03-dia-3-autenticacion.md` — nota sobre OAuth 2.1 / loopback IP.

### Variables de entorno añadidas

```
AUTH_URL=http://127.0.0.1:3000
AUTH_TRUST_HOST=true
```

### Funcional end-to-end

- `GET /diary` sin sesión → 302 a `/login?from=/diary`.
- `GET /api/diary` sin sesión → 401 con `{"error":"No autorizado"}`.
- Flow completo: `/diary` → `/login?from=/diary` → autenticarse → vuelve a `/diary`.
- Flow Spotify: home → "Conectar Spotify" → consent screen → Aceptar → home con "Spotify conectado".
- `Account` con `provider="spotify"` queda guardada en DB con `access_token` + `refresh_token`.

## Lecciones técnicas (no obvias)

1. **Middleware de Next.js corre en edge** — no se puede importar Prisma/bcrypt allí. Por eso Auth.js v5 separa `auth.config.ts` (edge-safe) de `auth.ts` (runtime completo).

2. **`Response.redirect()` desde el callback `authorized`** es válido y Next.js lo procesa. Alternativa: retornar `false` y dejar que Auth.js redirija a la `signIn` page configurada.

3. **OAuth 2.1 prohíbe `localhost`**. Spotify, Google, etc., están migrando a esta regla. Usar siempre `127.0.0.1` o HTTPS en dev.

4. **`redirectProxyUrl` termina en `/api/auth`**, no en la ruta completa del callback. Es la trampa más sutil del Día 4.

5. **Open redirect prevention** en post-login redirect — siempre validar que el destino sea path interno antes de pasar a `signIn({ redirectTo })`.

## Pendientes (van a Día 5)

- Spotify proxy: `/api/search`, `/api/tracks/:id` con caché para evitar rate limits.
- Refresh automático del `access_token` de Spotify cuando expira.
- Empezar a usar el token guardado: leer top tracks, recently played.
