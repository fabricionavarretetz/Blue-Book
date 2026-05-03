# Brief para Claude Design — Blue Book

> Este documento se pega como prompt inicial en Claude Design. Iterar desde ahí.

---

## El producto

**Blue Book** es un **diario íntimo de música**. NO es una plataforma de reseñas tipo Letterboxd, NO es un servicio de streaming, NO es una red social genérica. Es el lugar donde las personas capturan **momentos** de su vida vinculados a canciones — con la canción, un sentimiento, un contexto, y una reseña personal escrita en sus propias palabras.

La acción núcleo: el usuario escucha una canción que le pega, abre Blue Book, busca la canción, y guarda el momento. Después puede volver y revivir esos momentos.

## Tono y dirección visual

Cálido, íntimo, ligeramente imperfecto. Como abrir un cuaderno personal, no una app SaaS. Específicamente:

- **Cremas y beiges suaves** como fondo principal (#f3eee3, #faf6ec).
- **Sidebar oscuro azul nocturno** (#1a2547 → #0f1730) como contraste — evoca "noche, leer un libro".
- **Tipografía mixta:**
  - Sans (Inter) para títulos y UI funcional.
  - **Cursiva (Caveat)** para reseñas escritas por el user, marca, y notas decorativas. La cursiva es semántica: dice "esto es íntimo, esto es tuyo".
- **Tags coloreadas** (azules suaves para mood, cremas para contexto) en chips redondeados.
- **Texturas sutiles**: papel, polaroid pegada con cinta, anotaciones en margen.
- **Imagen ambiental** en sidebar (lago nocturno + montañas + luna).

NO usar: tonos puros (white, black), gradientes neón, glassmorphism agresivo, sombras pesadas, layouts corporativos.

## Componentes principales a generar

### 1. Sidebar (vertical, ~240px ancho, desktop)
- Marca "Blue Book" en cursiva grande (50px, dos líneas).
- Tagline cursivo: "un diario. tu música. tu historia."
- Nav links: Mi diario (active), Explorar, Personas, Historias, Timeline, Guardado.
- Imagen ambiental al pie (lago nocturno con luna y montañas — puede ser SVG decorativo).
- Avatar circular abajo + nombre + "ver perfil".

### 2. Header de página
- Título "Mi diario" en sans-serif gigante (~60px, font-weight 700).
- Subtítulo: "Cada canción guarda un momento. Cada momento te cuenta algo."
- **Anotación decorativa flotante** a la derecha en cursiva: "no es solo música, es todo lo que vivías cuando la escuchabas. ♥". Ligeramente rotada, sin caja, como escrita en margen.
- Botón pill negro: "+ Nueva entrada".
- Iconos circulares: search, menú.

### 3. New Entry Card (inline, no modal)
Card oscura azul nocturno con bordes muy redondeados. Contenido:
- Cover de la canción seleccionada (130×130px, radius 14).
- Nombre de la canción + artista debajo del cover.
- Pregunta principal: "¿Qué momento quieres guardar hoy?".
- Sección "¿Cómo te hizo sentir?" con 4-5 emojis grandes en botones cuadrados (~38×38) + uno "⋯" para más.
- Sección "¿Dónde o qué hacías?" con tags pill seleccionables (noche, estudiar, lluvia, +).
- Separador.
- Pregunta "¿Quieres escribir algo? (opcional)" + textarea con placeholder "Empieza a escribir tu recuerdo…".
- Botón circular send (➤) a la derecha.

### 4. Entry Card (timeline)
Card crema (#faf6ec) con border-radius 24px, padding generoso. Contiene:
- A la izquierda: cover de canción 110×110px con play button overlay sutil.
- Título de canción en uppercase bold.
- Nombre de artista debajo.
- Tags pill (mood + contexto).
- Línea de contexto en texto plano: "noche, lluvia, pensar en todo".
- **Reseña en cursiva (Caveat 24px)** — la pieza más importante visualmente.
- Botón "⋯" arriba a la derecha.

A la izquierda de la card, separada: **fecha grande** (día en 44px bold + mes en uppercase tracking + año en gris). Punto de timeline pequeño debajo.

### 5. Stats Footer (3 cards en grid)
- **Esta semana**: card oscura con mini bar chart + "+7 entradas vs semana pasada".
- **Tu mood promedio**: card crema con la palabra del mood en cursiva grande (~32px Caveat).
- **Top artista**: card crema con nombre del artista + número de entradas + avatar circular.

### 6. Time Tabs
Línea horizontal con: Día / Semana (active) / Mes / Año / Siempre. Tab activo subrayado. A la derecha, botón circular negro con icono de calendario.

### 7. Decoraciones extra
- **Polaroid pegada con cinta**: foto cuadrada 130×130 con padding blanco, ligeramente rotada (~6°), pegada con una "cinta" semitransparente arriba. Debe sentirse como puesta a mano sobre una entry. Aparece como elemento ocasional, no en cada entry.
- **Paper-rip**: borde inferior ondulado (efecto papel rasgado) cuando se transiciona a una sección oscura.

## Estados a considerar

- Loading (search en card de nueva entrada).
- Empty diary (primera vez, ninguna entry).
- Hover en cards.
- Activo / inactivo en tabs.
- Disabled en buttons.
- Focus de inputs (borde acentuado).

## Restricciones técnicas (importantes para handoff)

- **Stack receptor**: Next.js 16 + React 19 + TypeScript + Tailwind v4.
- **Server components** son el default; no agregar `"use client"` salvo que el componente lo necesite (form interactivo, animación).
- **Caveat** y **Inter** se cargan vía `next/font/google`.
- Tokens deben exponerse como **CSS variables** o **Tailwind theme extension** — no hard-coded en cada componente.
- Componentes deben ser **composables**: un `<EntryCard track={...} review={...} />` que reciba data por props, no markup hardcodeado.
- Mobile-first: la versión móvil debe colapsar el sidebar a un drawer/bottom nav, y la timeline-date pasa a estar arriba de cada card en vez de a la izquierda.

## Inspiración

- Letterboxd (concepto de "review" personal por item, identidad de log).
- Tumblr personal blogs de los 2010 (texturas papel, handwriting).
- Apple Journal / Day One (intimidad, no leaderboards).
- Anti-inspiraciones: Spotify Wrapped corporativo, Last.fm tablas de stats, Pinterest grid frío.

## Output esperado del handoff

- Sistema de design tokens (Tailwind theme + CSS vars).
- Componentes React/TSX para cada uno listado arriba.
- Vista completa de `/diary` armada con datos de ejemplo.
- (Opcional) versión mobile de la misma vista.

Cuando estés satisfecho, descarga el handoff bundle. El bundle se integrará en `src/components/` y `src/app/diary/page.tsx` del repo Blue Book.
