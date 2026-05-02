# Día 3 — Autenticación

**Fecha:** 2026-05-02
**Objetivo:** un usuario debe poder registrarse con email + password, iniciar sesión, opcionalmente conectar su cuenta de Spotify, y la app debe poder saber quién está logueado desde cualquier ruta.

---

## Contexto

Día 2 dejó la DB lista con tablas vacías. Hoy montamos el sistema de identidad: cómo se crea una cuenta, cómo se inicia sesión, cómo se mantiene el usuario logueado entre páginas.

## Conceptos clave

### Autenticación vs autorización

- **Autenticación:** "¿quién eres?" — verificar identidad (login).
- **Autorización:** "¿puedes hacer esto?" — verificar permisos.

Día 3 cubre solo autenticación. La autorización (proteger rutas privadas como `/diary`) viene en Día 4.

### Auth.js (NextAuth)

Librería que abstrae todo el plumbing de auth en Next.js: cookies firmadas, callbacks de OAuth, sesiones, providers múltiples. Sin Auth.js tendrías que escribir manualmente:
- Generación y verificación de JWTs.
- Gestión de cookies seguras (httpOnly, sameSite, secure).
- Flow OAuth (redirect → callback → exchange code → token).
- Refresh de tokens.
- Vinculación de cuentas.

Auth.js lo hace por ti, configurable via providers.

### JWT vs Database Sessions

Cuando un usuario hace login, hay que mantenerlo "logueado" entre requests. Dos estrategias:

- **JWT (JSON Web Token):** un string firmado criptográficamente que contiene los datos del usuario. Se guarda en una cookie. En cada request, el servidor verifica la firma y lee los datos sin tocar la DB. **Stateless** — escala muy bien en serverless.
- **Database Sessions:** se genera un ID aleatorio, se guarda en una tabla `Session`, y la cookie del cliente solo lleva ese ID. En cada request el servidor consulta la tabla. **Stateful** — permite revocar sesiones individuales (kick out).

**Para Blue Book usamos JWT.** Razones:
- Más rápido en serverless (sin query a DB en cada request).
- El provider Credentials de Auth.js v5 **solo funciona con JWT** — no es opcional.

Trade-off aceptado: revocar una sesión específica es más complejo (necesitarías una blocklist de tokens). Para MVP no es problema.

### Provider Credentials

Manera de Auth.js de implementar login con email/usuario + password. Tu defines la función `authorize(credentials)`: si retorna un objeto `User`, queda logueado; si retorna `null`, falla.

### Provider OAuth (Spotify, Google, etc.)

Manera estándar para que un user "se loguee con Spotify". El flow:
1. Usuario hace click en "Conectar Spotify".
2. App redirige a `https://accounts.spotify.com/authorize?...`.
3. Spotify pide login al user, le pregunta si autoriza a Blue Book.
4. Spotify redirige de vuelta a `/api/auth/callback/spotify?code=...`.
5. Auth.js intercambia el `code` por un `access_token` + `refresh_token`.
6. Auth.js crea o vincula un `User` en la DB y guarda los tokens en `Account`.

Ventaja para Blue Book: no manejas passwords del user, y obtienes acceso a su cuenta de Spotify para futuras features (top tracks, recently played).

### bcrypt

Algoritmo para **hashear passwords**. Características clave:
- **Irreversible:** dado el hash, no puedes recuperar la password original.
- **Lento por diseño:** una verificación toma ~100ms. Eso protege contra ataques de fuerza bruta (un atacante con tu DB no puede probar millones de passwords por segundo).
- **Salt automático:** dos users con la misma password tienen hashes distintos.

Nunca guardes passwords en texto plano. Siempre `bcrypt.hash(password, 10)` antes de meter al DB. En login, `bcrypt.compare(password, user.passwordHash)`.

### Server Actions (React 19 / Next.js 16)

Funciones JavaScript que se **ejecutan en el servidor** pero se pueden invocar desde un componente cliente como si fueran funciones normales. Bajo el capó, Next.js las expone como un endpoint POST.

```tsx
// "use server" arriba marca el archivo como solo-servidor
"use server";
export async function registerAction(prev, formData) {
  // se ejecuta en el server, tiene acceso a DB, secrets, etc.
}
```

Y desde un client component:
```tsx
<form action={registerAction}>
```

Reemplaza el patrón viejo de "POST a `/api/users` y luego redirect manual".

### `useActionState` (React 19)

Hook nuevo para conectar un form a un server action. Devuelve `[state, formAction, pending]`:
- `state`: lo último que retornó el server action (errores, datos).
- `formAction`: la versión "envuelta" que pasas al `<form action={}>`.
- `pending`: boolean — true mientras la action está corriendo.

### Route Group `(auth)` en Next.js

Las carpetas en `app/` que tienen nombre con paréntesis, como `(auth)`, son **route groups**. Sirven para agrupar páginas con un layout compartido **sin afectar la URL final**:

```
app/(auth)/login/page.tsx      → URL: /login
app/(auth)/register/page.tsx   → URL: /register
app/(auth)/layout.tsx          → wrapping layout para login y register
```

El `(auth)` no aparece en la URL. Es solo organización del filesystem.

### Tipos extendidos de Session

Por default, `session.user` solo tiene `name`, `email`, `image`. Para añadir `username`, `displayName`, etc., hay que extender los tipos vía declaración de módulo en `next-auth.d.ts`.

## Lo que hicimos paso a paso

### 1. Decidir versión de Auth.js (v4 vs v5)

Inspección del registry npm:
```bash
npm view next-auth dist-tags
# latest: 4.24.14
# beta: 5.0.0-beta.31
```

El instalador puso `next-auth@4` (latest), pero el adapter `@auth/prisma-adapter@2.x` que ya teníamos es para **v5**. Mismatch.

**Decisión: actualizar a v5-beta.** Razones:
- v5 está hecho para App Router + Server Components.
- Soporte nativo de Server Actions.
- v4 es legacy en 2026.
- Lleva 2 años en beta estable, muchos proyectos productivos lo usan.

```bash
npm install --prefix /Users/fabricionavarretetellez/Documents/blue-book \
  next-auth@beta
```

Resultado: `next-auth@5.0.0-beta.31` instalado, mismo adapter alineado.

### 2. Schema: añadir model `Account`

Auth.js v5 + el adapter Prisma v2 esperan una tabla `Account` con estructura específica para guardar OAuth tokens. La estructura es **canónica** — los nombres de campo (`provider`, `providerAccountId`, `refresh_token` con guion bajo, etc.) son obligatorios.

En `prisma/schema.prisma`:
- Quité `spotifyId` y `spotifyRefreshToken` de `User` — la tabla `Account` los reemplaza.
- Añadí `emailVerified DateTime?` en `User` (Auth.js lo usa).
- Añadí relación `accounts Account[]` en `User`.
- Añadí el model `Account` completo.

```bash
npx prisma migrate dev --name add_account_for_oauth
npx prisma generate
```

Resultado: migración `20260502183749_add_account_for_oauth` aplicada, cliente regenerado.

### 3. Configuración Auth.js: dos archivos

Auth.js v5 separa la config en dos archivos por **edge runtime**:

#### `src/auth.config.ts` (edge-safe)

Solo cosas que pueden correr en edge (sin Node APIs, sin Prisma, sin bcrypt):
- `pages.signIn` — ruta a la página de login custom.
- `callbacks.authorized` — para middleware (Día 4).
- `callbacks.jwt` y `callbacks.session` — para inyectar `username`/`displayName` al token y la sesión.

#### `src/auth.ts` (runtime completo)

Extiende el config edge con:
- **Adapter:** `PrismaAdapter(prisma)` para CRUD de User/Account.
- **Providers:**
  - `Credentials({ authorize })` — valida con zod, busca user, compara hash bcrypt.
  - `Spotify({ clientId, clientSecret, scope, allowDangerousEmailAccountLinking: true })`.
- **Session:** `{ strategy: "jwt" }`.

Al final exporta los símbolos que usa el resto de la app:

```ts
export const { handlers, signIn, signOut, auth } = NextAuth({...});
```

Donde:
- `handlers` — los GET/POST que va al route handler.
- `signIn`/`signOut` — funciones para usar desde server actions.
- `auth` — función que lee la sesión actual desde cualquier server component.

### 4. Tipos extendidos (`src/types/next-auth.d.ts`)

Para que TypeScript entienda que `session.user.username` existe:

```ts
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username?: string;
      displayName?: string;
    } & DefaultSession["user"];
  }
  interface User { username?: string; displayName?: string; }
}

declare module "next-auth/jwt" {
  interface JWT { username?: string; displayName?: string; }
}
```

### 5. Route handler `/api/auth/[...nextauth]/route.ts`

Auth.js v5 expone los handlers en `handlers.GET` y `handlers.POST`. Los re-exportamos:

```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

Eso habilita todas las URLs de auth (signin, signout, callback OAuth, etc.) en `/api/auth/...`.

### 6. Server actions (`src/lib/actions/auth.ts`)

Dos acciones: `registerAction` y `loginAction`. Patrón:

```ts
"use server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signIn } from "@/auth";

const schema = z.object({...});

export async function registerAction(prev, formData) {
  const parsed = schema.safeParse({...});
  if (!parsed.success) return { ok: false, fieldErrors: ... };

  const existing = await prisma.user.findFirst({...});
  if (existing) return { ok: false, error: "..." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({ data: {..., passwordHash} });

  await signIn("credentials", { email, password, redirectTo: "/" });
}
```

**Detalle no obvio:** `signIn()` lanza un `NEXT_REDIRECT` interno cuando va bien — Next.js lo captura. El `try/catch` debe distinguir `AuthError` (fallo real) del redirect.

### Nota crítica sobre desarrollo local + Spotify

Spotify (desde 2024) **rechaza `http://localhost:...` como Redirect URI** por reglas de OAuth 2.1. Solo acepta:
- `https://...` (cualquiera)
- `http://127.0.0.1:...` (loopback IPv4)
- `http://[::1]:...` (loopback IPv6)

**Implicación:** durante desarrollo local hay que acceder a la app vía `http://127.0.0.1:3000`, NO `http://localhost:3000`. Las cookies son por dominio, así que cambiar el host obliga a re-loguearse.

En el dashboard de Spotify Developer App, registrar:
```
http://127.0.0.1:3000/api/auth/callback/spotify
```

### 7. UI mínima

`src/app/(auth)/layout.tsx` — wrapper centered con marca Blue Book.

`src/app/(auth)/login/login-form.tsx` (client component):
```tsx
"use client";
import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  return <form action={formAction}>...</form>;
}
```

Pages (server components) que renderizan los forms.

Forms incluyen errores por campo (`fieldErrors`), error global (`error`), y estado `pending` que deshabilita el botón mientras se procesa.

### 8. Endpoint `/api/me`

```ts
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: {...session.user} });
}
```

**Convención del producto:** sin sesión devolvemos `{ user: null }` con HTTP 200 (no 401). Razón: evita ruido en consola del navegador y simplifica el render condicional en client components.

### 9. Home page con UI condicional

Refactor de `src/app/page.tsx` como server component que llama `auth()`:
- Si hay sesión: muestra "Hola, [nombre]" + botón "Cerrar sesión" (form con server action inline llamando `signOut`).
- Si no: links a `/login` y `/register`.

### 10. Type check + smoke test

```bash
npx tsc --noEmit          # cero errores
npm run dev               # arranca server
curl http://localhost:3000/api/me       # → {"user":null} HTTP 200
curl http://localhost:3000/login        # → HTTP 200
curl http://localhost:3000/register     # → HTTP 200
```

Y test manual en navegador: registro → auto-login → home muestra usuario → logout → login con misma cuenta. Funcional.

## Problemas y soluciones

### Problema 1: `Module '@/auth' has no exported member 'GET'`

Primer intento:
```ts
export { GET, POST } from "@/auth";
```

**Causa:** en Auth.js v5, `NextAuth({...})` retorna `{ handlers, signIn, signOut, auth }`. Los handlers GET/POST viven dentro del objeto `handlers`, no en el top level.

**Solución:**
```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

### Problema 2: PrismaAdapter + cliente generado en TypeScript

`@auth/prisma-adapter@2.x` espera un cliente Prisma estándar. Nuestro cliente está en `src/generated/prisma` (TS, no JS). El adapter funciona, pero los tipos de TS son estrictos sobre la forma exacta del cliente.

**Solución temporal:** cast a `any` en la línea del adapter:
```ts
adapter: PrismaAdapter(prisma as any),
```

Esto silencia el type error sin romper funcionalidad. En sesiones futuras, cuando Auth.js publique tipos compatibles con `prisma-client` (no `@prisma/client`), el cast se puede quitar.

## Estado final del Día 3

### Archivos nuevos en el repo

```
src/
├── auth.ts                                # config completa Auth.js
├── auth.config.ts                         # config edge-safe
├── types/next-auth.d.ts                   # tipos extendidos Session/User/JWT
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                     # layout centered con marca
│   │   ├── login/
│   │   │   ├── page.tsx                   # server component
│   │   │   └── login-form.tsx             # client form con useActionState
│   │   └── register/
│   │       ├── page.tsx
│   │       └── register-form.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts    # re-export de handlers
│   │   └── me/route.ts                    # /api/me
│   └── page.tsx                           # home actualizada con UI condicional
├── lib/
│   └── actions/auth.ts                    # registerAction + loginAction
└── ...

prisma/migrations/
└── 20260502183749_add_account_for_oauth/
    └── migration.sql
```

### Funcional en localhost

- `GET /` — home pública con links a login/register o info del user logueado.
- `GET /login` — pantalla de login con form email/password.
- `GET /register` — pantalla de registro con username, email, password, displayName.
- `GET /api/me` — devuelve user actual o `{user: null}`.
- `POST /api/auth/...` — endpoints de Auth.js (signin, signout, callback Spotify).
- Server actions: registro auto-loguea; login redirige a `/`.
- Logout via form inline en home (server action llamando `signOut`).

### Variables de entorno usadas

- `AUTH_SECRET` — firma de JWTs (ya estaba en `.env`).
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` — para el provider OAuth (ya estaban).

### Comandos útiles

```bash
# Inspeccionar usuarios creados
npx prisma studio

# Reset DB (cuidado, borra todo)
npx prisma migrate reset

# Type-check antes de commitear
npx tsc --noEmit

# Dev server
npm run dev
```

## Lecciones técnicas (no obvias)

1. **`next-auth` y `@auth/prisma-adapter` deben estar en versiones alineadas.** El adapter v2 es para Auth.js v5; el adapter v1 es para v4. Mezclar rompe en runtime.

2. **Server actions y redirects:** `signIn()` y `signOut()` en server actions lanzan `NEXT_REDIRECT` que Next.js intercepta. Si los envuelves en `try/catch` para manejar errores, debes re-throw cualquier cosa que NO sea `AuthError`.

3. **Edge runtime safety:** el middleware de Next.js corre en edge, donde no hay `bcrypt` ni Prisma. Por eso Auth.js v5 separa config edge-safe (sin esos imports) y config completa.

4. **`allowDangerousEmailAccountLinking: true`** suena alarmante pero es seguro cuando controlas el flujo OAuth: Spotify nos da un email verificado, y vincular por email evita crear duplicados.

5. **JWT no requiere tabla `Session`** — pero si añades providers OAuth, sí requiere tabla `Account` para guardar `refresh_token` y poder llamar a Spotify API más tarde a nombre del user.

## Pendientes (van a Día 4)

- Middleware de protección de rutas (`/diary`, `/me/*` requieren login).
- Endpoint protegido genérico para validar el patrón.
- Pulir mensajes de error / estados vacíos.
- (Opcional) link de "Conectar Spotify" desde la home cuando hay sesión.
