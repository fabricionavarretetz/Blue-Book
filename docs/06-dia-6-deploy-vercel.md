# Día 6 — Deploy en Vercel

**Fecha:** 2026-05-02
**Objetivo:** desplegar Blue Book a Vercel en producción con DB Supabase conectada y todos los endpoints respondiendo correctamente. Decisión consciente: Spotify OAuth queda **deshabilitado** en prod hasta más cerca de la beta (cuando se justifique configurar URI HTTPS); pero la búsqueda con Client Credentials sí queda funcional.

---

## Contexto

Después de cerrar Día 5 (Spotify proxy completo en local), surgió la pregunta: ¿desplegar ahora o esperar más cerca de la beta? La preocupación legítima era no afectar la velocidad de iteración del día a día.

Decisión final: **deploy ligero ahora**. Razones:
- Validar el stack en serverless real antes de tener users (Auth.js + Vercel + Supabase + Prisma 7 con driver adapter es relativamente nuevo).
- CI gratis: Vercel hace `next build` automático en cada push a `main`.
- El loop de desarrollo sigue siendo localhost; Vercel es smoke test + URL compartible.

Para no asumir el costo de configurar URI HTTPS en Spotify dashboard hoy, hicimos el provider Spotify **condicional**: solo se carga si las 3 env vars están presentes (ID + SECRET + AUTH_URL). En prod ponemos solo ID + SECRET → la búsqueda funciona pero el botón "Conectar Spotify" queda oculto.

## Conceptos clave

### Vercel vs Railway

Comparativa que motivó la decisión:

| | Vercel | Railway |
|---|---|---|
| Naturaleza | Especialista en Next.js (mismo equipo) | PaaS generalista (apps + DBs + workers) |
| Modelo | Serverless (lambdas independientes) | Containers persistentes |
| Free tier | Generoso para hobby | $5 créditos iniciales, después uso |
| DB | NO hostea | SÍ hostea |
| Edge runtime | Sí, automático | No equivalente |

Para Blue Book: **Vercel** es óptimo porque el stack es 100% Next.js y la DB ya está en Supabase.

### Serverless function

Cada API route en Vercel es una **función AWS Lambda** que se invoca por request. Implicaciones:
- **Cold start**: la primera request a un endpoint sin uso reciente puede tardar 100-500ms más.
- **Sin estado entre requests**: cada lambda inicializa todo desde cero. Por eso el cache in-memory que pusimos en Día 5 no se comparte entre instancias (es per-lambda).
- **Conexiones DB**: cada cold start abriría una conexión nueva → por eso el `connection pooler` de Supabase es importante. Lo configuramos en `DATABASE_URL` (puerto 6543, `?pgbouncer=true`).

### `proxy.ts` (renombre de `middleware.ts` en Next.js 16)

Next.js 16 deprecó la convención del archivo `middleware.ts` y lo renombró a `proxy.ts`. Funcionalidad idéntica (corre en edge runtime antes de cada request). Solo cambia el nombre del archivo y el export.

### `prisma generate` en build

El cliente Prisma se genera localmente en `src/generated/prisma/` y está en `.gitignore`. Cuando Vercel clona el repo, ese directorio no existe → el build falla con `module-not-found`.

Solución estándar: añadir `prisma generate` al build step. Convención Prisma:
```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

`postinstall` corre cuando se instalan deps; `build` lo redunda por si Vercel cachea node_modules entre deploys.

### Provider OAuth condicional

```ts
const providers: NextAuthConfig["providers"] = [Credentials({...})];
if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET && process.env.AUTH_URL) {
  providers.push(Spotify({...}));
}
```

Patrón para tener providers opcionales según el entorno. En prod sin OAuth, las env vars de Spotify no incluyen `AUTH_URL` → el provider no se registra → el botón "Conectar Spotify" no aparece. La app sigue funcionando con email/password y con `/api/search` (que usa Client Credentials, no OAuth).

## Lo que hicimos paso a paso

### 1. Hacer condicional el provider Spotify

`src/auth.ts`:
- Construir lista `providers` empezando con solo `Credentials`.
- Solo añadir `Spotify` si las 3 env vars están presentes.
- Exportar `SPOTIFY_OAUTH_ENABLED` para que la UI condicione el botón.

`src/app/page.tsx`:
- Solo mostrar botón "Conectar Spotify" si `SPOTIFY_OAUTH_ENABLED`.

### 2. Migrar `middleware.ts` → `proxy.ts`

Next.js 16 deprecó la convención `middleware.ts`. Renombrado a `src/proxy.ts`. Build local nos dio el warning explícitamente:
> The "middleware" file convention is deprecated. Please use "proxy" instead.

Cambio adicional necesario: el export con destructuring no se reconocía como función en build:
```ts
// antes (no funcionaba en build):
export const { auth: middleware } = NextAuth(authConfig);

// ahora:
const { auth } = NextAuth(authConfig);
export default auth;
```

### 3. Añadir `prisma generate` al build

Editar `package.json`:
```json
"scripts": {
  "build": "prisma generate && next build",
  "postinstall": "prisma generate"
}
```

### 4. Verificar build local pasa

```bash
npm run build
```

Output esperado: lista de las 11 rutas (1 static, 10 dynamic) + "Proxy (Middleware)".

### 5. Crear proyecto en Vercel

- Sign up con GitHub.
- Add New → Project → Import `Blue-Book` desde GitHub.
- Framework Preset: Next.js (auto).
- Root Directory: `./`.
- **NO Deploy todavía** — primero env vars.

### 6. Configurar Environment Variables

Las 4 mínimas (todas en **Production**, idealmente también Preview):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | string completo del `.env` local (con `:6543` y `?pgbouncer=true`) |
| `DIRECT_URL` | string completo del `.env` local (con `:5432`) |
| `AUTH_SECRET` | el mismo del `.env` local |
| `AUTH_TRUST_HOST` | `true` |

**NO añadir** `AUTH_URL` ni Spotify env vars en este punto.

### 7. Deploy

Click Deploy. Espera 1-3 min al build.

### 8. Diagnóstico del fallo en `/api/search`

Smoke test después del primer Ready: 6/7 endpoints OK, **`/api/search` → HTTP 500**.

Causa: el endpoint usa Client Credentials de Spotify, que requiere `SPOTIFY_CLIENT_ID` y `SPOTIFY_CLIENT_SECRET` en el entorno. No las habíamos puesto.

Fix: añadir esas dos env vars en Vercel (Production solamente). El provider OAuth sigue deshabilitado porque falta `AUTH_URL`, pero el endpoint Client Credentials funciona.

### 9. Trigger redeploy manual

Vercel **NO** redeploya automáticamente al cambiar env vars. Hay que disparar manualmente:
- Deployments → 3 puntitos del último Ready → Redeploy.

Espera 1-2 min al rebuild.

## Smoke tests producción (8/8 OK)

URL: `https://blue-book-eight.vercel.app`

| Endpoint | Resultado |
|---|---|
| `GET /` | 200 |
| `GET /api/me` (sin sesión) | 200 con `user: null` |
| `GET /diary` (sin sesión) | 302 → `/login?from=/diary` |
| `GET /api/diary` (sin sesión) | 401 con `{"error":"No autorizado"}` |
| `GET /api/search?q=mitski` | 200 con tracks reales |
| `GET /api/tracks/<id>` | 200 |
| `GET /api/tracks/foo` | 400 |
| `GET /login` | 200 |

## Estado final del Día 6

### Funcional en producción

- App pública en `https://blue-book-eight.vercel.app`.
- DB Supabase conectada vía pooler.
- Auto-deploy en cada push a `main`.
- Email/password registro y login funcionan.
- Búsqueda Spotify con Client Credentials funciona.
- Spotify OAuth deshabilitado intencionalmente (botón "Conectar Spotify" no aparece).

### Variables de entorno en Vercel

Production:
- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `AUTH_TRUST_HOST=true`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

NO en Vercel (intencional):
- `AUTH_URL` — sin esto, el provider Spotify no se carga.

### Archivos cambiados en el repo

- `package.json` — scripts `build` + `postinstall` con `prisma generate`.
- `src/middleware.ts` → `src/proxy.ts` — convención Next.js 16.
- `src/auth.ts` — provider Spotify condicional + export `SPOTIFY_OAUTH_ENABLED`.
- `src/app/page.tsx` — UI condicional del botón "Conectar Spotify".

## Lecciones técnicas (no obvias)

1. **`prisma generate` en build de Vercel es obligatorio.** El cliente vive en `.gitignore`. Sin esto, el build falla con `module-not-found`.

2. **`middleware.ts` se llama `proxy.ts` en Next.js 16.** El warning del build local lo avisó.

3. **Vercel no redeploya al cambiar env vars.** Hay que disparar redeploy manual o pushear algo.

4. **Las env vars que requiere `next build` (no las que requiere runtime)** son evaluadas durante el build. `prisma.config.ts` valida `DIRECT_URL` al cargar — si Vercel hace build sin esa env var presente, el build falla. Por eso configurar env vars **antes** del primer Deploy.

5. **Production-only env vars son aceptables si no hay ramas activas.** Preview-deploy de ramas requeriría duplicar las vars; mientras solo trabajemos en `main`, no aplica.

6. **Provider OAuth condicional** es un patrón limpio para tener features opt-in por entorno. La alternativa (try/catch al cargar el provider) es más feo y menos explícito.

## Pendientes (van a Día 7)

- Estructura inicial de carpetas para componentes UI compartidos (Header, Footer, etc.).
- Documentación inicial del proyecto: README con estado del producto + cómo arrancar localmente.
- Decidir si añadimos un favicon custom o lo dejamos default.
- Revisar las "4 Recommendations" de deployment settings que ofrece Vercel.

## Pendientes para Día N (cerca de la beta)

- Configurar URI HTTPS en Spotify Developer dashboard: `https://blue-book-eight.vercel.app/api/auth/callback/spotify` (o el dominio custom si lo añadimos).
- Añadir `AUTH_URL` env var en Vercel apuntando al dominio público.
- Smoke test del flow OAuth en prod.
- Considerar dominio custom (`bluebook.app` o similar) — Vercel facilita mucho el setup.
- Replicar las env vars de Production a Preview para que ramas/PRs futuros puedan testearse.
