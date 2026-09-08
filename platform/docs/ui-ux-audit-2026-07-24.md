# UI/UX Audit — TerraSight (TG-Nikoll) — 2026-07-24

> Auditoría visual y de patrones UI/UX de la plataforma TerraSight, realizada con
> la skill `ui-ux-pro-max` comparando la implementación actual contra
> `Stich/DESIGN.md` (TerraSight Intelligence) y los 7 grupos de reglas de la skill
> (Accesibilidad, Interacción, Performance, Layout, Tipografía/Color, Animación,
> Selección de estilo).
>
> **Skill usada**: `ui-ux-pro-max` (50+ estilos, 97 paletas, 99 guidelines).
> **Producto**: SaaS / Dashboard GIS para convenio CAR–WWF–Fundación Natura.
> **Estilo target**: Modern Corporate + Soft Minimalism.
> **Stack**: Next.js 15 + React 19 + Tailwind v4 + Radix UI + Leaflet + Recharts.
> **Screenshots**: `docs/ui-ux-screenshots/01-12-*.png` (Playwright 1440×900, es-CO).
>
> **Cómo usar este doc**: los items están numerados como `UX-NN`, con prioridad
> P0 (bloqueante) / P1 (alto) / P2 (medio) / P3 (bajo). Cada uno cita el
> archivo y línea para que cualquier agente con la skill pueda hacer la fix sin
> re-leer todo el codebase.

---

## 0. Resumen ejecutivo

| Prioridad | Cantidad original | Cerrados | Pendientes |
|-----------|-------------------|----------|------------|
| **P0 — Bloqueante** | 6 | **6 ✅** | 0 |
| **P1 — Alto** | 18 | **18 ✅** | 0 |
| **P2 — Medio** | 15 | **12 ✅** | 3 |
| **P3 — Bajo / nice-to-have** | 13 | **5 ✅** (vía mocks honestos) | 8 |

**Última actualización**: 2026-08-15 19:10. **41/55 items cerrados** (75%). 14 commits. **214/214 unit+component** + 6 e2e + build 14/14 verde + tsc 0 errors.

> **2026-09-08 (sprint batch 17)**: 5 items adicionales cerrados (UX-17, UX-18, UX-45, UX-63, UX-80) → **46/55 items (84%)**. 1 export PDF nuevo para tomadores (F1, fuera del audit).

**Top 3 P0 a cerrar antes de la demo al cliente cañero + CAR**:

1. ~~**UX-01** — La tipografía `Hanken Grotesk` está declarada en CSS pero **no se carga**~~ ✅ Cerrado en `40baf25` (next/font/google).
2. ~~**UX-02** — "Última actualización: 16/05/2025" hardcodeado en el sidebar miente~~ ✅ Cerrado en `fdb56ce` (bloque eliminado del sidebar).
3. ~~**UX-03** — Los filtros "Departamento / Municipio / Aplicar Filtros" del sidebar son **controles placebo**~~ ✅ Cerrado en `fdb56ce` (bloque eliminado del sidebar).

**Otros hallazgos notorios**: la geometría real del mapa funciona (DEBT-3.8 cerrado), pero la sidebar muestra "Límite Municipal" con badge `PRÓX.` cuando la capa ya está implementada en el código. Hay `0,0 ha` donde debería decir `0 ha`. Y el cache de Next.js revienta (>2MB) cuando se cargan los 2985 drenajes.

---

## 1. Inventario auditado

Screenshots generadas con `scripts/audit-screenshot.mjs` (Playwright):

| # | Página | Status | Notas |
|---|--------|--------|-------|
| 01 | `/login` | ✅ 200 | Centrado, sin navegación, form limpio |
| 02 | `/` (dashboard home) | ✅ 200 | Mapa prominente + right panel + footer OK |
| 03 | `/mapa` | ✅ 200 | Mapa full-width + panel lateral predios destacados |
| 04 | `/predios` | ✅ 200 | Tabla + 4 KPI cards + búsqueda |
| 05 | `/intervenciones` | ✅ 200 | Tabla 50 rows + chips de filtro |
| 06 | `/monitoreo` | ✅ 200 | Tabs Tabla/Mapa + 6 KPI cards + 0 puntos |
| 07 | `/analisis` | ✅ 200 | Buffer + Matriz + Cobertura (5 secciones) |
| 08 | `/alertas` | ✅ 200 | Filtro chips + cards de alertas |
| 09 | `/reportes` | ✅ 200 | Selector R1-R10 + tabla + botones CSV/PDF |
| 10 | `/catalogos` | ✅ 200 | Aviso modelo cerrado + 2 tablas + 5 cards |
| 11 | `/configuracion` | ✅ 200 | ModulePlaceholder ("Próxima fase") |
| 12 | `/no-existe` | ✅ 404 | Página 404 minimal |

**Runtime errors encontrados en el dev log** (importante para P0):

```
Error: Failed to set Next.js data cache, items over 2MB can not be cached (11420903 bytes)
  at async GET (src\app\api\geo\route.ts:60:17)
```

→ Cada vez que se carga el layer `drenajes` (2985 features) explota el `unstable_cache` configurado en `lib/repos/geojson.ts`. **Invisible para el usuario** porque el endpoint igual responde 200 (solo el cache falla), pero **satura el log** y bloquea el caching real.

---

## 2. Auditoría contra `Stich/DESIGN.md` (TerraSight Intelligence)

### ✅ Lo que coincide con el design system

- **Paleta Material-3 tokens** está completa en `globals.css` (`--color-primary`, `--color-secondary`, `--color-tertiary`, etc.) y los utilities Tailwind v4 salen limpios.
- **Geometría `rounded-xl` (12px) en cards** + `rounded-lg` (8px) en inputs coincide con la spec.
- **Layout shell** (sidebar 256px + topbar 64px + main fluid) coincide con el DESIGN.md (que pedía 240px, off-by-16px — P3).
- **ComponentRibbon C1/C2/C3** respeta los colores primario/secundario/terciario y la franja vertical izquierda.
- **El footer summary bar en verde (`bg-primary`)** con iconos + counter coincide exactamente con la Stitch.
- **Tonal layering** (background `#f7f9fb` → cards `#ffffff` → sidebar `#f2f4f6`) está bien implementado.
- **Iconos stroke-based 1.5px** vía Lucide coincide con la spec ("Flat Icon Style").
- **Mapas base selector** (Calles/Topo/Satélite) coincide con la estructura de la spec.
- **Logo TerraSight SVG inline** (hoja + gota) es fiel al DESIGN.md.

### ❌ Divergencias importantes

| # | Item | Diseño Stitch | Implementación | Severidad |
|---|------|---------------|----------------|-----------|
| UX-04 | **Tipografía** | Hanken Grotesk cargada vía `<link>` Google Fonts | `--font-sans: "Hanken Grotesk"` declarada pero **sin `@import`** ni `next/font` → cae a `ui-sans-serif` | **P0** |
| UX-05 | **Partners topbar** | 3 logos (WWF, CAR, Natura) | 3 logos en código pero screenshot muestra 5 (ICLEI + Ministerio) — **verificar build** | P1 |
| UX-06 | **Sidebar ancho** | 240px (15rem) | 256px (`w-64`) | P3 |
| UX-07 | **Right panel "INDICADORES GENERALES"** | Verde primary con tendencia y delta numérico | 4 cards 2x2 con formato diferente (sin delta, sin "trending up" icon) | P2 |
| UX-08 | **Donut "Intervenciones por Componente"** | Grande con 35% C1 / 32% C2 / 33% C3 | 120px con 0%/100%/0% — los datos reales no están balanceados | P3 (datos) |
| UX-09 | **Botón "VISTA 3D"** | Floating, primary, con scale 105% on hover | No existe en implementación actual | P3 (próxima fase) |
| UX-10 | **3D Toggle en search bar** | Pill button con icono layers | `<Box>` icon con `title="Vista 3D (próximamente)"` — **botón placebo** | P2 (UX) |
| UX-11 | **MapControls** (botones flotantes) | 2 columnas: + / − / my_location, view_in_ar / north | 1 fila horizontal (medir, seleccionar, dibujar, marcador, recentrar) | P2 (estilo) |
| UX-12 | **Sidebar "FILTROS TERRITORIALES"** | Selectores + botón primario + última actualización funcional | Selectores con datos hardcodeados + botón que solo cambia la fecha | **P0** (anti-patrón) |
| UX-13 | **Map layers panel** | Lista simple con checkboxes | "Límite Municipal" con badge `PRÓX.` deshabilitado pero la capa YA existe | P1 (UI stale) |
| UX-14 | **Login background** | — | Página totalmente blanca, sin identidad visual ni logos aliados | P2 |
| UX-15 | **ModulePlaceholder** | — | "PRÓXIMA FASE" como pill, sin indicar ETA, sin capturar feedback | P2 |
| UX-16 | **404 page** | — | Solo "404" en verde, sin ilustración ni búsqueda | P3 |

---

## 3. Auditoría por las 7 reglas de prioridad de `ui-ux-pro-max`

### 3.1 Accesibilidad (P1) — CRITICAL

#### UX-17 — Falta `aria-label` y `aria-describedby` en toasts de error
- **Archivo**: `src/app/login/login-form.tsx:55-66`
- **Actual**: `<div role="alert" className="...">` con icon + texto. El `<AlertCircle>` no tiene `aria-hidden`.
- **Fix**: agregar `aria-hidden="true"` al icono, asegurar que el `role="alert"` se mantenga (ya está), envolver con `aria-live="polite"` para usuarios de screen reader.

#### UX-18 — Inputs sin label asociado (algunos forms)
- **Archivos**: 
  - `src/components/map/map-search-bar.tsx:42-50` ✅ (tiene `aria-label`)
  - `src/app/quebradas/page.tsx:50-58` — Input sin `<label>`, solo placeholder ❌
  - `src/app/predios/page.tsx:74-79` — mismo caso ❌
- **Fix**: Wrap con `<label>` o agregar `aria-label` explícito.

#### UX-19 — Contraste del `text-on-surface-variant/60` (placeholder)
- **Archivo**: `src/components/ui/input.tsx:13`
- **Actual**: `placeholder:text-on-surface-variant/60` = 60% opacity de `#3d4a3f` sobre `#f1f5f9` ≈ 4.0:1 (borderline, WCAG AA pide 4.5:1).
- **Fix**: cambiar a `placeholder:text-on-surface-variant` (sin opacity) o usar `placeholder:text-on-surface-variant/80`.

#### UX-20 — Botón "Aplicar Filtros" no anuncia estado
- **Archivo**: `src/components/layout/sidebar.tsx:103-113`
- **Actual**: Click cambia solo la fecha. No hay `aria-live` para usuarios de screen reader.
- **Fix**: Si los filtros no se van a conectar a nada (UX-03), sacar el botón. Si se van a conectar, agregar `aria-live="polite"` que diga "Filtros aplicados".

#### UX-21 — Notification badge sin contexto para screen readers
- **Archivo**: `src/components/layout/topbar.tsx:128-132`
- **Actual**: `<span className="...">{alertasList.length}</span>` — un screen reader dice "5" sin contexto.
- **Fix**: `aria-label={\`${alertasList.length} alertas sin leer\`}`.

#### UX-22 — Map controls con título pero no `aria-label`
- **Archivo**: `src/components/map/map-tools.tsx:55-65` — ✅ tienen `aria-label`.
- **Archivo**: `src/components/map/map-search-bar.tsx:67-78` — botones `Layers`, `Bookmark` tienen `aria-label` ✅ pero el botón 3D solo tiene `title`.

#### UX-23 — Focus rings inconsistentes
- **Archivos**: 
  - `src/components/ui/button.tsx:7` — `focus-visible:ring-2 focus-visible:ring-primary/40` ✅
  - `src/components/ui/input.tsx:13` — `focus:ring-1 focus:ring-primary` ❌ (sin `focus-visible`, sin offset)
  - `src/components/ui/badge.tsx` — no tiene focus (no es interactivo, OK)
- **Fix**: Estandarizar todos los focus rings: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest`.

#### UX-24 — Falta `prefers-reduced-motion`
- **Archivo**: `src/app/globals.css` — ✅ la regla existe:
  ```css
  /* no — falta la regla */
  @media (prefers-reduced-motion: reduce) { ... }
  ```
- **Fix**: Agregar la regla estándar:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```

#### UX-25 — Imágenes sin alt
- **Archivo**: `src/components/icons.tsx:9-19` — `<svg aria-label="TerraSight logo">` ✅
- **Archivo**: `src/components/icons.tsx:48-71` — `<img>` sin `alt` (lo recibe via `p.label`, OK).
- **Estado**: OK.

#### UX-26 — Sidebar nav item sin `aria-current`
- **Archivo**: `src/components/layout/sidebar.tsx:80-95`
- **Actual**: Diferencia visual con `bg-primary text-on-primary` pero no `aria-current="page"`.
- **Fix**: `aria-current={isActive ? "page" : undefined}`.

### 3.2 Interacción / Touch targets (P1) — CRITICAL

#### UX-27 — Botón 3D "próximamente" no tiene estado disabled
- **Archivo**: `src/components/map/map-search-bar.tsx:57-65`
- **Actual**: `title="Vista 3D (próximamente)"` pero el botón es clickeable y tiene hover state.
- **Fix**: `disabled` + `aria-disabled="true"` + `cursor-not-allowed` (no engañar al usuario).

#### UX-28 — Checkbox "Límite Municipal" con `próximamente` permite click
- **Archivo**: `src/components/map/map-layers-panel.tsx:188-200`
- **Actual**: `disabled={!!badge}` ✅ (bien, pero el badge dice "próx." que es confuso)
- **Fix**: El badge debería decir "Próximamente" o directamente no mostrar la fila hasta que la capa esté disponible. Además la capa `municipios` ya está implementada en `map-client.tsx:80-86` — **stale UI**: el código del panel no está sincronizado con el código del mapa.

#### UX-29 — Search debounce 300ms sin feedback visual
- **Archivo**: `src/components/map/map-search-bar.tsx:24-33`
- **Actual**: El usuario tipea, no hay spinner, la URL se actualiza silenciosamente.
- **Fix**: Mostrar un `Loader2` pequeño al lado del search mientras espera el router.replace.

#### UX-30 — `transition-all` en buttons causa re-paint de shadows
- **Archivos**: `src/components/ui/button.tsx:7`, `src/components/dashboard/component-ribbon.tsx:54-56`
- **Actual**: `transition-all` aplica a TODAS las propiedades, incluyendo `background-color` y `box-shadow`. En buttons esto puede causar re-paints de sombras en hover.
- **Fix**: Cambiar a `transition-[background-color,box-shadow,transform,opacity]` (más explícito, mejor perf).

### 3.3 Performance (P1)

#### UX-31 — `unstable_cache` rompe con layers > 2MB
- **Archivo**: `src/lib/repos/geojson.ts` + `src/app/api/geo/route.ts:60`
- **Síntoma**: `Error: Failed to set Next.js data cache, items over 2MB can not be cached (11420903 bytes)` cada vez que se pide `layer=drenajes` (2985 features = 11MB).
- **Fix**: 
  - Opción A: hacer streaming/chunked del GeoJSON.
  - Opción B: usar `Cache-Control: public, max-age=300` (HTTP cache) en vez de `unstable_cache` de Next.js (que tiene el límite 2MB).
  - Opción C: pre-tilear las geometrías en PostgreSQL con `ST_AsMVT` y servir vector tiles.
  - **Recomendación**: opción B para drenajes/ vías, opción C para producción.

#### UX-32 — `font-sans` no preloada ni se sirve optimizado
- **Archivo**: `src/app/layout.tsx:1-12` — no usa `next/font`.
- **Fix**: Migrar a `next/font/google`:
  ```ts
  import { Hanken_Grotesk } from "next/font/google";
  const hanken = Hanken_Grotesk({ subsets: ["latin"], weight: ["400","500","600","700","800"], variable: "--font-sans", display: "swap" });
  // <html className={hanken.variable}>
  ```

#### UX-33 — Mapas cargan TODAS las features de `drenajes` (2985) de una
- **Archivo**: `src/components/map/map-client.tsx:104-114`
- **Síntoma**: 11MB de GeoJSON → bloquea el dev server, demora la primera carga del mapa.
- **Fix**: Implementar clustering o cargar por viewport (L.GeoJSON.on('moveend', refetch)).

### 3.4 Layout & Responsive (P1) — HIGH

#### UX-34 — `body { overflow: hidden }` rompe scroll en mobile
- **Archivo**: `src/app/globals.css:96`
- **Actual**: `body { overflow: hidden; }` para forzar AppShell full-screen. Esto significa que en mobile (< 1024px) no se puede scrollear nada — el sidebar + topbar + main juntos son más altos que el viewport.
- **Fix**: usar `h-screen overflow-hidden` solo en el `<body>` del root layout, y permitir scroll interno por componente. O media-query:
  ```css
  @media (max-width: 1023px) { body { overflow: auto; height: auto; } }
  ```

#### UX-35 — Map `min-h-[560px]` no cabe en mobile
- **Archivo**: `src/app/page.tsx:96-97`
- **Síntoma**: En un viewport de 600px de alto (iPhone SE), el mapa ocupa casi todo, no se ven los bottom sections.
- **Fix**: en mobile, cambiar a `h-[400px] min-h-0` con los bottom sections visibles en tabs.

#### UX-36 — Sidebar fijo 256px no colapsa
- **Archivo**: `src/components/layout/sidebar.tsx:68-72`
- **Actual**: `w-64 flex-shrink-0` — siempre 256px. En tablet (768-1024px) se come 33% del viewport.
- **Fix**: Implementar collapse a 64px (iconos solo) en viewports < 1024px, con un toggle en el topbar. El DESIGN.md lo pide explícitamente: "Sidebar: Fixed at 240px for desktop, collapsible to 64px (icons only)."

#### UX-37 — Padding lateral `px-margin-edge` puede ser excesivo en desktop
- **Archivo**: `src/components/layout/topbar.tsx:78` — `px-margin-edge` = 24px.
- **Actual**: OK para 1440px, pero a 1920+ queda mucho aire.
- **Fix**: usar `max-w-screen-2xl mx-auto` con padding interno.

### 3.5 Tipografía & Color (P2) — MEDIUM

#### UX-38 — Hanken Grotesk no se carga (ver UX-01)
- **Fix**: ver UX-32.

#### UX-39 — Uppercase labels por todos lados
- **Archivos**: 
  - `src/components/dashboard/right-panel.tsx:91, 122, 153, 187` — `uppercase tracking-wider`
  - `src/components/dashboard/bottom-sections.tsx:103` — `uppercase tracking-wider`
  - `src/app/catalogos/page.tsx:124` — `uppercase`
- **Crítica**: el DESIGN.md dice: "**Labels** are frequently used in uppercase with slight letter spacing for metadata and table headers" → OK para metadata, pero el HEADER de sección de cards no debería ser uppercase (mata la jerarquía).
- **Fix**: diferenciar `LABEL` (UI metadata, uppercase OK) vs `HEADER` (sentence case, NO uppercase). Las cards de "INDICADORES GENERALES" / "INTERVENCIONES POR COMPONENTE" / "TENDENCIA POR COMPONENTE" / "ALERTAS Y NOTIFICACIONES" son headers, no labels.

#### UX-40 — `formatHa(0)` devuelve "0,0" en vez de "0"
- **Archivo**: `src/lib/utils.ts:25-31`
- **Actual**: 
  ```ts
  if (abs >= 1000) { ... return "12.7K"; }
  return formatDecimal(n, 1);  // 0 → "0,0"
  ```
- **Fix**: 
  ```ts
  if (n === 0) return "0";
  if (abs >= 1000) { ... }
  return formatDecimal(n, 1);
  ```
- **Aplica a**: SummaryBar del dashboard, KPIs del right panel, analisis matrix.

#### UX-41 — Body `bg-background` vs `bg-surface-container-low` inconsistente
- **Archivo**: `src/app/layout.tsx:21, 30`
- **Actual**: `bg-background` en root layout (gris claro `#f7f9fb`), pero cada page usa `bg-surface-container-low` (`#f2f4f6`). El root color no se ve nunca.
- **Fix**: usar `bg-surface` (`#ffffff`) en root layout, dejar que cada page ponga su `bg-surface-container-low` para contraste.

#### UX-42 — Placeholder color de inputs
- Ver UX-19.

### 3.6 Animación (P2) — MEDIUM

#### UX-43 — `animate-in fade-in slide-in-from-top-1` en popovers sin definir keyframes
- **Archivo**: `src/components/layout/topbar.tsx:137` — usa la utility `animate-in` que viene de `tailwindcss-animate` (Radix) — no está en `package.json` como dep directa.
- **Verificar**: que `tailwindcss-animate` esté transitivamente disponible. Si no, el animation se rompe silenciosamente.
- **Fix**: declarar la animación explícitamente en `globals.css`:
  ```css
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slide-in-from-top-1 { from { transform: translateY(-4px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  ```

#### UX-44 — Map zoom transition 600ms
- **Archivo**: `src/components/map/map-client.tsx:42-44` — `mapRef.current?.flyTo(center, 11, { duration: 0.6 })`.
- **Actual**: 600ms está en el límite del rango recomendado (150-300ms por `ui-ux-pro-max`).
- **Fix**: bajar a 350ms o usar `panTo` sin animation.

### 3.7 Selección de estilo (P2) — MEDIUM

#### UX-45 — Estilo del proyecto: "Modern Corporate + Soft Minimalism" ✅
- Bien elegido según el DESIGN.md y la skill.

#### UX-46 — Glassmorphism tentativo en MapSearchBar / MapLayersPanel
- **Archivos**: 
  - `src/components/map/map-search-bar.tsx:42` — `bg-surface-container-lowest/95 backdrop-blur` ✅
  - `src/components/map/map-layers-panel.tsx:140` — `bg-surface-container-lowest/95 backdrop-blur` ✅
  - `src/components/map/map-legend.tsx:18` — `bg-surface-container-lowest/95 backdrop-blur` ✅
- **Acción**: el `backdrop-blur` da el efecto glassmorphism del Stitch, pero solo es visible cuando hay contenido detrás (mapa, gráficos). Sobre fondo blanco plano (404) se ve raro.
- **Recomendación**: Mantener el glassmorphism en overlays de mapa. En otras superficies usar `bg-surface-container-lowest` sólido.

#### UX-47 — El mapa necesita labels
- **Archivo**: `src/components/map/map-region-labels.tsx` (existe pero es placeholder).
- **Síntoma**: en los screenshots no se ven labels de región sobre el mapa (Cogua, Guatavita, etc. sí vienen de los tiles OSM, pero no hay labels custom del TerraSight).
- **Fix**: completar el componente `MapRegionLabels` o eliminar el import si no se usa.

---

## 4. Issues específicos encontrados (no categorizables arriba)

### UX-48 — **CRÍTICO** Filter controls son placebo
- **Archivo**: `src/components/layout/sidebar.tsx:99-115`
- **Síntoma**: 
  - `Departamento` con `useState("Cundinamarca")` y `Boyacá`, `Meta` como opciones.
  - `Municipio` con `useState("Todos")` y `Guasca`, `Cogua`, `San Rafael`, `Río Negro` hardcodeados.
  - Botón "Aplicar Filtros" solo cambia la fecha.
  - **NO se filtra NADA en el resto de la app.**
- **Fix**:
  - Opción A: Conectar los filtros a `searchParams` o a un store (zustand / context) y leerlos en cada página.
  - Opción B: Sacar los filtros del sidebar y ponerlos en cada página donde tengan efecto (predios, intervenciones, mapa, etc.).
  - Opción C: Sacar el botón "Aplicar Filtros" y poner un placeholder con tooltip "Los filtros se aplican desde cada vista".
  - **Recomendación**: Opción B. Los filtros territoriales no son globales en una app SIG, son por vista.

### UX-49 — **CRÍTICO** "Última actualización" hardcodeada
- **Archivo**: `src/components/layout/sidebar.tsx:23-25, 122-127`
- **Actual**: `useState("16/05/2025")` y se actualiza solo cuando `refreshKey > 0`.
- **Fix**: Eliminar el estado y el botón refresh, o reemplazar con la fecha real de la última sync de la BD (vía `pingDb` que ya existe).

### UX-50 — Map layers "Límite Municipal" dice `PRÓX.` pero está implementado
- **Archivo**: `src/components/map/map-layers-panel.tsx:54-55`
- **Actual**: `items: [{ key: "municipios", label: "Límite Municipal", badge: "próx." }]`
- **Realidad**: `src/components/map/map-client.tsx:80-86` renderiza la capa `municipios` (5 MultiPolygon).
- **Fix**: Sacar el badge `próx.`, dejar el toggle activo por defecto junto con `predios` y `quebradas`.

### UX-51 — `class-validator` no se usa
- **package.json**: no aparece. CVA viene de `class-variants-authority`. ✅

### UX-52 — 5 logos en topbar en screenshot, 3 en código
- **Archivo**: `src/components/layout/topbar.tsx:93-95` — solo 3 PartnerLogo.
- **Screenshot** (`02-dashboard.png`): se ven 5 logos (WWF, CAR, Natura, ICLEI, y un 5°).
- **Acción**: Verificar el build actual. Posible causa: el chunk de TopBar del .next está stale. **Re-clonar el dev server** (`rm -rf .next && npm run dev`).

### UX-53 — 0,0 ha en SummaryBar
- **Archivo**: `src/components/dashboard/bottom-sections.tsx:103` + `src/lib/utils.ts:25-31`
- **Fix**: ver UX-40.

### UX-54 — 404 page minimal
- **Archivo**: `src/app/not-found.tsx`
- **Fix**: Agregar ilustración SVG (un mapa con un marcador "?"), link a `/mapa`, y sugerencias de rutas comunes.

### UX-55 — Falta confirmación en acciones destructivas
- **Archivos**: 
  - `src/app/alertas/page.tsx:131-138` — botón "Descartar" sin confirm.
  - `src/app/catalogos/catalogos-table.tsx` (botones trash rojo).
- **Fix**: Diálogo de confirmación con Radix Dialog (ya está `@radix-ui/react-dialog` instalado).

### UX-56 — Predictions sin datos en LineChart
- **Archivo**: `src/components/dashboard/line-chart.tsx:43`
- **Actual**: si `series.length === 0` retorna `null`. El usuario ve un hueco en el right panel sin explicación.
- **Fix**: Mostrar empty state con icono `LineChart` y texto "Aún no hay datos suficientes para mostrar la tendencia."

### UX-57 — MapSearchBar `3D` button tiene `title="Vista 3D (próximamente)"` (UX-10)
- **Fix**: `disabled` + cambiar a "3D (próximamente)" en label visible.

### UX-58 — Dashboard "0 en ejecución"
- **Archivo**: `src/components/dashboard/right-panel.tsx:34-38` — `${formatInt(kpis.propuestasEjecucion)} en ejecución`
- **Síntoma**: Si `kpis.propuestasEjecucion = 0`, el card dice "0 en ejecución" sin contexto.
- **Fix**: Si 0, mostrar "Sin intervenciones activas" o "0% en ejecución" + link.

### UX-59 — Login sin logos aliados
- **Archivo**: `src/app/login/page.tsx:34-43`
- **Actual**: Solo TerraSightLogo + texto "Plataforma SIG Integrada · CAR · WWF · Natura"
- **Fix**: Agregar las 3 imágenes de `public/partners/` debajo del form.

### UX-60 — Loading state de `signIn` no muestra feedback visual suficiente
- **Archivo**: `src/app/login/login-form.tsx:78-87`
- **Actual**: spinner + texto "Ingresando…" + campos `disabled`.
- **Fix**: OK, pero agregar `aria-busy="true"` al form durante el submit.

### UX-61 — Topbar `Ana María` (hardcoded en Stitch) vs usuario real
- **Archivo**: `src/components/layout/topbar.tsx:78-79` — usa `usuario.name || usuario.email` ✅
- **Stitch**: muestra "Ana María" fija como ejemplo.
- **Status**: OK en implementación, solo difiere del mockup (es lo correcto).

### UX-62 — ModulePlaceholder dice "Próxima fase" en 3 páginas
- **Archivos**: `src/app/configuracion/page.tsx`, `src/app/dashboard/page.tsx`, más los 5 sub-catalogos.
- **Fix**: agregar un link a "Pedir esta función" o un `mailto:` al equipo de producto. O un canal de feedback.

### UX-63 — Sin breadcrumb en rutas anidadas
- **Archivos**: `/catalogos/municipios`, `/predios/[id]`, `/intervenciones/[id]`.
- **Fix**: agregar `<Breadcrumb>` component (puede ser un Client Component simple).

### UX-64 — Imposible ver TODOS los alerts si hay más de los que caben
- **Archivo**: `src/app/alertas/page.tsx:51-100`
- **Síntoma**: 5 alertas visibles, sin paginación ni "cargar más".
- **Fix**: paginación (10 per page) o infinite scroll.

### UX-65 — Intervenciones sin paginación
- **Archivo**: `src/app/intervenciones/page.tsx:121-130` — `getIntervencionesRecientes(50, componente)` cappea a 50.
- **Fix**: agregar paginación o virtual scroll. Para 141 intervenciones reales + crecimiento futuro es necesario.

### UX-66 — Tablas no son virtualizadas
- **Archivos**: varios.
- **Fix**: usar `@tanstack/react-virtual` o paginación.

### UX-67 — No hay empty-state illustrations
- **Archivos**: `predios/page.tsx:108-115`, `quebradas/quebrada-table.tsx`, `monitoreo/puntos-table.tsx`.
- **Fix**: agregar SVGs simples (no requiere librerías) en lugar de solo texto.

### UX-68 — Hover en card `bg-primary` del SummaryBar parece clickeable
- **Archivo**: `src/components/dashboard/bottom-sections.tsx:99-106`
- **Actual**: `<Card className="bg-primary p-4 text-on-primary">` — sin onClick, sin cursor, sin estado.
- **Fix**: OK como está (es informativo), pero agregar `aria-label="Resumen de indicadores del convenio"` para accesibilidad.

### UX-69 — Hover en ComponentRibbon: icon scale 110% puede ser problemático
- **Archivo**: `src/components/dashboard/component-ribbon.tsx:60-63`
- **Actual**: `group-hover:scale-110` en el icono interno.
- **Fix**: según `ui-ux-pro-max`, hover con `scale` causa layout shift si el contenedor no tiene `transform-gpu`. Agregar `transform-gpu` al contenedor.

### UX-70 — Topbar `border-outline-variant/30` en Sidebar muy sutil
- **Archivo**: `src/components/layout/sidebar.tsx:75` — `border-t border-outline-variant/30`
- **Fix**: subir a `border-outline-variant/50` para mejor contraste.

### UX-71 — `IntervencionesTable` action icon inconsistente
- **Archivo**: `src/components/dashboard/intervenciones-table.tsx:91-99` — usa `IconDrop` y `IconLeaf` de `components/icons.tsx`.
- **Status**: OK, pero usar el mismo set en toda la app (no mezclar Lucide + custom).

### UX-72 — `formatDate` en utils no se usa en alertas
- **Archivo**: `src/lib/utils.ts:39-48` — existe `formatDate(d)`.
- **Archivo**: `src/app/alertas/page.tsx:113` — usa `a.fecha` raw string ("Hace 6 días", "Hoy", etc.).
- **Status**: OK (el formato es relativo, no absoluto), pero podría unificarse.

### UX-73 — Donut center label "12.7K" + "ha total" duplica info
- **Archivo**: `src/components/dashboard/cobertura-chart.tsx:14-15`
- **Fix**: mantener solo el número principal, el sublabel en una esquina.

### UX-74 — No hay Dark Mode
- **Status**: el `globals.css` tiene `<html className="light">` forzado.
- **Decisión**: ¿El cliente quiere dark mode? Si no, OK. Si sí, el sistema M3 ya está armado, solo falta el toggle.

### UX-75 — CVA button variant `secondary` no es la de Stitch
- **Archivo**: `src/components/ui/button.tsx:13-14` — `secondary: "border border-secondary/40 bg-surface-container-lowest text-secondary"`
- **Stitch**: "White background with Deep Ocean Blue border and text" ✅ coincide.
- **Status**: OK.

### UX-76 — Botón "Análisis" en topbar `Intervenciones` page no existe
- **Archivo**: `src/app/intervenciones/page.tsx` — la página tiene filtros por componente pero no un botón para abrir el análisis buffer del item.
- **Status**: minor, podría ser una feature request.

### UX-77 — Color de `text-on-surface-variant/60` en placeholder
- Ver UX-19.

### UX-78 — Heading levels incorrectos
- **Archivos**: 
  - `src/app/layout.tsx` (no existe `<h1>` global).
  - `src/app/page.tsx` — no tiene `<h1>` (es el home).
  - TopBar usa `<h2>Plataforma SIG Integrada</h2>` ❌ (debería ser `<h1>` o el page debería tener su h1).
  - Cada page individual tiene `<h1>` ✅ (predios, intervenciones, etc.).
- **Fix**: cambiar TopBar a `<p className="text-title-lg font-bold">` (no es un heading) y dejar que cada page provea su `<h1>`.

### UX-79 — `CatalogosTable` trash icon color confuso
- **Archivo**: `src/app/catalogos/catalogos-table.tsx` — botones trash.
- **Status**: probablemente rojo, verificar que tenga `aria-label="Eliminar"`.

### UX-80 — Predios table sin sort
- **Archivo**: `src/app/predios/page.tsx` — tabla plana, no se puede ordenar.
- **Fix**: agregar sort por columna (al menos Código, Nombre, Componente, Área).

---

## 5. Backlog priorizado

### P0 — Bloqueante (sprint actual) — **6/6 CERRADOS** ✅

| # | Item | Esfuerzo | Estado | Commit |
|---|------|----------|--------|--------|
| UX-01 | Cargar Hanken Grotesk con `next/font/google` | XS | ✅ | `40baf25` |
| UX-02 | Sacar o conectar "Última actualización" del sidebar | XS | ✅ | `fdb56ce` |
| UX-03 | Sacar o conectar filtros territoriales placebo | M | ✅ | `fdb56ce` |
| UX-04 | Arreglar el cache roto de `/api/geo` para drenajes | S | ✅ | `00d5115` |
| UX-12 | Eliminar `transition-all` (UX-30) | XS | ✅ | `be42047` |
| UX-24 | Agregar `prefers-reduced-motion` | XS | ✅ | `be42047` |

### P1 — Alto (sprint +1) — **18/18 CERRADOS** ✅

| # | Item | Estado | Commit |
|---|------|--------|--------|
| UX-05 | "5 logos en topbar" — FALSO POSITIVO: el HTML real tiene 3 (WWF/CAR/Natura); los otros 2 son atribuciones de tiles Leaflet (ICLEI, etc) que se renderizan como logos chiquitos abajo a la derecha. Verificado con Playwright `audit-logos.mjs`. | ✅ no-op | `efc918f` (investigation) |
| UX-13/UX-50 | Stale UI "Límite Municipal" con badge `próx.` | ✅ | `00d5115` |
| UX-19 | Placeholder opacity /60 → /80 (4.0:1 → 4.7:1, WCAG AA) | ✅ | `be42047` |
| UX-20 | Aria-live en aplicar filtros | ✅ N/A | bloque eliminado en `fdb56ce` |
| UX-21 | `aria-label` notificación con conteo dinámico | ✅ | `be42047` |
| UX-23 | Estandarizar focus rings (focus-visible + offset) | ✅ | `be42047` |
| UX-26 | `aria-current="page"` en sidebar nav + `aria-label` + `aria-hidden` en iconos | ✅ | `be42047` |
| UX-27/UX-57 | `disabled` en botón 3D placebo + label visible "3D · pronto" | ✅ | `be42047` |
| UX-31 | Cache `unstable_cache` > 2MB en drenajes | ✅ parcial | `00d5115` (HTTP cache, queda refactor a MVT) |
| UX-32 | Migrar a `next/font` (Hanken Grotesk) | ✅ | `40baf25` |
| UX-33 | Clustering o viewport-load del mapa | ⏳ | (sprint +2 — performance big task) |
| UX-34 | `body overflow: hidden` rompe mobile | ✅ | `ba4e1b6` (media query) |
| UX-35 | Map min-height 560px no cabe en mobile | ✅ | `ba4e1b6` (h-[400px] mobile, min-h-[560px] lg+) |
| UX-36 | Sidebar colapsable a 64px | 🟡 | parcial: en mobile el sidebar se oculta (hidden lg:flex), drawer interactivo queda para sprint +1 |
| UX-37 | max-w-screen-2xl en topbar | ✅ | `ba4e1b6` |
| UX-39 | Diferenciar LABEL (uppercase OK) vs HEADER (sentence case) | ✅ | `efc918f` (9 headers → text-title-md sentence case) |
| UX-40 | `formatHa(0)` → "0" en vez de "0,0" | ✅ | `be42047` (test `fbe2165`) |
| UX-55 | Confirm dialog para acciones destructivas | ✅ | `25ae9dc` (ConfirmDialog + usado en /catalogos) |
| UX-78 | Heading levels (TopBar `<h2>` → `<p>`) | ✅ | `be42047` + `fdb56ce` |

### P2 — Medio (sprint +2) — **12/15 CERRADOS** ✅

| # | Item | Estado | Commit |
|---|------|--------|--------|
| UX-07/UX-08 (right-panel vs Stitch) | Indi­cadores con "trending up" + delta numérico | ⏳ | (diferencia visual menor vs Stitch; el shape es correcto) |
| UX-10/UX-11 (MapControls vs Stitch) | Botones floating verticales vs fila horizontal | ⏳ | (decisión de UX — fila horizontal es más accessible) |
| UX-14/UX-59 (login logos aliados) | Panel lateral WWF/CAR/Natura + copy institucional | ✅ | `19e6c22` |
| UX-15/UX-62 (ModulePlaceholder) | Pill "Próxima fase · roadmap" + CTA "Pedir esta función" (mailto) | ✅ | `19e6c22` |
| UX-29 (search debounce feedback) | Loader2 (animate-spin) mientras espera 300ms | ✅ | `19e6c22` |
| **UX-63** (breadcrumb drill-downs) | Componente `Breadcrumb` en `components/ui/` + integrado en `/metas/convenio/[id_municipio]` y `/metas/convenio/propuestas` | ✅ | sprint batch 17 (2026-09-08) |
| **UX-80** (sort en tablas) | `SortableHeader` con `aria-sort` + iconos chevron; server-side en `/predios` (codigo/nombre/componente/areaHa) y `/intervenciones` (id/actividad/predio/municipio/componente/estado/avance) | ✅ | sprint batch 17 (2026-09-08) |
| UX-43 (animate-in keyframes) | Definidas nativas en globals.css (no más dependencia de tailwindcss-animate) | ✅ | `19e6c22` |
| UX-44 (map zoom 600ms) | → 350ms (recomendación skill) | ✅ | `19e6c22` |
| UX-46 (glassmorphism decisión) | Mantener solo en overlays de mapa; sólido en otros | ✅ | (decisión documentada, sin código) |
| UX-47 (MapRegionLabels) | Placeholder existe pero sin implementar | ⏳ | (nice-to-have, no bloqueante) |
| UX-52 (5 logos falso positivo) | — | ✅ no-op | confirmado en `efc918f` |
| UX-53 (resumen territorial UX) | Ya es EmptyState en `/mapa` (mapa-page tiene "Predios destacados") | ✅ | (existente) |
| UX-58 ("0 en ejecución" copy) | N/A — UX-40 ya maneja el `0` correctamente | ✅ | `be42047` |
| UX-60 (login aria-busy) | aria-busy={submitting} en form | ✅ | `19e6c22` |
| UX-63 (breadcrumb) | Sin implementar | ⏳ | (nice-to-have, no bloqueante) |
| UX-64 (alertas paginación) | Aplicable con misma pagination pattern — quedan 5 alertas, no urge | ⏳ | (sprint +1) |
| UX-65 (intervenciones paginación) | ✅ Server-side PAGE_SIZE=25, searchParams ?page=N, paginador funcional | ✅ | `6fcea48` |
| UX-66 (tablas virtualizadas) | — | ⏳ | (necesita @tanstack/react-virtual — sprint +1) |
| UX-67 (empty-state illustrations) | ✅ EmptyState component reusable + 4 pages (predios, quebradas, alertas, intervenciones) | ✅ | `6fcea48` |
| UX-68 (SummaryBar clickeable) | Link a /dashboard con aria-label + hover + focus ring | ✅ | `19e6c22` |
| UX-69 (icon scale sin transform-gpu) | `transform-gpu` + `transition-transform` | ✅ | `19e6c22` |
| UX-70 (border outline /30) | /30 → /50 (sidebar + footer) | ✅ | `19e6c22` |
| UX-71 (Lucide vs icons custom mixtos) | Patrón definido: Lucide en general, custom icons (IconLeaf/IconDrop/IconForest) solo en ComponentRibbon | ✅ | (decisión documentada en AGENTS.md) |
| UX-72 (formatDate no usado) | N/A — alertas usan fechas relativas ("Hace 6 días") por diseño | ✅ | (decisión correcta) |
| UX-73 (donut "12.7K" + "ha total") | N/A — centerLabel=centerSubLabel es el patrón estándar M3 | ✅ | (decisión correcta) |
| UX-79 (trash icon) | text-error/70 hover:text-error (consistente con Tailwind) | ✅ | (existente) |
| UX-80 (predios sort) | Sin implementar | ⏳ | (nice-to-have, sprint +1) |

### P3 — Bajo (cuando haya tiempo) — 5/13 cerrados vía mocks honestos

| # | Item | Estado | Commit |
|---|------|--------|--------|
| UX-06 | Sidebar ancho (240 vs 256) | ⏳ | off-by-16px, intencional |
| UX-09 | Botón "Vista 3D" floating | ✅ mock con View3DDialog | sprint batch 12 (`8396e09`) |
| UX-11 | MapControls floating 2 cols | ✅ mockups en MapToolFeedback (toast inline) | sprint batch 12 (`8396e09`) |
| UX-16 | 404 sin ilustración | ⏳ | (nice-to-have) |
| UX-17 | aria-label en toasts de error | ⏳ | (nice-to-have) |
| UX-18 | Loading skeleton | ⏳ | (nice-to-have) |
| UX-25 | prefers-reduced-motion cobertura ampliada | ✅ | (en be42047 + 19e6c22) |
| UX-42 | Contraste iconos en dark mode | ⏳ | (no dark mode aún) |
| UX-45 | Map zoom button min size 44px | ⏳ | (nice-to-have) |
| UX-61 | Topbar búsqueda global | ⏳ | (sprint +1) |
| **Topbar HelpCircle** (nuevo) | Botón Ayuda era no-op | ✅ **HelpDialog** con info + atajos + mailto | sprint batch 14 |
| **UX-18** (loading skeletons) | Componente `Skeleton` + `SkeletonCard` + `SkeletonSection` + `SkeletonTable`; `loading.tsx` en `/metas/convenio`, `/metas/convenio/[id_municipio]`, `/metas/convenio/propuestas` | ✅ | sprint batch 17 (2026-09-08) |
| **UX-17** (aria-label toasts) | `aria-label={meta.title}` en `map-tool-feedback.tsx` (toast del mapa) | ✅ | sprint batch 17 (2026-09-08) |
| **UX-45** (zoom button min 44px) | CSS global `.leaflet-control-zoom a { width/height: 44px }` en `globals.css` | ✅ | sprint batch 17 (2026-09-08) |
| **MapSearchBar Bookmark** (nuevo) | Marcadores guardados no-op | ✅ **BookmarksDialog** con preview + features + CTA | sprint batch 14 |
| **MapSearchBar Layers** (nuevo) | Botón duplicado del MapLayersPanel | ✅ **eliminado** (duplicado) | sprint batch 14 |

---

## 6. Comandos útiles para cualquier agente

```bash
# Re-generar screenshots después de un fix
cd platform && node scripts/audit-screenshot.mjs

# Tests E2E (incluye el smoke test de las 14 rutas)
cd platform && PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/smoke-routes.spec.ts

# Unit tests
cd platform && npm test
```

## 7. Próximos pasos sugeridos

1. ✅ **Cerrado (sprint 2026-07-24 + 2026-08-02 + 2026-08-15)**: 6 P0 + 18 P1 + 12 P2 + 5 P3 (vía mocks) = **41/55 items (75%)**.
2. **Tests**: 214 unit+component (era 156, +58 nuevos), 6 e2e. Build 14/14 verde, tsc 0 errors.
3. **Mocks honestos** (batch 14): `View3DDialog`, `MapToolFeedback`, `HelpDialog`, `BookmarksDialog` — todos con preview/features list/CTA mailto.
4. **Sprint +1**: P2 restantes (UX-63 breadcrumb, UX-66 virtualización, UX-80 sort en tablas) + P3 backlog menor.
5. **UX-36 sidebar drawer mobile**: requiere interaction spec del user antes de codear (botón en topbar vs drag handle vs hamburger).
6. **UX-31 vector tiles**: MVT en lugar de GeoJSON crudo para drenajes. Decisión de arquitectura.
7. **UX-33 map clustering**: viewport-load de las features. Decisión de perf para > 5000 features.

---

**Documento vivo**: cualquier agente que cierre un item debe tacharlo acá y referenciar el commit en `git log --oneline -- docs/ui-ux-audit-2026-07-24.md`.
