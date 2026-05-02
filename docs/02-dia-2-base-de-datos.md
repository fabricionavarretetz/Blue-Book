# Día 2 — Base de datos

**Fecha:** 2026-05-02
**Objetivo:** crear la base de datos de Blue Book en Supabase, definir su estructura con Prisma, aplicar la migración inicial y poblar la taxonomía de tags.

---

## Contexto

Día 1 dejó el scaffold de Next.js listo, pero sin lugar donde guardar usuarios ni entries. Hoy montamos esa parte.

## Conceptos clave

### Supabase

Servicio en la nube que te da una **PostgreSQL gestionada** + Auth + Storage + Realtime + Edge Functions, sobre un dashboard parecido a Firebase pero open-source.

Para Blue Book usamos **solo el Postgres** (no usamos su Auth porque vamos con Auth.js, que es más flexible). Plan **free**: 500 MB de DB, 2 proyectos sin caducar.

Por qué Supabase y no Railway: free tier real (no $5/mes), storage incluido para futuros avatares, `pgvector` preinstalado para Phase 3 (embeddings musicales).

### PostgreSQL

Motor de base de datos relacional, open-source, estándar de la industria. Soporta:
- Tipos avanzados como `JSONB` (JSON binario indexable) y arrays nativos (`String[]`).
- Índices GIN/GiST para búsquedas en arrays y JSON.
- Extensiones (pgvector, pg_cron, postgis…).

### Connection string

URL larga que tu app usa para conectarse a la DB. Formato:
```
postgresql://USUARIO:PASSWORD@HOST:PUERTO/NOMBRE_DB?parametros
```

Supabase ofrece **dos tipos**:
- **Pooler (puerto 6543):** conexiones gestionadas en grupo (PgBouncer). Ideal para apps serverless que abren/cierran conexiones todo el tiempo. Tiene `?pgbouncer=true` al final.
- **Direct (puerto 5432):** conexión directa al PostgreSQL. Necesaria para migraciones (operaciones de schema) porque PgBouncer en modo transaction no soporta algunas instrucciones.

Para Blue Book tenemos las dos en el `.env`:
- `DATABASE_URL` = pooler 6543 (para queries en runtime cuando despleguemos en Vercel).
- `DIRECT_URL` = puerto 5432 (para que Prisma aplique migraciones).

### Migración

Una migración es un archivo SQL que **transforma el schema** de un estado A a un estado B. Prisma las genera automáticamente leyendo tu `schema.prisma` y comparándolo con el estado actual de la DB.

Ventaja: son archivos versionables. Si tu compañero clona el repo, puede recrear toda la DB con `prisma migrate deploy`.

### Seed

Script que pobla la DB con **datos iniciales no derivables del schema**: en nuestro caso, los 24 tags pre-cocidos para el autosuggest.

## Lo que hicimos paso a paso

### 1. Crear proyecto en Supabase

Manualmente en el dashboard:
- supabase.com → "Start your project" → sign in con GitHub.
- New project: nombre genérico, password generada por Supabase, región **Ohio (us-east-2)**, plan free.
- Esperé ~1 minuto a que provisionara.

Resultado: una PostgreSQL online con un Project ID único (`ocqpxiiqhupyiigjaotu` en este caso).

### 2. Inicializar Prisma

```bash
cd /Users/fabricionavarretetellez/Documents/blue-book
npx prisma init --datasource-provider postgresql
```

Esto creó:
- `prisma/schema.prisma` — el schema vacío con datasource y generator.
- `prisma.config.ts` — configuración del CLI (Prisma 7+ usa esto).
- `.env` — plantilla con `DATABASE_URL=`.

Importante: `prisma.config.ts` requiere `dotenv` para cargar variables del `.env` (Prisma 7 ya no las carga automáticamente):

```bash
npm install --prefix /Users/fabricionavarretetellez/Documents/blue-book -D dotenv
```

### 3. Definir el schema (`prisma/schema.prisma`)

7 modelos para el MVP:

| Modelo | Para qué |
|---|---|
| `User` | Usuarios. Email único, password hash, username único, opcionalmente Spotify conectado. |
| `Entry` | **Núcleo:** un momento = canción + emoji + tags + reflexión. |
| `Follow` | Grafo social. PK compuesta `(followerId, followeeId)`. |
| `Tag` | Lista de moods/contextos sugeridos para el autosuggest. NO es FK obligatoria. |
| `EntryReaction` | Reacciones a entries de otros (preparado para Phase 2, sin uso en MVP). |
| `SpotifyCache` | Cache de top tracks/artists/recently played para sugerencias. |
| Enum `Visibility` | PUBLIC / FOLLOWERS / PRIVATE para cada entry. |
| Enum `TagType` | MOOD o CONTEXT. |

**Decisiones de diseño no obvias** (importantes de entender porque van contra la intuición de "normalizar siempre"):

1. **`moodTags` y `contextTags` se guardan como `String[]` en cada `Entry`**, no en una tabla `EntryTag` normalizada. Razón: Postgres indexa arrays con GIN; lookup por tag es O(log n) sin joins. Y los tags son free-form (la tabla `Tag` es solo taxonomy de sugerencia).

2. **`trackSnapshot` es `Json`**, no FK a una tabla `Songs`. Razón: Spotify cambia metadata (renombran álbumes, cambian portadas). Queremos preservar lo que el usuario vio cuando loggeó. Snapshot inmutable > FK live.

3. **`reflection` capada a 500 caracteres** (`@db.VarChar(500)`). Razón: forzar disciplina de "diario corto". Si quieren escribir más, hay un Phase 2 de "long form".

4. **Índices estratégicos:**
   - `Entry @@index([userId, createdAt(sort: Desc)])` — para feed propio rápido.
   - `Entry @@index([createdAt(sort: Desc)])` — para feed global.

### 4. Configurar `prisma.config.ts`

```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

const url = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];
if (!url) {
  throw new Error("[prisma.config] Falta DIRECT_URL (o DATABASE_URL) en .env.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url },
});
```

**Cambio importante en Prisma 7:** las propiedades `url` y `directUrl` ya no van en el `datasource` block del `schema.prisma`. Viven en `prisma.config.ts`. El `Datasource` solo admite `url` y `shadowDatabaseUrl`.

### 5. Llenar el `.env` con las connection strings

En Supabase:
- Botón **Connect** arriba → tab **ORM** → seleccionar **Prisma**.
- Te da `DATABASE_URL` y `DIRECT_URL` ya etiquetadas, listas para copiar.

Las pegamos al `.env` y reemplazamos `[YOUR-PASSWORD]` por la password real de la DB.

### 6. Problema: password con caracter URL-reservado

Primer intento de migración:
```
Error: P1013: The provided database string is invalid.
invalid port number in database URL.
```

**Causa:** la password generada inicialmente por Supabase tenía un `#`. En URLs, `#` indica fragmento — el parser truncaba la URL ahí, dejándola sin puerto válido.

**Caracteres URL-reservados problemáticos:** `@ # ? / & + % :`

**Solución:**
1. Ir a `https://supabase.com/dashboard/project/<PROJECT_ID>/settings/database`.
2. Click en **Reset database password** → **Generate a password**. Genera una sin caracteres URL-reservados.
3. Reemplazar la password en el `.env`.

Para hacer el reemplazo sin que la password quede en el historial de shell, usamos un script Python:

**`/tmp/reset_db_password.py`** (no se commitea, es un helper local):
```python
import getpass, re
PATH = "/Users/fabricionavarretetellez/Documents/blue-book/.env"
data = open(PATH).read()
# Restaurar placeholder donde sea que esté la password vieja
restored = re.sub(r"(postgres\.[a-z0-9]+):[^@]*@", r"\1:[YOUR-PASSWORD]@", data)
pw = getpass.getpass("Nueva password Supabase: ")
final = restored.replace("[YOUR-PASSWORD]", pw)
open(PATH, "w").write(final)
```

`getpass` lee la password sin mostrarla en pantalla y sin dejarla en el historial.

### 7. Aplicar la migración inicial

```bash
cd /Users/fabricionavarretetellez/Documents/blue-book
npx prisma migrate dev --name init
```

Resultado:
- Generó `prisma/migrations/20260502042112_init/migration.sql` (versionado en el repo).
- Lo aplicó a Supabase, creando las 7 tablas.

### 8. Generar el cliente Prisma

```bash
npx prisma generate
```

**Cambio en Prisma 7:** el cliente se genera en **TypeScript** (no JavaScript), en `src/generated/prisma/`. Los archivos generados están en `.gitignore` — se regeneran al clonar el repo.

Import desde tu código:
```ts
import { PrismaClient } from "@/generated/prisma/client";
```

### 9. Problema: `new PrismaClient()` ya no funciona vacío

Al correr el seed:
```
PrismaClientInitializationError: PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions
```

**Causa:** Prisma 7 quitó el constructor implícito que leía `DATABASE_URL` automáticamente. Ahora exige uno de:
- `adapter` (driver adapter explícito).
- `accelerateUrl` (servicio cloud Prisma Accelerate).

`datasourceUrl` también fue removido en Prisma 7 (devuelve `Unknown property datasourceUrl`).

**Solución:** instalar el driver adapter de Postgres:

```bash
npm install --prefix /Users/fabricionavarretetellez/Documents/blue-book \
  @prisma/adapter-pg pg
npm install --prefix /Users/fabricionavarretetellez/Documents/blue-book \
  -D @types/pg
```

Y construir el cliente así:
```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });
```

### 10. Seed de tags pre-cocidos

**`prisma/seed.ts`**: pobla la tabla `Tag` con 12 moods + 12 contextos en español.

```bash
npm install --prefix /Users/fabricionavarretetellez/Documents/blue-book -D tsx
npx prisma db seed
```

Tags poblados:

**Moods** (12): nostálgico, eufórico, melancólico, esperanzado, enamorado, roto, introspectivo, enérgico, relajado, ansioso, empoderado, soñador.

**Contextos** (12): noche, manejando, gym, estudiando, trabajando, corriendo, fiesta, caminando, desvelado, cocinando, viaje, en cama.

El script usa `upsert` por slug — es **idempotente**: puedes correrlo varias veces sin duplicar.

### 11. Cliente compartido para Next.js

**`src/lib/db.ts`**: singleton para reutilizar la misma instancia de PrismaClient entre hot-reloads de desarrollo.

```ts
import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

export const prisma = globalThis.__prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;
```

**`server-only`** es un paquete que tira un error en build si alguien importa este módulo desde un client component. Previene fugas de credenciales al frontend.

**El singleton via `globalThis`** evita que cada hot-reload de Next.js abra una conexión nueva. Sin esto, en 5 minutos de desarrollo abrirías 50+ conexiones y Supabase te bloquearía.

### 12. Verificación de tipos y commit

```bash
npx tsc --noEmit          # type-check sin generar archivos
git add -A
git commit -m "feat(db): aplicar migración inicial + seed de tags + cliente compartido"
git push origin main
```

## Estado final del Día 2

**Tablas en Supabase:**
- `User`, `Entry`, `Follow`, `Tag`, `EntryReaction`, `SpotifyCache`
- `Tag` con 24 filas (12 MOOD + 12 CONTEXT)

**Archivos nuevos en el repo:**
- `prisma/schema.prisma` (7 modelos + 2 enums)
- `prisma/seed.ts`
- `prisma/migrations/20260502042112_init/migration.sql`
- `prisma/migrations/migration_lock.toml`
- `prisma.config.ts` (modificado)
- `src/lib/db.ts`

**Variables en `.env` (no committeado):**
- `DATABASE_URL` — pooler 6543
- `DIRECT_URL` — puerto 5432
- `AUTH_SECRET` — generado con `openssl rand -base64 32`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

**Comandos útiles para retomar mañana:**

```bash
# Inspeccionar la DB visualmente
npx prisma studio

# Después de cambiar el schema
npx prisma migrate dev --name <nombre_descriptivo>
npx prisma generate

# Re-correr el seed (idempotente)
npx prisma db seed

# Type-check del proyecto
npx tsc --noEmit
```

## Lecciones técnicas (no obvias)

1. **Passwords URL-safe son obligatorias para connection strings.** Usar siempre el botón "Generate password" de Supabase.
2. **Prisma 7 rompió APIs comunes:**
   - `url`/`directUrl` salieron del schema → van a `prisma.config.ts`.
   - `new PrismaClient()` exige `adapter` o `accelerateUrl`.
   - El cliente se genera en TS, no JS.
3. **El connection pooler es necesario para producción serverless** pero no funciona para migraciones — por eso necesitamos las dos URLs.
4. **`server-only` y singleton via `globalThis`** son patrones obligatorios en Next.js + Prisma para no quemar conexiones.

## Pendientes (van a Día 3)

- Configurar Auth.js v5 con provider credentials (email + password con bcrypt).
- Configurar provider opcional de Spotify OAuth.
- Crear pantallas mínimas `/login` y `/register`.
- Endpoint `/api/me` con sesión.
