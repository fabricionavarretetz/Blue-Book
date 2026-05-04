# Día 8-9 — Base visual + crear y listar momentos

**Fecha:** 2026-05-02 a 2026-05-03
**Objetivo:** dejar la base visual del producto (sidebar nocturno + tipografía cálida) y el flow funcional de crear/listar momentos del diario. Al final del Día 9 debe ser posible registrar el primer momento real de la app y verlo en `/diary`.

---

## Contexto

Cierre de Semana 1 dejó el shell del producto (auth, DB, Spotify, deploy). Semana 2 arrancó con dos sub-objetivos:

1. **Base visual** acorde al mockup que Fabricio pidió (sidebar oscuro + cremas + cursivas para reseñas).
2. **Flow funcional** de creación de entries.

A la mitad de la sesión decidimos pausar la persecución de pixel-perfect del mockup (el SVG dibujado a mano alcanza ~85% pero no replica una ilustración profesional) y avanzar con funcionalidad. La imagen ambient del sidebar se resolvió usando un crop directo del mockup como `public/sidebar-ambient.png`.

## Conceptos clave

### `next/font/google` con múltiples familias

Next.js descarga, optimiza y self-hostea fuentes de Google sin FOUT (flash of unstyled text). Configuración en `layout.tsx`:

```ts
import { Inter, Caveat } from "next/font/google";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400","500","600","700","800"], display: "swap" });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["400","500","600","700"], display: "swap" });
```

Y en el `<html>`: `className={`${inter.variable} ${caveat.variable}`}`. Las CSS variables `--font-inter` y `--font-caveat` quedan disponibles globales y se mapean al theme de Tailwind v4 vía `@theme inline`.

### Design tokens en Tailwind v4

Tailwind v4 abandonó `tailwind.config.js`; los tokens se declaran directamente en CSS:

```css
@theme inline {
  --color-paper: #efe9d8;
  --color-night: #131e3d;
  --font-hand: var(--font-caveat), cursive;
}
```

Cualquier utility como `bg-paper`, `text-ink`, `font-hand` se genera automáticamente. La indirección via CSS variable (`var(...)`) permite cambiar tokens en runtime para temas oscuros/claros.

### Route groups en App Router

Carpetas con paréntesis (`(app)`, `(auth)`) son **route groups**. Sirven para agrupar rutas con un layout compartido **sin afectar la URL**:

```
src/app/(app)/diary/page.tsx     → URL: /diary
src/app/(app)/diary/new/page.tsx → URL: /diary/new
src/app/(app)/layout.tsx         → wrapping layout (sidebar + auth check)
```

El `(app)` no aparece en la URL. Es solo organización del filesystem.

### Server actions con FormData arrays

Las server actions reciben `FormData`. FormData no soporta arrays nativos (solo `string | File`). Patrón para tags:

```ts
// Cliente: serializa array como string
<input type="hidden" name="moodTags" value={tags.join(",")} />

// Server: parsea el string
const moodTags = formData.get("moodTags").toString().split(",").map(s => s.trim()).filter(Boolean);
```

Validación con zod. Importante: el servidor **NO confía** en lo que mande el cliente para datos sensibles — para `trackSnapshot`, busca el track en Spotify usando el `spotifyId` y construye el snapshot autoritativo.

### `useActionState` (React 19) con server actions

Patrón cliente para forms con feedback:

```tsx
const [state, formAction, pending] = useActionState(createEntryAction, undefined);
return (
  <form action={formAction}>
    {/* fields */}
    {state?.error && <p>{state.error}</p>}
    <button disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
  </form>
);
```

El return de la action es lo que `state` recibe en el siguiente render. Los redirects desde dentro de la action (`redirect("/diary")`) cancelan el ciclo y navegan.

### `allowedDevOrigins` en Next.js 16

Bug que costó horas diagnosticar. Next.js 16 bloquea por defecto el acceso a recursos `/_next/*` (incluyendo el bundle del cliente, HMR, RSC payloads) cuando el server se "identifica" como un origin pero el browser viene de otro. En dev local, el server bindea como `localhost` pero el user accede desde `127.0.0.1` para que Spotify OAuth funcione (Spotify rechaza `localhost` desde 2024). Esto se considera cross-origin → bloqueado → el bundle del cliente nunca se carga → los client components NO se hidratan.

Síntomas:
- Página renderiza HTML estático (server component se ejecuta).
- Inputs no responden a JS (event handlers nunca se enganchan).
- Console.log del cliente nunca aparece.
- Network tab muestra warnings de WebSocket HMR fallando.

Diagnóstico definitivo: el log del dev server muestra explícitamente:
```
⚠ Blocked cross-origin request to Next.js dev resource /_next/webpack-hmr from "127.0.0.1".
```

Fix:
```ts
// next.config.ts
const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
};
```

Reiniciar dev server. Bundle se carga, hidratación funciona, todo vuelve a la vida.

## Lo que hicimos

### 1. Tipografía + tokens

`src/app/layout.tsx`: Inter + Caveat via `next/font/google`.
`src/app/globals.css`: paleta paper cálida (#efe9d8 fondo, #faf6ec card) + noche profunda (#131e3d sidebar).

### 2. Sidebar nocturno

`src/components/layout/sidebar.tsx`:
- Width 192px (= ancho del sidebar en el mockup).
- Background gradient azul nocturno + imagen `public/sidebar-ambient.png` (crop de la zona ambient del mockup) anclada al pie.
- Marca cursiva "Blue Book" + tagline.
- 6 nav items con iconos SVG vectoriales (5 disabled como "pronto" hasta que existan las rutas).
- Avatar circular abajo con backdrop blur sobre la imagen.

### 3. Route group `(app)`

`src/app/(app)/layout.tsx`: layout compartido para rutas autenticadas.
- Aplica auth check (`requireAuth()`).
- Renderiza sidebar persistente.
- Wrapper flex que coloca contenido a la derecha.

`/diary` movido a `src/app/(app)/diary/`. URL no cambia.

### 4. Página de creación `/diary/new`

`src/app/(app)/diary/new/new-entry-form.tsx` (client component):
- Search input con debounce 300ms → `GET /api/search`.
- Lista de resultados con cover.
- Selección de track.
- Picker de 6 emojis defaults (🔥 💔 😭 ✨ 🌙 🌅) + input para custom.
- Tags (mood + contexto) como inputs comma-separated.
- Textarea de reflexión opcional (max 2000 chars — cambio del Day 3 schema, cap más generoso para que la reseña sea realmente expresiva).
- Submit → server action `createEntryAction`.

### 5. Server action `createEntryAction`

`src/lib/actions/entries.ts`:
- Validación zod del payload.
- **Build del trackSnapshot server-side**: pegamos a `/v1/tracks/:id` de Spotify (con cache Client Credentials del Día 5) y construimos un objeto `{name, artists, album, durationMs, isrc, externalUrl}` autoritativo.
- Crea Entry con `prisma.entry.create`.
- `revalidatePath("/diary")` + `redirect("/diary")`.

`deleteEntryAction` también incluida — protegida por ownership (`deleteMany where userId AND entry.id`).

### 6. `/diary` con entries reales

`src/app/(app)/diary/page.tsx`:
- Lista las entries del user con `prisma.entry.findMany`.
- Cada entry: cover (de `trackSnapshot.album.image`), título uppercase, artista, tags coloreados (mood azul + contexto crema), reflexión en cursiva Caveat (font-hand 20px), timestamp relativo ("hace 1 min", "ayer", "hace 3 días").
- Empty state cuando no hay entries → CTA al `/diary/new`.

### 7. El bug del cross-origin

Después de implementar todo lo anterior, las búsquedas en `/diary/new` no funcionaban. Diagnóstico:
1. Server endpoint `/api/search` funciona (verificado con curl).
2. Browser hace GET de `/diary/new` con 200 OK.
3. Pero NO hay request a `/api/search` desde el browser cuando se escribe en el input.
4. Console.log temporales no aparecían → componente cliente no se hidrataba.
5. Network tab del Inspector mostraba warnings de WebSocket HMR fallando.
6. Log del dev server reveló: `Blocked cross-origin request to /_next/webpack-hmr from "127.0.0.1"`.

Fix en `next.config.ts`:
```ts
allowedDevOrigins: ["127.0.0.1"]
```

Reinicio del dev server → cliente hidrata correctamente → todo funciona.

## Estado final

### Funcional end-to-end (validado en local)

1. Login con email/password.
2. Click en "+ Nueva entrada" en `/diary`.
3. Buscar canción Spotify (resultados live).
4. Seleccionar track.
5. Elegir emoji.
6. (Opcional) tags + reflexión.
7. Submit → entry guardada en DB → redirige a `/diary` mostrándola.
8. Las entries existentes se renderizan con cover, tags coloreados, reflexión en cursiva.

### Archivos nuevos

```
public/sidebar-ambient.png                                # crop del mockup
src/app/(app)/layout.tsx                                  # layout autenticado con sidebar
src/app/(app)/diary/page.tsx                              # /diary (movido + render real)
src/app/(app)/diary/new/page.tsx                          # /diary/new (server)
src/app/(app)/diary/new/new-entry-form.tsx                # form cliente
src/components/layout/sidebar.tsx                         # sidebar nocturno
src/lib/actions/entries.ts                                # createEntryAction + deleteEntryAction
```

### Archivos modificados

```
next.config.ts                                            # allowedDevOrigins fix
src/app/globals.css                                       # tokens cálidos + noche
src/app/layout.tsx                                        # fonts Inter + Caveat
```

### Archivo eliminado

```
src/app/diary/page.tsx                                    # movido a (app)/diary
src/components/decorative/sidebar-ambient.tsx             # SVG dibujado, reemplazado por PNG
```

## Lecciones técnicas (no obvias)

1. **`allowedDevOrigins`** es obligatorio cuando el dev y el browser usan hosts distintos (localhost vs 127.0.0.1). Sin él, los client components no se hidratan y el síntoma engaña — la página renderiza HTML pero el JS está dead.

2. **Server actions con FormData**: arrays se serializan como CSV o JSON string. zod valida del lado server. Trust nothing del cliente para datos críticos.

3. **`trackSnapshot` autoritativo**: el server busca el track en Spotify aunque el cliente "ya lo tiene". Cliente solo manda `spotifyId`. Esto evita que un atacante guarde entries con metadata falsa.

4. **Crop directo del mockup como asset** llegó a 100% fidelidad visual con cero esfuerzo de SVG art. Trade-off: imagen rasterizada vs vector. Para una zona estética del UI (sidebar ambient), la imagen es válida.

5. **`revalidatePath` antes de `redirect`** — sin el revalidate, el redirect a `/diary` muestra cache stale. Orden importa: `revalidatePath()` primero, luego `redirect()`.

## Pendientes (Día 10+)

- Edición y borrado de entries desde `/diary` (botón ⋯).
- Tags como chips clickables en lugar de comma-separated input.
- Validación visual del flow en mobile (sidebar colapsado).
- Considerar promover `/diary/new` a modal/drawer para reducir fricción (menos navegación).
- Polish visual del sidebar (la imagen ambient duplicaba avatar al inicio, se resolvió cropeando más arriba; quedan detalles finos).
- Consolidar logging en dev: el WebSocket HMR sigue dando warning aunque ya no bloquea — investigar si necesita config adicional.
