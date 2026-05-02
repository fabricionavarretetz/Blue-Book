# Día 1 — Scaffold del proyecto

**Fecha:** 2026-05-01
**Objetivo:** crear el esqueleto de Blue Book con todas las herramientas que vamos a necesitar, versionado en GitHub.

---

## Contexto

Blue Book es un **diario musical social**: la acción núcleo es registrar momentos vividos con canciones (canción + emoji + opcionalmente mood/contexto/reflexión). NO es un servicio de streaming ni una app de reseñas.

Antes de este día se tomaron varias decisiones:
- **Repo nuevo** (no rebrand de un proyecto anterior llamado Soundboxd, que quedó archivado).
- **Stack moderno:** Next.js 16 + TypeScript + Tailwind v4 + Prisma + PostgreSQL.
- **MVP minimalista:** 12 semanas para `diary + perfil + feed simple`. Features avanzadas (timeline, smart prompts, narrative playlists, story cards) van a Phase 2/3.

## Conceptos clave

### Next.js

Framework de aplicaciones web construido sobre **React**. Maneja tres cosas a la vez:
- **Frontend:** lo que ve el usuario en el navegador.
- **Routing:** las URLs del sitio (`/`, `/login`, `/u/anita`).
- **Backend mínimo:** endpoints de API en `app/api/...`.

Versión usada: **16.2.4** (App Router con React Server Components).

### TypeScript

JavaScript con **tipos**. En vez de descubrir errores en runtime ("`undefined is not a function`"), los detectas mientras escribes. Más errores atrapados antes, mejor autocompletado, código más mantenible.

### Tailwind CSS

Framework de estilos donde escribes clases pequeñas directamente en el HTML/JSX:
```jsx
<div className="flex gap-4 p-6 bg-blue-500">
```
Más rápido para iterar que CSS tradicional. Versión usada: **v4** (más moderna, integrada con `@tailwindcss/postcss`).

### Prisma

ORM (Object-Relational Mapper). Te permite escribir consultas a la base de datos en TypeScript en vez de SQL crudo:
```ts
// En vez de: SELECT * FROM users WHERE email = ?
const user = await prisma.user.findUnique({ where: { email } });
```
Tres piezas:
- `schema.prisma` — describes tablas y relaciones.
- `prisma migrate` — convierte el schema en SQL y lo aplica a la DB.
- `prisma generate` — genera código TypeScript con tipos para usar en tu app.

### Auth.js (NextAuth)

Librería de autenticación para Next.js. Maneja login/register/sessions con varios providers (email+password, Google, Spotify, etc.).

### Variables de entorno (`.env`)

Archivo donde guardas credenciales (passwords, API keys, secrets). **Nunca se sube a git** — está listado en `.gitignore`. La app las lee en runtime con `process.env.NOMBRE_VAR`.

## Lo que hicimos paso a paso

### 1. Verificar entorno

Antes de crear nada, confirmé que tu Mac tenía las versiones correctas:

```bash
node --version    # v25.8.2  (Next.js 16 requiere ≥ 18.18)
npm --version     # 11.11.1
git --version     # 2.39.5
```

Y que la carpeta destino (`~/Documents/blue-book`) no existía aún.

### 2. Scaffold con `create-next-app`

Comando ejecutado:

```bash
npx --yes create-next-app@latest /Users/fabricionavarretetellez/Documents/blue-book \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-npm --yes
```

Flags explicados:
- `--typescript` — proyecto TS desde el día 1
- `--tailwind` — incluir Tailwind preconfigurado
- `--eslint` — linter de calidad de código
- `--app` — App Router (no Pages Router antiguo)
- `--src-dir` — código fuente en `src/` (separado de configs en raíz)
- `--import-alias "@/*"` — permite escribir `import x from "@/lib/db"` en vez de paths relativos largos
- `--use-npm` — gestor de paquetes
- `--yes` — sin prompts interactivos

Resultado: 360 paquetes instalados, repositorio git inicializado automáticamente, primer commit "Initial commit from Create Next App" creado.

### 3. Instalar dependencias del MVP

```bash
npm install --prefix /Users/fabricionavarretetellez/Documents/blue-book \
  prisma @prisma/client next-auth @auth/prisma-adapter bcryptjs zod
```

| Paquete | Para qué |
|---|---|
| `prisma` | CLI del ORM (genera, migra, valida) |
| `@prisma/client` | Cliente runtime de Prisma |
| `next-auth` | Auth.js v5 (sessions + providers) |
| `@auth/prisma-adapter` | Puente entre Auth.js y Prisma para guardar usuarios |
| `bcryptjs` | Hashear contraseñas con salt (irreversible) |
| `zod` | Validación de inputs (emails, longitudes, etc.) |

DevDependencies (solo en desarrollo):

```bash
npm install --prefix /Users/fabricionavarretetellez/Documents/blue-book -D \
  @types/bcryptjs prettier prettier-plugin-tailwindcss
```

| Paquete | Para qué |
|---|---|
| `@types/bcryptjs` | Tipos TypeScript para bcryptjs |
| `prettier` | Formateador automático de código |
| `prettier-plugin-tailwindcss` | Ordena clases de Tailwind alfabéticamente para legibilidad |

### 4. Configurar Prettier

Archivos creados:

**`.prettierrc.json`**
```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

**`.prettierignore`** (qué no formatear)
```
node_modules
.next
.vercel
dist
build
src/generated
package-lock.json
```

### 5. Conectar al repo de GitHub

El repo `Blue-Book` ya estaba creado en GitHub (vacío). Lo conectamos:

```bash
git remote add origin https://github.com/fabricionavarretetz/Blue-Book.git
```

Y pusheamos el primer commit:

```bash
git push -u origin main
```

## Estado final del Día 1

Estructura de carpetas:

```
blue-book/
├── .env.example         # plantilla de variables de entorno
├── .gitignore
├── .prettierrc.json
├── .prettierignore
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── public/              # assets estáticos
├── src/                 # código fuente
│   └── app/             # rutas de Next.js (App Router)
└── tsconfig.json
```

Stack instalado y listo:
- Next.js 16.2.4, React 19.2.4
- TypeScript 5
- Tailwind v4
- Prisma 7 (CLI + cliente)
- Auth.js v5 (next-auth)
- bcryptjs, zod
- Prettier con plugin Tailwind

Commit en GitHub: `chore: scaffold Blue Book — Next.js 16 + Prisma + Auth.js`.

## Pendientes (van a Día 2)

- Configurar la base de datos (Supabase)
- Definir el schema Prisma con las tablas del MVP
- Aplicar la migración inicial
- Seed de tags
