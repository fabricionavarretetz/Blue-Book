# Blue Book

> Tu diario de música. Un diario primero, una plataforma social después.

Blue Book es un **music diary social** — capturar momentos de tu vida con canciones (canción + emoji + opcionalmente mood/contexto/reflexión). NO es un servicio de streaming ni una app de reseñas: es un diario personal que se monta encima de Spotify.

**Producción:** https://blue-book-eight.vercel.app

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Estilos:** Tailwind v4
- **Auth:** Auth.js v5 (next-auth@beta) — Credentials + Spotify OAuth opcional
- **DB:** PostgreSQL en Supabase + Prisma 7 con `@prisma/adapter-pg`
- **Hosting:** Vercel (frontend + serverless API) + Supabase (DB)
- **Spotify Web API** para búsqueda y datos del user

## Setup local

### Prerrequisitos

- Node.js ≥ 18.18 (idealmente 20+)
- Una cuenta de Supabase (free tier vale)
- Una app en Spotify Developer Dashboard

### Pasos

```bash
# 1. Clonar
git clone https://github.com/fabricionavarretetz/Blue-Book.git
cd Blue-Book

# 2. Instalar dependencias (corre `prisma generate` automáticamente)
npm install

# 3. Crear .env desde la plantilla
cp .env.example .env
# Editar .env y rellenar valores (ver sección "Variables de entorno")

# 4. Aplicar migraciones a la DB
npx prisma migrate dev

# 5. (Opcional) Sembrar tags pre-cocidos
npx prisma db seed

# 6. Levantar el dev server
npm run dev
```

Abrir **http://127.0.0.1:3000** (NO `localhost`, ver nota abajo sobre Spotify).

### Variables de entorno

Ver `.env.example` para la plantilla completa. Las claves:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Connection string de Supabase con pooler (puerto 6543, `?pgbouncer=true`). Para queries en runtime. |
| `DIRECT_URL` | Connection string directa (puerto 5432). Para migraciones de Prisma. |
| `AUTH_SECRET` | Firma de JWTs. Genera con `openssl rand -base64 32`. |
| `AUTH_URL` | Base URL local. Debe ser `http://127.0.0.1:3000` (Spotify rechaza `localhost`). |
| `AUTH_TRUST_HOST` | `true`. |
| `SPOTIFY_CLIENT_ID` | Spotify Developer Dashboard → tu app. |
| `SPOTIFY_CLIENT_SECRET` | Idem. |

### Nota sobre `localhost` vs `127.0.0.1`

Spotify (desde 2024, OAuth 2.1) **NO acepta `http://localhost`** como Redirect URI — solo loopback IP literal. En el dashboard de Spotify registra:

```
http://127.0.0.1:3000/api/auth/callback/spotify
```

Y accede a la app en dev desde `http://127.0.0.1:3000`, no `localhost`. Las cookies son por dominio, así que cambiar el host obliga a re-loguearse.

## Scripts

```bash
npm run dev     # Dev server (turbopack)
npm run build   # Build de producción (corre prisma generate primero)
npm run start   # Server con build ya hecho
npm run lint    # ESLint
```

## Estructura del proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # login + register (route group con layout propio)
│   ├── api/                # endpoints (auth, search, tracks, diary, me)
│   ├── diary/              # diario protegido del user
│   ├── icon.svg            # favicon (Next.js convención)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/                 # primitivas reutilizables (Button, InputField, Card)
├── lib/
│   ├── actions/            # server actions (auth, spotify)
│   ├── auth-guard.ts       # requireAuth + requireAuthApi
│   ├── cache.ts            # TtlCache genérico
│   ├── db.ts               # cliente Prisma compartido (singleton)
│   └── spotify.ts          # cliente Spotify (Client Credentials + user token + refresh)
├── auth.config.ts          # Auth.js — config edge-safe (proxy)
├── auth.ts                 # Auth.js — config completa (Prisma adapter + bcrypt)
├── proxy.ts                # Next 16: proxy en edge runtime (renombre de middleware.ts)
└── types/
    └── next-auth.d.ts      # extensión de tipos Session/User/JWT

prisma/
├── schema.prisma           # 7 modelos: User, Entry, Follow, Tag, EntryReaction, SpotifyCache, Account
├── migrations/             # versionadas
└── seed.ts                 # 12 moods + 12 contextos en español
```

## Documentación

Manuales detallados de cada día de desarrollo en [`docs/`](./docs/).

- [Día 1 — Scaffold](./docs/01-dia-1-scaffold.md)
- [Día 2 — Base de datos](./docs/02-dia-2-base-de-datos.md)
- [Día 3 — Autenticación](./docs/03-dia-3-autenticacion.md)
- [Día 4 — Protección de rutas + Spotify OAuth](./docs/04-dia-4-protecciones-y-spotify-oauth.md)
- [Día 5 — Proxy a Spotify](./docs/05-dia-5-spotify-proxy.md)
- [Día 6 — Deploy en Vercel](./docs/06-dia-6-deploy-vercel.md)

## Deploy

Auto-deploy en cada push a `main` via Vercel. La app vive en `https://blue-book-eight.vercel.app`.

Spotify OAuth está **deshabilitado en producción** intencionalmente hasta más cerca de la beta cerrada — no hemos configurado URI HTTPS en el dashboard de Spotify aún. La búsqueda con Client Credentials sí funciona en prod.

Para activar OAuth en prod: ver pendientes en [`docs/06-dia-6-deploy-vercel.md`](./docs/06-dia-6-deploy-vercel.md#pendientes-para-día-n-cerca-de-la-beta).

## Roadmap

- ✅ Semana 1: Setup técnico (auth, DB, Spotify proxy, deploy).
- ⏳ Semanas 2-3: Diary entry Level 1 + diario propio + perfil básico.
- ⏳ Semanas 4-6: Tags, follows, hybrid feed.
- ⏳ Semanas 7-9: Reflexiones, sugerencias algorítmicas.
- ⏳ Semanas 10-11: Polish, motion, accessibility.
- ⏳ Semana 12: Beta cerrada con 20-30 invitados.

Total estimado a MVP cerrado: 12 semanas. A launch público: 24 semanas.
