# Architecture — SIG TERRITORIO

> Documento para engineers/agentes externos que necesitan entender cómo está montado el sistema
> antes de modificarlo. Si vas a codear, lee primero `AGENTS.md` (convenciones) y después esto.

---

## 1. Stack en 1 diagrama

```
                    ┌──────────────────────────┐
                    │   Vercel (auto-deploy)   │
                    │   Next.js 15 App Router  │
                    └────────────┬─────────────┘
                                 │ HTTPS
                                 ▼
┌────────────────┐    ┌──────────────────────────┐    ┌──────────────────┐
│  Browser       │ ←→ │  Next.js server (RSC)    │ ←→ │  Supabase        │
│  React 19      │    │  + Route Handlers        │    │  PostgreSQL 16   │
│  Leaflet       │    │  + Server Actions        │    │  + PostGIS 3.4   │
│  Recharts      │    │  + NextAuth v5           │    │  (sa-east-1)     │
└────────────────┘    └──────────────┬───────────┘    └──────────────────┘
                                     │
                                     ▼
                    ┌──────────────────────────┐
                    │  Repos en src/lib/repos  │
                    │  (postgres-js + cache)   │
                    └──────────────────────────┘
```

---

## 2. Capas

### 2.1 Capa de datos (`src/lib/repos/`)

Cada "recurso" del dominio tiene su archivo:

| Archivo | Cubre |
|---------|-------|
| `predios.ts` | Predios + propietarios + GeoJSON |
| `quebradas.ts` | Drenajes, microcuencas, quebradas |
| `propuestas.ts` | Propuestas (súper + hijas) |
| `analisis.ts` | Dashboard KPIs, intervenciones recientes, indicadores |
| `metas-convenio.ts` ⭐ | 5 metas operativas + drill-down |
| `fase6.ts` | 5 indicator + 5 junction tables |
| `monitoreo.ts` | Estaciones limnimétricas + obras de captación |
| `reportes.ts` | Los 10 SQL del cliente (R1–R10) |
| `catalogos.ts` | Componentes, acciones, municipios, etc. |
| `auditoria.ts` | Eventos de login (LOGIN_OK, LOGIN_FAIL, ACCESS_DENY) |
| `auth.ts` | NextAuth config |

**Patrón**:
- Cada `get*` function es `async () => Promise<T>`.
- Retornan tipos de `src/lib/types.ts` (client-safe).
- Usan `withFallback()` para devolver demo data si la BD falla.
- Usan `cached()` (de `_cache.ts`) para cache por tag + TTL.

```ts
// Ejemplo: getDashboardKpis
const getDashboardKpisImpl = async (): Promise<DashboardKpis> => {
  return withFallback("dashboardKpis", async () => {
    const [row] = await sql<...>`SELECT ...`;
    return { predios: pgInt(row.predios), ... };
  }, DEMO_DASHBOARD_KPIS);
};
export const getDashboardKpis = cached(getDashboardKpisImpl, {
  tags: ["dashboard"],
  ttl: 60,
});
```

**Cache + invalidación**:
- `cached()` envuelve `unstable_cache` con tags + TTL.
- `revalidateTag(tag)` en server actions invalida el cache.
- Tags: `dashboard`, `intervenciones`, `predios`, `quebradas`, `monitoreo`, `analisis`, `reportes`,
  `catalogos:full`, `catalogos:lookup`, `metas`, `convenio`.

### 2.2 Capa de UI (`src/components/`)

- **`ui/`** — primitivos reutilizables: `Button`, `Card`, `Input`, `Badge`, `Breadcrumb`, `Skeleton`,
  `SortableHeader`, `EmptyState`, `ConfirmDialog`. Sin dependencias de la app, solo Tailwind.
- **`layout/`** — Shell: `Sidebar` (navegación, role-based), `TopBar`, `FooterKpiBar`,
  `ModulePlaceholder` (para módulos "próxima fase").
- **`map/`** — Visor Leaflet: `MapClient`, `MapLayersPanel`, `MapTools`, `MapSearchBar`,
  `MapToolFeedback` (toast del mapa).
- **`dashboard/`** — Home: `ComponentRibbon` (C1/C2/C3), `KpiSidebar`, `IntervencionesTable`, charts.

### 2.3 Capa de rutas (`src/app/`)

App Router de Next.js 15. Server Components por defecto, Client Components solo cuando hace falta
estado/efectos/eventos.

| Ruta | Propósito | Server/Client |
|------|-----------|---------------|
| `/` | Dashboard home | Server |
| `/mapa` | Visor 2D | Client (Leaflet) |
| `/predios`, `/predios/[id]` | CRUD predios | Server + Client (forms) |
| `/intervenciones`, `/intervenciones/[id]` | CRUD propuestas | Server + Client (forms) |
| `/metas/convenio` | ⭐ 5 metas operativas | Server |
| `/metas/convenio/[id_municipio]` | ⭐ Drill-down municipio | Server |
| `/metas/convenio/propuestas` | ⭐ Drill-down propuestas | Server |
| `/metas/convenio/imprimir` | ⭐ Vista imprimible (PDF) | Server + Client (window.print) |
| `/monitoreo`, `/analisis`, `/reportes`, `/alertas` | Módulos | Server + Client |
| `/catalogos` | CRUD catálogos (admin) | Server + Client |
| `/admin/usuarios`, `/admin/auditoria` | Admin (solo rol ADMIN) | Server |
| `/configuracion` | Placeholder ("Próxima fase") | Server |
| `/login` | Login NextAuth | Server + Client |
| `/api/geo` | GeoJSON de capas (drenajes, vías) | Server |

---

## 3. Modelo de datos

### 3.1 Convenciones de nombres

- **PK con `i+1` (no OBJECTID del GDB)** — el GDB tiene duplicados en OBJECTID.
- **Lookup por nombre** (no FID) en junction tables.
- **Schema prefix por dominio**: `bcs_*` (base cartográfica), `sgs_pre_*` (predios), `sgs_pro_*`
  (propuestas), `sgs_amb_*` (ambiental), `sgs_inf_*` (infraestructura), `sgs_com_*` (componentes),
  `sgs_rel_*` (relaciones), `sgs_ind_*` (indicadores).
- **FK con `ON DELETE SET NULL`** (no CASCADE) para respetar dependencias.

### 3.2 Geometría y PostGIS

- **SRID 4686** (geográfico, MAGNA-SIRGAS). El GDB original está en EPSG:9377 (CTM12).
- **Cálculos de distancia/área DEBEN usar `::geography` cast**:
  ```sql
  SELECT ST_Length(geom::geography)  -- NO ST_Length(geom) — devuelve grados
  SELECT ST_Area(geom::geography)    -- NO ST_Area(geom)
  ```
  Bug histórico: usábamos `ST_Length(geom)` que devolvía valores en grados (incorrectos).
  Arreglado en commit `8fb2217` con script `fix_long_area.mjs`.

- **Tipos multi para evitar colisiones**: `ST_Multi(ST_GeomFromText(...))` fuerza multi cuando el
  GDB tiene tanto single como multi features.
- **Geometrías inválidas**: `ST_MakeValid()` + dedup via `drop_duplicates` (script `clean_gdb.py`).

### 3.3 postgres-js quirks

- **Tipo del segundo arg de `sql.array`**: es el OID de PostgreSQL como `number` (int4 = 23,
  int8 = 20, text = 25), NO string como `"int"`. La firma TS dice `type?: number`.
  ```ts
  await sql`SELECT * FROM unnest(${sql.array(ids, 23)})`  // ✅ int4
  await sql`SELECT * FROM unnest(${sql.array(ids, "int")})` // ❌ TS error
  ```
- **Tagged templates con tipo genérico**:
  ```ts
  const rows = await sql<{ id: number; nombre: string }[]>`SELECT ...`;
  ```
- **Helpers de parseo** (`src/lib/db.ts`): NUMERIC/BIGINT vienen como string. Usar `pgNum()`,
  `pgInt()`, `pgDate()`, `pgText()` en el `.map()` del resultado.

### 3.4 Extensión `unaccent`

Activa en migration 31. Necesaria para queries ILIKE con tildes:
```sql
SELECT * FROM tabla WHERE unaccent(actividad) ILIKE unaccent('%cosecha%')
-- matchea "Cosecha de agua" Y "cosecha de agua"
```

---

## 4. Auth y autorización

- **NextAuth v5** (v5.0.0-beta+) con Credentials Provider contra `sgs_usuario` table.
- **3 roles**: `ADMIN`, `ANALISTA`, `GESTOR`.
- **`requireUser()`** en cada server component autenticado.
- **`requireRole("ADMIN")`** para rutas admin-only.
- **Sidebar filtra items** según rol (módulos sensibles como `/admin` y `/catalogos` solo ADMIN).
- **Tokens JWT** van en cookie httpOnly. Augmentation en `@auth/core/jwt` (NO `next-auth/jwt` —
  bug histórico que rompía tipos).

---

## 5. Cache y rendimiento

- **`cached()` helper** en `_cache.ts`: envuelve `unstable_cache` con tag + TTL.
- **TTLs**:
  - 60s: dashboard, geojson, intervenciones, metas-convenio
  - 120s: reportes, analisis
  - 300s: catalogos
- **Invalidación**: `revalidateTag(tag)` en server actions cuando se mutan datos.
- **Mapa**: las features grandes (>2MB JSON) no entran en `unstable_cache`. Se sirven vía `/api/geo`
  con HTTP cache del cliente (TTL 1h). Refactor futuro a MVT (vector tiles) está pendiente (UX-33).

---

## 6. Datos

### 6.1 Fuente

- **GDB del cliente** en `C:\Users\agFab\OneDrive\Documents\GitHub\TG-Nikoll\DOCS\03_GDB\03_GDB\SIG_CAR_WWF_FN.gdb`
- **Backup pre-cleanup**: `C:\dev\scratch\SIG_CAR_WWF_FN_BACKUP.gdb`

### 6.2 Pipeline de import (GDB → Supabase)

```
extract_gdb.py    →  GeoJSON/Shapefile en C:\dev\scratch\gdb_export\
clean_gdb.py      →  ST_MakeValid + dedup
extract_phase6_tables.py → 10 tablas Fase 6 a phase6/
import_gdb_to_pg.mjs     →  Postgres (25 capas, 23 con mapping)
import_phase6.mjs        →  10 tablas Fase 6 (junction + indicator)
import_phase6_lookups.mjs →  3 lookup tables
reimport_propuesta_full.mjs →  súper + 3 hijas (1,381 + 692 + 450 + 239)
import_drenaje_quebrada.mjs →  drenaje_simple + drenaje_doble + quebrada (derivada)
fix_long_area.mjs         →  recalcular longitud/area con ::geography
```

### 6.3 Migrations (31 archivos en `scripts/db/init/`)

Aplicadas a Supabase `pjcvewberfgwywfnutjv` (region sa-east-1). Password en `.env.local` (rotar ASAP).

Las migraciones 14-31 son específicas del import GDB (drop NOT NULL, CHECKs, defaults, SRID fix,
serial PKs, extension unaccent).

---

## 7. Decisiones de arquitectura

### 7.1 ¿Por qué no ORM?

- El modelo es 100% PostGIS con queries SQL crudas. Un ORM agrega fricción y limita expresiones
  espaciales (`ST_Intersects`, `ST_Union`, `ST_Buffer`, etc.).
- `postgres-js` con tagged templates da type-safety razonable sin perder SQL crudo.
- El equipo es chico (1 dev) y prefiere control fino.

### 7.2 ¿Por qué Server Components por defecto?

- RSC reduce bundle JS (no envía lógica de servidor al cliente).
- `unstable_cache` solo funciona en RSC.
- Solo Client Components cuando hace falta: Leaflet (mapas), forms interactivos, estados de UI
  (filtros, modales, toasts).

### 7.3 ¿Por qué `unstable_cache` y no Redis?

- Next.js 15 ya lo trae built-in. Sin infra adicional.
- TTL corto (60-300s) + `revalidateTag` agresivo da freshness suficiente para este caso.
- Migrar a Redis cuando se justifique (multi-instancia, Vercel Edge).

### 7.4 ¿Por qué Tailwind v4 y no CSS modules?

- El design system SIG TERRITORIO tiene 50+ tokens. CSS modules no escala para 50 tokens.
- Tailwind v4 con `@theme` y `@utility` permite namespace custom (`--spacing-terrasight-*`).
- Tree-shaking automático: solo se genera el CSS de las clases usadas.

### 7.5 ¿Por qué un solo repo (`terrasight-platform`) y no monorepo?

- El equipo es 1 dev. Monorepo (turborepo, nx) agrega overhead sin beneficio claro.
- El GDB y los scripts Python viven en `TG-Nikoll/` (raíz), no en `platform/`. Si crecen, se
  pueden mover a un sub-paquete sin romper.

---

## 8. Anti-patrones (NO hacer)

Ver `AGENTS.md` § "Anti-patrones" para la lista completa. Los más importantes:

- ❌ Redefinir `--spacing-{sm,md,lg,...}` (rompe `max-w-{sm,md,lg,...}`).
- ❌ `transition-all` en buttons (re-paint de shadows).
- ❌ Hardcodear fechas o datos de ejemplo en producción.
- ❌ Botones placebo ("Aplicar Filtros" que no filtra nada).
- ❌ Usar emojis como iconos.
- ❌ Z-index random (999, 9999) — usar escala: 10, 20, 30, 50.
- ❌ `ST_Length(geom)` o `ST_Area(geom)` sin `::geography`.
- ❌ `TRUNCATE table CASCADE` cuando hay FK con `ON DELETE SET NULL` — usar `DELETE FROM`.
- ❌ Hardcodear URLs de GDB/Supabase en el código — usar `.env`.

---

## 9. Próximos pasos (sprint +1)

Ver `docs/SPRINT-STATUS.md` para el detalle. Los más importantes:

1. **UX-33** — Clustering del mapa para > 5000 features (perf crítico).
2. **UX-66** — Tablas virtualizadas (`@tanstack/react-virtual`) para `/intervenciones` y
   `/predios`.
3. **UX-61** — Topbar búsqueda global de predios.
4. **F2 (review-producto)** — Upload de archivos (KML, SHP, GeoJSON).
5. **F3 (review-producto)** — Workflow de aprobación de propuestas (cambio de modelo de dominio).
6. **Vector tiles (MVT)** — Refactor de `/api/geo` para drenajes (actualmente >2MB).
