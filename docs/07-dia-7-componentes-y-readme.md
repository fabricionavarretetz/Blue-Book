# Día 7 — Componentes UI base + favicon + README (cierre de Semana 1)

**Fecha:** 2026-05-02
**Objetivo:** dejar el proyecto presentable para retomarlo en Semana 2 sin fricción. Primitivas UI reutilizables, favicon propio, metadata correcta, README con setup completo. Sin diseño visual final — eso viene cuando integremos Claude Design.

---

## Contexto

Días 1-6 dejaron la app **funcional** end-to-end (auth, DB, Spotify, deploy en producción). Pero la base de código tenía duplicaciones (estilos de botón e input repetidos en cada form), faltaba favicon propio, y el README era el genérico de `create-next-app`.

Día 7 es housekeeping: que el repo abierto en frío sea entendible para alguien nuevo (incluido tu yo de la Semana 4).

## Conceptos clave

### Componentes "primitivos" vs componentes de feature

- **Primitivos** (`src/components/ui/`): elementos básicos, agnósticos al producto. Ejemplos: `Button`, `InputField`, `Card`. Reusables en cualquier feature.
- **Feature** (`src/app/<feature>/components/...`): componentes específicos de una página o funcionalidad. Ej. `LoginForm`, `RegisterForm`. Viven cerca de la ruta donde se usan.

Regla pragmática: si un componente se usa **en 2+ lugares**, sube a `ui/`. Si es de una sola página, vive en la carpeta de esa página.

### Variantes de componente

Patrón estándar para componentes flexibles:
```ts
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  block?: boolean;
};

const VARIANTS: Record<Variant, string> = {
  primary: "bg-stone-900 text-white hover:bg-stone-800 ...",
  secondary: "border border-stone-300 ...",
  ghost: "text-stone-500 ...",
};
```

Trade-off: legible y type-safe, pero menos extensible que un sistema con tokens (CSS variables + slots). Para MVP, suficiente.

### Convención de favicon en Next.js (App Router)

Si pones un archivo llamado **`icon.svg`** (o `icon.png`, `apple-icon.png`) en `src/app/`, Next.js lo detecta automáticamente y lo expone como favicon. No hay que tocar `<head>` ni `metadata`.

Reemplaza la convención antigua de `favicon.ico` en `public/`.

### `metadata` en `layout.tsx`

Next.js App Router permite definir metadata exportando un objeto `Metadata`:
```ts
export const metadata: Metadata = {
  title: { default: "...", template: "%s · Blue Book" },
  description: "...",
};
```

`title.template` se aplica a páginas hijas que exporten su propio `title` — produce automáticamente "Mi Diario · Blue Book", "Iniciar sesión · Blue Book", etc.

### `forwardRef` para componentes que envuelven inputs/buttons

```ts
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(props, ref) {
  return <button ref={ref} {...props} />;
});
```

Necesario para que el padre pueda pasar `ref` (ej. para focus programático). Sin `forwardRef`, el ref se pierde y muchas librerías (form managers, focus traps) dejan de funcionar.

## Lo que hicimos paso a paso

### 1. Primitivas UI

`src/components/ui/button.tsx`:
- 3 variantes: `primary` (sólido oscuro), `secondary` (borde + fondo blanco), `ghost` (sin fondo, texto suave).
- 2 tamaños: `sm`, `md` (default).
- Prop `block` para `width: 100%`.
- `forwardRef` para integración con form managers futuros.

`src/components/ui/input-field.tsx`:
- Label opcional arriba.
- Error opcional debajo (rojo, pequeño).
- Mismo borde/focus styles en todos los forms.

`src/components/ui/card.tsx`:
- Variantes: `solid` (default — borde gris + sombra suave) o `dashed` (para empty states).
- Padding consistente.

### 2. Refactor de páginas existentes

Antes:
```tsx
<input
  type="email"
  name="email"
  required
  className="rounded border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
/>
{error && <span className="text-xs text-red-600">{error}</span>}
```

Después:
```tsx
<InputField
  label="Email"
  type="email"
  name="email"
  required
  error={state?.fieldErrors?.email?.[0]}
/>
```

Los archivos `login-form.tsx`, `register-form.tsx`, `page.tsx` (home), `diary/page.tsx` ahora usan las primitivas. Líneas reducidas, estilos consistentes.

### 3. Favicon SVG custom

`src/app/icon.svg`: cuadrado dark stone con "BB" centrado, font-weight 700.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#1c1917"/>
  <text x="32" y="42" ... fill="#fafaf9" text-anchor="middle">BB</text>
</svg>
```

Eliminado `src/app/favicon.ico` (era el default de Next.js).

### 4. Metadata global

```ts
export const metadata: Metadata = {
  title: {
    default: "Blue Book — Tu diario de música",
    template: "%s · Blue Book",
  },
  description:
    "Captura los momentos de tu vida con música. Un diario, no un servicio de streaming.",
};
```

Y `<html lang="es">` (antes era `en`).

### 5. README del proyecto

Reescrito de cero con: descripción del producto, stack, setup local con prerrequisitos, lista completa de env vars con propósito de cada una, nota crítica sobre `127.0.0.1` vs `localhost` (Spotify OAuth 2.1), estructura de directorios anotada, links a manuales del `docs/`, URL de producción, roadmap a alto nivel.

### 6. Type-check + build local

```bash
npx tsc --noEmit       # ✓ sin errores
npm run build          # ✓ build exitoso, /icon.svg detectado como ruta estática
```

## Estado final del Día 7 (= cierre Semana 1)

### Estructura de carpetas final

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/{page,login-form}.tsx
│   │   └── register/{page,register-form}.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── diary/route.ts
│   │   ├── me/route.ts
│   │   ├── me/spotify/top-tracks/route.ts
│   │   ├── search/route.ts
│   │   └── tracks/[id]/route.ts
│   ├── diary/page.tsx
│   ├── globals.css
│   ├── icon.svg
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/{button,input-field,card}.tsx
├── lib/
│   ├── actions/{auth,spotify}.ts
│   ├── auth-guard.ts
│   ├── cache.ts
│   ├── db.ts
│   └── spotify.ts
├── auth.config.ts
├── auth.ts
├── proxy.ts
└── types/next-auth.d.ts

prisma/
├── migrations/
├── schema.prisma
└── seed.ts

docs/
├── README.md
└── 01..07 manuales por sesión

README.md (raíz)
```

### Lo que tienes funcionando

- App pública en https://blue-book-eight.vercel.app
- Auth email/password (registro + login).
- Búsqueda de canciones via Spotify Client Credentials.
- Endpoints API con cache, refresh de tokens, manejo de errores tipado.
- Protección de rutas con middleware edge + helpers server-side.
- Auto-deploy desde `main` via Vercel.
- Estructura de carpetas escalable.
- Documentación didáctica completa en `docs/`.

## Resumen de Semana 1

| Día | Hito |
|---|---|
| 1 | Scaffold Next.js + dependencias + git |
| 2 | DB Supabase + Prisma + migración + seed |
| 3 | Auth.js v5 con Credentials + Spotify OAuth opcional |
| 4 | Protección de rutas + Spotify OAuth funcional |
| 5 | Spotify proxy (search, tracks, top-tracks con refresh) |
| 6 | Deploy a Vercel (búsqueda funcional, OAuth diferido) |
| 7 | Componentes UI compartidos + favicon + README + cierre |

**Commits totales en Semana 1:** ~15
**Lecciones técnicas no obvias documentadas:** ~30 (en los manuales)
**Tiempo invertido:** estimado ~10-15 horas distribuidas

## Lecciones técnicas (no obvias)

1. **Convención de favicon de App Router**: archivo en `src/app/icon.svg` (o `icon.png`) → Next.js lo detecta automáticamente. No tocar `<head>`.

2. **`metadata.title.template`**: las páginas hijas que exporten su propio `title` se prefijan automáticamente con la plantilla. Reduce duplicación.

3. **`forwardRef` en primitivas**: aunque hoy no usemos refs, ponerlo desde el día uno evita refactorizaciones cuando integremos form managers o focus traps.

4. **`<html lang>` afecta SEO y screen readers**. Default `en` del scaffold no aplica a un producto en español.

5. **Refactor de duplicación es scope creep saludable**. Día 7 no añade features nuevas, pero reduce ~80 líneas y deja la base preparada para que Claude Design intercambie las primitivas sin romper páginas.

## Pendientes (Semana 2)

Semana 2 arranca el corazón del producto: **diary entry Level 1** — la pantalla donde el user busca canción, elige emoji, y guarda momento en ≤10 segundos.

Tareas concretas:
- Pantalla de creación de entry (FAB en home + modal con search Spotify).
- Server action para crear entry (`POST /api/entries`).
- Integración con `/api/search` (que ya tenemos) para autocomplete de tracks.
- Render de las entries reales en `/diary` (ya está la lista, falta data).
- Tests manuales del flow completo: search → select → emoji → save.

## Decisiones para Semana 2

Cuando arranquemos:
- **No** integrar Claude Design todavía. Primero tener el flow funcional con UI placeholder.
- **Solo Level 1** del diary entry esta semana. Level 2 (tags) y Level 3 (reflexión) son Semana 4-7.
- Mobile-first desde el primer commit del feature, aunque sea con CSS simple.
