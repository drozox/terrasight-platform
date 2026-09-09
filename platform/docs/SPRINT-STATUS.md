# Sprint Status — SIG TERRITORIO

> Estado actual del proyecto: qué está hecho, qué falta, qué viene.
> Última actualización: 2026-09-08 (Sprint 20 — workflow + Sprint 19 calidad + Sprint 18 SIG tools).

---

## 1. Resumen ejecutivo

| Indicador | Valor |
|-----------|-------|
| **Commits en `main`** | `c325660` (HEAD) |
| **Tag baseline** | `v0.1.0-pre-final` |
| **Fases completadas** | MVP-1, Phase 1-7, Metas del convenio, Branding, **Sprint 18 (4 herramientas SIG + MVT)**, **Sprint 19 (búsqueda + calidad)**, **Sprint 20 (workflow)**, **Sprint 21 (importación CSV)** |
| **Datos reales en Supabase** | 1,381 propuestas, 132 predios, 5,959 vías, 656 quebradas, 14 municipios |
| **Migraciones aplicadas** | 34 |
| **Audit UI/UX** | 46/55 (84%) cerrados |
| **TECH-DEBT** | 0 items abiertos |
| **Tests** | 313+ unit, 6 E2E, smoke 55/56 (sin regresión) |
| **Última URL de Vercel** | ver https://vercel.com/drozox/terrasight-platform |

---

## 2. Metas operativas del convenio (5 metas, /metas/convenio)

Estado al 2026-09-08 con datos reales del GDB. Drill-down disponible en cada indicador.

| Meta | Indicador | Actual | Meta | % | Estado |
|------|-----------|--------|------|---|--------|
| **C1A1** | Cercos vivos | 11.10 km | 12 km | 92% | 🟡 cerca |
| **C1A1** | Alambre | 8.89 km | 12 km | 74% | 🟡 cerca |
| **C1A2** | Conectividad | 5.20 km | 15 km | 35% | 🔴 bajo |
| **C1A2** | Silvopastoril | 6.46 ha | 15 ha | 43% | 🟡 en curso |
| **C1A2** | Agroforestal | 4.44 ha | 15 ha | 30% | 🟡 en curso |
| **C2A1** | Cosecha agua | 79 | 79 | 100% | ✅ cumplida |
| **C2A1** | Compostaje | 79 | 79 | 100% | ✅ cumplida |
| **C2A2** | Estaciones | 7 | 7 | 100% | ✅ cumplida |
| **C2A2** | Obras | 96 | 48 | 200% | ✅ superada |
| **C3** | Predios | 39 | 35 | 111% | ✅ superada |

**Resumen global**: 5/10 metas cumplidas (50%). Drill-down municipio en `/metas/convenio/[id_municipio]`.

---

## 3. Sprints cerrados (commits pusheados)

### Sprint 18 — Herramientas SIG del mapa (cierre del 20% funcional restante)

| Sub | Commit | Feature |
|-----|--------|---------|
| 18.1 | `d1e4c72` | Medir distancia + área con PostGIS (Vincenty + excedente esférico) |
| 18.1 | `eee6f2d` | SPRINT-STATUS — Sprint 18.1 |
| 18.2 | `ca9f185` | Identificar (click → features cercanas via PostGIS) |
| 18.3 | `2785562` | Buffer con ST_Buffer + counts por capa |
| 18.4 | `6be8a52` | Selección por rectángulo (bbox) con counts por capa |
| 18.5 | `00c424f` | MVT vector tiles para 6 capas (UX-31 hotfix) |

**Herramientas disponibles ahora en el toolbar del mapa**:
- 📏 Medir distancia (PostGIS `ST_Length` con `::geography`)
- 🟦 Medir área (PostGIS `ST_Area` con `::geography`)
- 🎯 Identificar (PostGIS `ST_DWithin` + CTE + UNION ALL)
- 🔘 Buffer (PostGIS `ST_Buffer` con `::geography` + counts)
- ⬛ Selección por rectángulo (PostGIS `ST_MakeEnvelope` + counts)

**Backend MVT**: `/api/tiles/[layer]/[z]/[x]/[y]` con `ST_AsMVT` para 6 capas
(predios, vias, drenajes, propuestas, municipios, veredas). Caché 1h. Whitelist
+ validación de coordenadas.

### Sprint 19 — Búsqueda transversal + calidad de datos

| Commit | Feature |
|--------|---------|
| `2d00be5` | Búsqueda global con pg_trgm + dashboard /admin/calidad |

**Cambios**:
- `pg_trgm` extension + 5 GIN trigram indexes (predios, propuestas, municipios, veredas, propietarios)
- 6 GIST indexes verificados (idempotente, `IF NOT EXISTS`)
- `ANALYZE` de 12 tablas
- `/api/search?q=...` con ranking por similitud + unaccent (tildes OK)
- Topbar con búsqueda en vivo (debounce 250ms, AbortController, atajo Ctrl+K)
- `/admin/calidad` con 12 reglas (geoms NULL, nombres vacíos, FKs faltantes)
  + inventario de índices (GIST vs GIN trgm)

**Verificado E2E**: 'guatavita' → GUATAVITA (score 1.0), 'isla' → LA ISLA + 5 propuestas, 'bosque' → 5 propuestas, /admin/calidad → 200 con todas las secciones.

### Sprint 20 — Workflow de intervenciones (P0 del plan v1.0)

| Commit | Feature |
|--------|---------|
| `6b5a76b` | Workflow de intervenciones con máquina de estados |

**State machine (6 estados)**:
```
BORRADOR → EN_REVISION → APROBADA → EN_EJECUCION → FINALIZADA
                        ↘ RECHAZADA → BORRADOR (re-apertura)
EN_EJECUCION → BORRADOR (re-apertura)
```

**Cambios**:
- `sgs_pro_estado_historial` con auditoría completa (usuario, rol, comentario, timestamp)
- `aplicarTransicion()` valida: transición válida + rol permitido + comentario obligatorio (RECHAZADA)
- UPDATE con `WHERE estado=$from` protege contra race conditions
- `/api/workflow/transicion` (POST) y `/api/workflow/historial` (GET)
- `<WorkflowPanel>` en `/intervenciones/[id]` con badge, botones por rol, modal de comentario, historial colapsable
- `workflow-types.ts` separado de `workflow.ts` (tipos puros sin DB para componentes "use client")
- Fix pre-existente: `mapa-mini.tsx` con `dynamic({ ssr: false })` (leaflet requiere `window`)
- Fix pre-existente: `sgs_pro_propuesta.created_at` no existía — removido del query

**Verificado E2E**:
- propuesta 1: GESTOR BORRADOR→EN_REVISION ✅
- transición inválida EN_REVISION→FINALIZADA → 400 ✅
- ADMIN EN_REVISION→APROBADA ✅
- historial muestra 3 entries en orden cronológico inverso

### Sprint 21 — Importación masiva desde CSV (P1)

| Commit | Feature |
|--------|---------|
| `c325660` | Importación masiva de predios desde CSV |

**Backend**:
- Migration 34: `sgs_adm_importacion` (header con estado + totales) + `sgs_adm_importacion_error` (errores por fila/columna)
- `parseCsv()` RFC 4180-compatible (sin deps, separador configurable, comillas escapadas, BOM, `\r\n`)
- `validatePredioRow()` + `commitPrediosImport()` con rollback por fila
- Genera `cedula_catastral` temporal (`IMP-{id}-{n}`) por NOT NULL

**Frontend**:
- `/admin/importaciones` form para pegar CSV + historial (50 últimas)
- `/admin/importaciones/[id]` detalle con tabla de errores
- Sidebar: nuevo item "Importaciones" (ADMIN/GESTOR)

**Verificado E2E**:
- CSV "Predio A 12.5 / Predio B abc / Predio C 8.0" → 2 exitosas + 1 con error, estado COMPLETADO_CON_ERRORES
- /admin/importaciones → 200 con historial
- /admin/importaciones/8 → 200 con tabla de errores

---

## 4. Por hacer (sprints siguientes)

### Sprint 22 — Versionado + histórico de metas (P1)
- `sgs_adm_version` con snapshots
- `/comparar` con diff visual
- `fecha_corte` en metas

### Sprint 23 — Reportes restantes + auditoría R1-R10
- Faltan R2, R4, R5, R6, R7, R10

### Pendientes menores de UX (P3)
- UX-33 clustering mapa
- UX-66 virtualización tablas
- UX-61 (✅ hecho en Sprint 19)
- UX-64 paginación alertas
- UX-47 etiquetas mapa
- UX-07/08/10/11 visual vs Stitch
- UX-16 404 ilustración
- UX-42 dark mode contraste

### Seguridad
- **ROTAR el PAT de GitHub** (estuvo expuesto en el chat, ya está en allowlist de pushes previos)
- **ROTAR el password de Supabase** (recomendado, está en `.env.local` y `DEPLOY.md`)

---

## 5. Convenciones recordatorio

- **postgres-js** `sql.array(value, 23)` OID numérico (int4=23, int8=20, text=25), NO string
- **Tagged templates con tipo genérico**: `await sql<{...}[]>\`SELECT...\``
- **Helpers de db.ts**: `pgNum()`, `pgInt()`, `pgDate()`, `pgText()` para parsear valores string
- **unaccent()** para ILIKE con tildes
- **SRID 4686 + `::geography`** para cálculos de distancia/área en metros
- **`DISTINCT ON`** con UNION ALL requiere aliasar columnas al mismo nombre
- **`cached()` con tags + TTL** + `revalidateTag(tag)` en mutaciones
- **withFallback** en repos para que UI renderice sin BD
- **Español en UI, inglés en identifiers**
- **Lucide icons, no emojis**
- **No `transition-all`** en buttons
- **No redefinir `--spacing-{sm,md,lg,...}`** (rompe utilities de Tailwind)
- **NUNCA `TRUNCATE ... CASCADE` con FK ON DELETE SET NULL** (usar DELETE FROM)
- **NUNCA `ST_Length(geom)` sin `::geography`**
- **NUNCA `sql.array(value, "int")` (string)** — usar 23 (OID)
- **Workflow transitions**: `UPDATE WHERE estado=$from` (protege contra race)
- **MVT**: ST_TileEnvelope retorna en 3857, transformar a 4686 para WHERE
- **Client components no importan DB directamente** — usar `*-types.ts` separado
- **leaflet con SSR**: usar `dynamic({ ssr: false })`
