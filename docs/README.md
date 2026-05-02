# Manual de Blue Book

Documentación didáctica del desarrollo, escrita conforme avanzamos. El objetivo
es que cualquier persona (incluido tu yo del futuro) pueda entender **qué se
hizo, por qué, y cómo reproducirlo** sin necesidad de tener el contexto de la
conversación original.

## Convenciones

- Cada sesión/día tiene su propio archivo numerado (`01-`, `02-`, …).
- Cada manual es **autocontenido**: se puede leer en frío, sin haber leído los
  anteriores. A cambio, hay algo de repetición de contexto entre archivos.
- Los conceptos técnicos se explican la primera vez que aparecen.
- Los comandos exactos están en bloques de código para que puedas copiarlos.

## Índice

| # | Título | Fecha | Resumen |
|---|---|---|---|
| 01 | [Día 1 — Scaffold del proyecto](./01-dia-1-scaffold.md) | 2026-05-01 | Crear repo, scaffold Next.js 16 + TypeScript + Tailwind, instalar dependencias del MVP, primer commit y push a GitHub. |
| 02 | [Día 2 — Base de datos](./02-dia-2-base-de-datos.md) | 2026-05-02 | Crear proyecto Supabase, configurar Prisma 7 con driver adapter, definir 7 tablas, aplicar migración inicial, seed de tags. |
| 03 | [Día 3 — Autenticación](./03-dia-3-autenticacion.md) | 2026-05-02 | Auth.js v5 con Credentials (email+password+bcrypt) y Spotify OAuth opcional. UI mínima de login/register. Endpoint /api/me. |
| 04 | [Día 4 — Protección de rutas + Spotify OAuth funcional](./04-dia-4-protecciones-y-spotify-oauth.md) | 2026-05-02 | Middleware con redirect a /login + helpers requireAuth/requireAuthApi. Página /diary y endpoint /api/diary. ?from= post-login. Spotify OAuth end-to-end con redirectProxyUrl. |

## Plan general del proyecto

- **MVP cerrado:** 12 semanas (84 días).
- **Launch público:** 24 semanas (168 días).

Roadmap detallado por semanas en el manual del Día 1.

## Stack técnico

- **Frontend/SSR:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + Framer Motion
- **Backend:** Next.js API routes + Auth.js v5 + bcryptjs + zod
- **Base de datos:** PostgreSQL en Supabase (free tier) + Prisma 7 ORM con `@prisma/adapter-pg`
- **Hosting:** Vercel (app) + Supabase (DB)
- **Integraciones:** Spotify Web API (OAuth opcional + Client Credentials para búsqueda)
