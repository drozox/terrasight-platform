# FINAL CLOSURE PLAN — TerraSight (Convenio CAR Cundinamarca)

> Auditoría técnica exhaustiva + plan de cierre hacia `GOAL_COMPLETED`.
> Fecha de auditoría: 2026-09-10 · HEAD auditado: `4b5f8eb` (main)
> Método: verificación contra código real (no contra documentación). Todo hallazgo
> citado con `archivo:línea`.

---

## 1. Executive Summary

TerraSight es una plataforma SIG funcional y **mucho más avanzada de lo que la
documentación sugiere**. El MVP-1, los 7 sprints de datos (GDB→Supabase), las
herramientas SIG, el workflow de intervenciones, la búsqueda global, la calidad de
datos, la importación CSV y el versionado de metas están **implementados y
verificados E2E**.

Sin embargo, el proyecto **NO está listo para declararse COMPLETE hoy**. Existen:

1. **1 bug de estado crítico (P0)** — conflicto de vocabulario de estados entre el
   workflow nuevo (Sprint 20) y el editor de estado antiguo, que deja **roto** el
   dropdown de estado y la sincronización de avance al 100%.
2. **1 bug de drill-down (P1)** — un `substring` mal calculado vacía el drill-down
   de propuestas de todos los indicadores C1/C2.
3. **2 sistemas de "metas" divergentes** — `/metas` (vistas SQL) vs `/metas/convenio`
   (código) producen números y unidades distintas para el mismo convenio.
4. **Secretos commitheados** — la password de Supabase (y el project-ref) están en
   ~15 archivos trackeados.

**Veredicto:** `NO — requiere correcciones` (P0/P1 antes de release).

**Lo que NO se debe hacer:** no hay que rediseñar, migrar ORM, ni agregar features.
El 90% del producto ya está terminado. El cierre es una corrección de coherencia
(estados, indicadores) + limpieza de seguridad + re-verificación.

---

## 2. Product Completion Definition

**¿Qué problema resuelve?** TerraSight es la plataforma SIG de análisis y seguimiento
del convenio **CAR Cundinamarca – WWF Colombia – Fundación Natura**. Consolida el
modelo BDG (Base de Datos Geográfica) del convenio y permite medir el cumplimiento de
las **5 metas operativas del convenio** (C1A1, C1A2, C2A1, C2A2, C3) sobre datos reales
importados de la GDB.

**¿Quién lo usa?** Personal de la CAR, WWF y Fundación Natura con 3 roles:
`ADMIN`, `ANALISTA`, `GESTOR`.

**Flujos críticos (de principio a fin):**
1. Login (con lockout, roles, auditoría) → dashboard.
2. Navegar el mapa (capas, medir, identificar, buffer, selección, MVT).
3. Consultar y gestionar predios/quebradas/propuestas (intervenciones).
4. Workflow de intervención: `BORRADOR → EN_REVISION → APROBADA → EN_EJECUCION → FINALIZADA`.
5. Ver el avance de las **metas del convenio** (indicadores + drill-down municipal + drill-down de propuestas).
6. Generar los 10 reportes operativos (R1–R10) con export CSV/PDF.

**¿Qué significa "terminado"?**
- Los 6 flujos críticos funcionan sin errores funcionales.
- Los 10 indicadores del convenio se calculan con **una sola lógica** y el
  `global == suma municipal == drill-down`.
- No hay secretos en el repositorio.
- `lint + typecheck + unit + e2e + build` verdes.

---

## 3. Current State (mapa del sistema)

### 3.1 Stack verificado
Next.js 15 App Router + React 19 + TypeScript, Tailwind v4, Radix UI, Leaflet +
react-leaflet, Recharts, PostgreSQL 16 + PostGIS (Supabase), NextAuth v5 (JWT +
bcryptjs), `postgres` (postgres-js, sin ORM).

### 3.2 Frontend (rutas)
| Ruta | Propósito | Estado |
|---|---|---|
| `/` (app/page.tsx) | Dashboard real (KPIs, mapa prominente) | ✅ Completo |
| `/dashboard` (dashboard/page.tsx) | `ModulePlaceholder` "Próxima fase" | 🔴 Placeholder (linkeado en sidebar) |
| `/mapa` | Visor 2D + 5 herramientas SIG + MVT | ✅ Completo (Sprint 18) |
| `/predios`, `/predios/[id]`, `/predios/nuevo` | CRUD predios | ✅ Completo |
| `/quebradas`, `/quebradas/nuevo` | CRUD quebradas | ✅ Completo |
| `/intervenciones`, `/intervenciones/[id]` | CRUD propuestas + workflow | 🟠 Parcial (estado roto, ver §5) |
| `/metas/convenio` (+ `[id_municipio]`, `propuestas`, `imprimir`) | 5 metas + drill-down | 🟠 Drill-down propuestas roto (§5) |
| `/metas` | Metas antiguas (vistas SQL) | 🔴 Huérfana/divergente (§6) |
| `/monitoreo`, `/analisis`, `/alertas`, `/catalogos` | Módulos | ✅ Completo |
| `/reportes` | R1–R10 + CSV/PDF | ✅ Completo (contrario a la doc) |
| `/admin/usuarios`, `/admin/auditoria`, `/admin/calidad`, `/admin/importaciones` | Admin | ✅ Completo |
| `/configuracion` | `ModulePlaceholder` | 🟡 Placeholder (declarado) |
| `/login` | NextAuth | ✅ Completo |

### 3.3 Backend (API routes)
| Ruta | Método | Auth | Estado |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | público | ✅ |
| `/api/geo`, `/api/geo/identify`, `/api/geo/measure` | GET/POST | `getCurrentUser` | ✅ |
| `/api/tiles/[layer]/[z]/[x]/[y]` | GET | `getCurrentUser` + whitelist | ✅ |
| `/api/search` | GET | `getCurrentUser` | ✅ |
| `/api/reportes` | GET | ADMIN/ANALISTA | ✅ (R1–R10) |
| `/api/interventions/import` | POST | ADMIN/GESTOR | ✅ |
| `/api/importaciones` | GET/POST | ADMIN/GESTOR | ✅ |
| `/api/workflow/transicion`, `/api/workflow/historial` | POST/GET | `getCurrentUser` + rol en lógica | ✅ |
| `/api/metas`, `/api/metas/snapshots`, `/api/metas/comparar` | GET/POST | ADMIN/ANALISTA | ✅ |
| `/api/analisis/buffer`, `/api/analysis/buffer`, `/api/analysis/spatial-select` | POST | `getCurrentUser` | 🟠 `analisis` vs `analysis` duplicados |
| `/api/wfs/parques`, `/api/wfs/reservas` | GET | `getCurrentUser` | ✅ (fallback hardcoded) |

### 3.4 Base de datos (35 migraciones, `scripts/db/init/01..35`)
Modelo por dominios: `bcs_*` (base cartográfica), `sgs_pre_*` (predios), `sgs_pro_*`
(propuestas + hijas), `sgs_amb_*` (ambiental), `sgs_inf_*` (infraestructura),
`sgs_com_*` (componentes/acciones), `sgs_rel_*` (relaciones), `sgs_ind_*` (indicadores
Fase 6), `sgs_adm_*` (auth/auditoría/importaciones/metas). Geometría SRID 4686.

### 3.5 Repos (`src/lib/repos/`)
predios, quebradas, propuestas, catalogos, analisis, monitoreo, reportes,
metas-convenio, metas, fase6, geojson, buffer, identify, spatial-select, mvt,
workflow, workflow-types, versionado, importaciones, calidad, search, auditoria, auth.

---

## 4. Architecture Assessment

**Sano.** Separación limpia RSC/Client, `cached()` + `revalidateTag`, `withFallback`,
repos por dominio, tipos client-safe (`constants.ts`, `workflow-types.ts`), guardas de
auth en capa servidor.

**Debilidades estructurales (no bloqueantes salvo excepción):**
- **Tres fuentes de "indicadores"**: `sgs_v_metas_*` (vistas), `metas-convenio.ts`
  (código), `sgs_ind_*` (Fase 6). No hay fuente única de verdad para "metas del convenio".
- **Rutas de API duplicadas**: `api/analisis/*` vs `api/analysis/*` (dos carpetas que
  resuelven a lógica distinta/similar).
- **Carpeta `_archive/`** con builds viejos (`.next-bad3`, `.next-build`, `.next-pre`).
- **`longitud_m` vs `longitud_km`** usados indistintamente según repo (riesgo de
  confusión de unidades, no bug hoy).

---

## 5. Business Logic Assessment

### 5.1 Cadena de dominio (Componente → Acción → Propuesta → Avance → Meta)
| Relación | Implementación | Estado |
|---|---|---|
| Componente (`sgs_com_componente`) | C1/C2/C3 | ✅ |
| Acción (`sgs_com_accion`) | A1/A2 (+ `U` en datos GDB) | ✅ |
| Propuesta (`sgs_pro_propuesta`) + hijas (punto/línea/polígono) | 1,381 súper | ✅ |
| Avance (`sgs_pro_propuesta_avance`) | timeline % | ✅ |
| Workflow (`sgs_pro_estado_historial`) | máquina de estados | ✅ |
| Meta/Indicador | **2 implementaciones divergentes** | 🔴 |

**No existe tabla "Resultado" explícita**: el "resultado" se modela como `avance_pct`
+ `estado`. Aceptable para el MVP, pero no hay snapshot automático de indicadores salvo
el versionado manual de metas (Sprint 22).

### 5.2 Hallazgo crítico — Conflicto de estados (P0)

**Causa raíz:** Sprint 20 (`migración 33`) reemplazó el vocabulario del campo
`sgs_pro_propuesta.estado` y su CHECK constraint, pero **no migró** los consumidores
antiguos:

| Componente | Vocabulario usado | ¿Válido según CHECK (migración 33)? |
|---|---|---|
| `workflow.ts`, `workflow-types.ts`, `workflow-panel.tsx` | `BORRADOR/EN_REVISION/APROBADA/EN_EJECUCION/FINALIZADA/RECHAZADA` | ✅ |
| `estado-dropdown.tsx:14` | `["Pendiente","En ejecución","Finalizada"]` | ❌ |
| `intervenciones/actions.ts:28` (`cambiarEstadoIntervencionAction`) | idem | ❌ |
| `propuestas.ts:465` (`agregarAvancePropuesta`) | `SET estado='Finalizada'` | ❌ (falta mayúsculas) |
| `constants.ts:103` (`ESTADOS_VALIDOS`) | `Pendiente/En ejecución/Finalizada` | ❌ |

**Consecuencia:** en `/intervenciones` (listado, `page.tsx:261`) y en el detalle
(`intervencion-detail.tsx:96`) el `EstadoIntervencionDropdown` sigue mostrando los
estados viejos; al cambiar el estado, `setIntervencionEstado` (propuestas.ts:97) hace
`UPDATE ... SET estado='Pendiente'` → viola `chk_pro_estado` → error 23514 → alerta de
error. Igual al registrar 100% de avance (`SET estado='Finalizada'`).

**Severidad:** CRITICAL. Es un bug funcional real de un flujo crítico.

### 5.3 Hallazgo — Drill-down de metas roto (P1)

`metas-convenio.ts:272` (`queryPropuestasHija`) construye el filtro de acción con:

```ts
sql`a.nombre = ${meta.ca.substring(2, 3)}`   // "C2A2".substring(2,3) === "A"
```

Debería ser `"A2"` (i.e. `substring(2,4)` / `slice(2)`). Resultado: el filtro
`a.nombre = 'A'` no matchea ninguna acción (`A1`/`A2`), por lo que
`getPropuestasPorIndicador` devuelve **cero filas para los 9 indicadores C1/C2**.
El drill-down `/metas/convenio/propuestas?indicador=cercos_vivos` renderiza
"*No hay propuestas registradas para este indicador*".

**Por qué no se detectó:** `tests/unit/metas.test.ts` solo cubre `metas.ts` (vistas),
no `metas-convenio.ts`. No hay test del drill-down.

### 5.4 Hallazgo — Inconsistencia C2A2 global vs drill-down (D)

`getC2A2()` (`metas-convenio.ts:467-478`) suma estaciones/obras **sin filtrar
componente/acción** (a propósito: "sumar todas las similares"). Pero
`INDICADORES_META.estaciones.ca = "C2A2"` y `obras_captacion.ca = "C2A2"`, de modo que
el drill-down (aun corregido) filtraría solo C2A2:

| Indicador | Global | Drill-down (C2A2) | Delta |
|---|---|---|---|
| Estaciones | 7 (6 C2A2 + 1 C3A1) | 6 | -1 |
| Obras | 96 (95 C2A2 + 1 C3A1) | 95 | -1 |

**`GLOBAL ≠ DRILL-DOWN`** por diseño inconsistente. Requiere decisión de negocio.

---

## 6. Components / Actions / Results Audit (indicadores del convenio)

Fichas de los 10 indicadores (fuente: `metas-convenio.ts` = fuente "nueva"/activa).

| Indicador | C/A | Fuente (tabla/columna) | Fórmula | Unidad | Meta | Actual* | % | Drill-down |
|---|---|---|---|---|---|---|---|---|
| Cercos vivos | C1A1 | `propuesta_linea.longitud_km` | SUM WHERE `%cerco vivo%`/`%cerca viva%` | km | 12 | 11.10 | 92 | ✅ (roto §5.3) |
| Alambre | C1A1 | `propuesta_linea.longitud_km` | SUM WHERE `%alambre%` | km | 12 | 8.89 | 74 | ✅ (roto) |
| Conectividad | C1A2 | `propuesta_linea.longitud_km` | SUM WHERE `%conectividad%`/`%franja%conectividad%` | **km** | 15 | 5.20 | 35 | ✅ (roto) |
| Silvopastoril | C1A2 | `propuesta_poligono.area_ha` | SUM WHERE 10 patrones | ha | 15 | 6.46 | 43 | ✅ (roto) |
| Agroforestal | C1A2 | `propuesta_poligono.area_ha` | SUM WHERE 8 patrones | ha | 15 | 4.44 | 30 | ✅ (roto) |
| Cosecha | C2A1 | `propuesta_punto` COUNT | COUNT WHERE `%cosecha%` | obras | 79 | 79 | 100 | ✅ (roto) |
| Compostaje | C2A1 | `propuesta_punto` COUNT | COUNT WHERE `%compostaje%`/`%compost%` | kits | 79 | 79 | 100 | ✅ (roto) |
| Estaciones | C2A2 | `propuesta_punto` COUNT | COUNT (global, sin C/A) WHERE `%limnimet%`/`%estacion%limnimet%` | estaciones | 7 | 7 | 100 | ⚠️ global≠drill (§5.4) |
| Obras | C2A2 | `propuesta_punto` COUNT | COUNT (global, sin C/A) WHERE `%captacion%`/`%captaci%` | obras | 48 | 96 | 200 | ⚠️ global≠drill |
| Predios C3 | C3 | `propuesta.id_predio` COUNT DISTINCT | COUNT DISTINCT WHERE componente=C3 | predios | 35 | 39 | 111 | ✅ (vía `super`) |

\* Valores reportados en `SPRINT-STATUS.md` con datos reales del GDB (2026-09-08).

**Riesgo transversal — clasificación por texto (`ILIKE` sobre `actividad`):**
todos los indicadores se calculan por **fuzzy match de texto libre** sobre
`actividad`. No hay catálogo cerrado de actividades con FK. Riesgos:
- Doble conteo: una actividad puede matchear 2 patrones (ej. "cerco de alambre" vs
  "cerco vivo" no, pero "banco" y "banco%proteina%" sí son subconjuntos → el segundo
  patrón es redundante, no aditivo, porque están en el mismo `SUM(CASE WHEN ... OR ...)`).
- Conteo por `COUNT(*)` de `propuesta_punto` puede duplicar si una propuesta súper
  tiene múltiples puntos con la misma actividad (no `COUNT DISTINCT id_propuesta`).
- Patrones distintos entre `metas-convenio.ts`, `12/13-metas.sql` y drill-down
  (`INDICADORES_META`).

### 6.1 Divergencia de las dos implementaciones de metas

`/metas` (vista `sgs_v_metas_resumen`) vs `/metas/convenio` (código) **no coinciden**:

| Indicador | Vista SQL (13-metas.sql) | Código (metas-convenio.ts) |
|---|---|---|
| Cercos vivos | `ILIKE '%cerca viva%'` (no `%cerco vivo%`) | `%cerco vivo%` OR `%cerca viva%` |
| Aislamiento | `%aislamiento%` OR `%cerco de alambre%` | `%alambre%` |
| Conectividad | polígonos `area_ha` → **ha** | líneas `longitud_km` → **km** |
| Silvopastoril | `%silvopastoril%` (1 patrón) | 10 patrones |
| Agroforestal | `%agroforestal%` (1 patrón) | 8 patrones |
| Cosecha | `%cosecha%agua%` | `%cosecha%` |
| Estaciones | `tipo_punto='estacion_limnimetrica'` OR `%estaci%n limnimétric%` | `%estacion%limnimet%`/`%limnimet%` (sin C/A) |
| Obras | `tipo_punto='obra_captacion'` OR `%obra%captaci%n%` | `%captacion%`/`%captaci%` (sin C/A) |
| C3 | requiere RFP O Páramos | solo componente C3 |

**Conclusión:** dos páginas accesibles muestran **números y unidades distintos** para
el mismo convenio. La `/metas` (vistas) está **huérfana** (no aparece en el sidebar,
que apunta a `/metas/convenio`) pero sigue en el árbol de rutas. Es fuente de
confusión y debe eliminarse o redirigirse.

---

## 7. Data Quality Audit

Basada en `prod_smoke.mjs` (55/56 pass — 1 fail preexistente: drenaje doble geom=0) y
`/admin/calidad` (12 reglas, Sprint 19). Riesgos observados:

| # | Problema | Severidad |
|---|---|---|
| 1 | `estado` con vocabulario mixto/huérfano tras migración 33 | CRITICAL (ver §5.2) |
| 2 | 692 propuestas punto **sin geometría** (excluidas del detalle geográfico; documentado en UI) | MEDIUM |
| 3 | ~30% vías sin match de municipio (spatial join parcial) | MEDIUM |
| 4 | Duplicados en GDB colapsados por PK (`ON CONFLICT DO NOTHING`) — potencial pérdida silenciosa | LOW |
| 5 | Actividades con escritura inconsistente (motivo del fuzzy-match) — no hay catálogo cerrado | HIGH (deuda de datos) |
| 6 | Columnas numéricas como texto (`DECIMAL` leído como string, parseado por `pgNum`/`pgInt`) | LOW (manejado) |

No hay evidencia de **huérfanos FK** (el smoke lo valida y da 0). No se detectaron
predios/propuestas duplicados estructuralmente (PK `i+1` + UNIQUE en catálogos).

---

## 8. GIS Audit

**Sano en lo esencial.** Verificado:
- SRID 4686 consistente; `::geography` para longitud/área (`buffer.ts:126`,
  `geo/measure/route.ts:100-125`, `interventions/import/route.ts:191-342`,
  `31-unaccent-extension.sql:19-26`).
- `ST_Area` sin cast detectado solo en comentario (`measure.ts:18` tipografía
  "gegeometry") — **no es código**.
- MVT con `ST_TileEnvelope` transformado 4686→3857 correctamente (Sprint 18.5).
- Índices GIST (6) + GIN trigram (5) verificados (Sprint 19).
- `ST_MakeValid` + dedup en el pipeline de import (GDB sucia).
- `TRUNCATE ... CASCADE` **no aparece** en `src/` (verificado por grep).

**Riesgos (no bloqueantes):**
- Capas grandes servidas vía `/api/geo` GeoJSON (>2 MB) con cache HTTP 1h; el MVT ya
  cubre 6 capas pero no todas.
- No hay índice GIST garantizado en `sgs_pro_propuesta_linea/poligono.geom` (las
  intersecciones de metas municipio dependen de `bcs_lpa_municipio.geom`).

---

## 9. Workflow Audit

Máquina de estados correcta y testeada (`workflow.test.ts`, 18 tests + invariantes).

- Transiciones válidas y roles: verificadas en `workflow-types.ts:71-115`.
- `aplicarTransicion` (workflow.ts:105) valida transición + rol + comentario, y hace
  `UPDATE WHERE estado=$from` (protección anti-race). ✅
- Historial con usuario/rol/comentario/timestamp. ✅
- API `/api/workflow/transicion` valida body y rol. ✅

**Gap:** la máquina de estados nueva **convive** con el editor de estado antiguo
(`estado-dropdown`) que NO respeta la máquina (§5.2). El frontend del detalle
(`intervenciones/[id]/page.tsx`) renderiza AMBOS: `WorkflowPanel` (nuevo, correcto) y
`EstadoIntervencionDropdown` (viejo, roto) vía `intervencion-detail.tsx`.

---

## 10. Security Audit

### 10.1 SECRET DETECTED — password de Supabase commitheada (CRITICAL)

La credencial de conexión a Supabase (password + project-ref) está commitheada en archivos trackeados (project-ref y valores concretos en `.env.local`, no en el repo tras la redacción P0-2)
está **commiteada** en archivos trackeados:

- `platform/AGENTS.md` (URL completa con password)
- `platform/docs/REVIEW-GUIDE.md`
- `platform/.env.example`
- `platform/scripts/audit_*.mjs`, `check_identify_*.mjs`, `list_municipios.mjs`,
  `audit_territorio.mjs`, `audit_metas_actividades.mjs`, `audit_estaciones.mjs`,
  `audit_detalle_municipio*.mjs`, `audit_agroforestal.mjs`, `check_identify_tables.mjs`
- `platform/scripts/db/init/02-datos-ejemplo.sql`, `db/shp/add-9377.sql`
- `DOCS/6. Script SQL (Implementación)/Datos prueba/Datos_ejemplo.txt`

**Acción requerida:** rotar la password de Supabase y el PAT de GitHub (SPRINT-STATUS
ya lo recomienda) y scrubbear el historial/patch de los archivos trackeados.

> `SECRET DETECTED — DO NOT PRINT VALUE`

### 10.2 Autenticación/autorización
- NextAuth v5 JWT 8h, bcryptjs, lockout 5 intentos/15 min, mensajes anti-oracle. ✅
- `middleware.ts` protege todas las rutas salvo `/login`, `/api/auth`, assets. ✅
- `requireUser`/`requireRole` en server components; API routes validan sesión. ✅
- `getCurrentUser` usa JWT (no BD) — no hay re-chequeo de `activo` en cada request
  (riesgo bajo: desactivar un usuario no revoca sesión hasta expirar JWT). MEDIUM.

### 10.3 Otros
- `.env` / `.env.local` están gitignored correctamente (no trackeados). ✅
- Logs locales (`cloudflared.err`, `dev-server.log`) no trackeados. ✅
- Sin CSRF explícito en server actions (Next.js lo mitiga por defecto con token). LOW.
- `toCsv` genera CSV con separador `;` — riesgo de **inyección de fórmulas** si campos
  de texto empiezan con `=+-@` (no sanitizado). LOW.

---

## 11. Performance Audit

- `getDashboardKpis` y queries pesadas con `cached()` (TTL 60–300s). ✅
- R7 optimizado con subqueries (evita cross-join de 228M filas). ✅
- MVT con cache 1h + whitelist. ✅
- `distinct`/`Promise.all` para cargas paralelas en `/metas/convenio` y dashboard. ✅
- **N+1 detectado (deuda):** `getDetalleMunicipio` hace 1 query de ids + 1 query grande
  de indicadores + 1 de veredas + 1 de distribución = 4 round-trips. Aceptable, no blocker.
- **Sin virtualización** en tablas grandes (UX-66) — OPTIMIZATION, no blocker.

**Distinción:** ninguno es BLOCKER. La app responde correctamente con datos reales.

---

## 12. Testing Audit

| Área | Implementado | Unit | E2E | Cobertura funcional |
|---|---|---|---|---|
| Auth (lockout, login) | ✅ | ✅ login-form | ✅ login.spec | Buena |
| Workflow | ✅ | ✅ 18 tests + invariantes | ✅ (Sprint 20) | Buena |
| Metas (vistas) | ✅ | ✅ metas.test.ts (mock) | ❌ | Media |
| **Metas convenio (código + drill-down)** | ✅ | ❌ **sin test** | ❌ | **Nula (bug latente §5.3)** |
| Reportes R1–R10 | ✅ | ❌ | ✅ reportes.spec (parcial) | Media |
| Estado dropdown (viejo) | 🟠 | ✅ (mock, no valida SQL) | ❌ | **No detecta el bug §5.2** |
| Mapa tools (measure/identify/buffer/bbox/MVT) | ✅ | ✅ (measure/mvt/spatial-select) | ✅ | Buena |
| Import CSV | ✅ | ✅ csv/importaciones | ✅ | Buena |
| Búsqueda/calidad | ✅ | ✅ | ✅ | Buena |

**Verificado en esta auditoría:** `npx tsc --noEmit` → 0 errors; `npm test` →
**313/313 passed**. El suite es sólido pero **no ejecuta SQL real** (mock de `sql`),
razón por la cual el conflicto de estados y el bug de drill-down pasan verdes.

**Hueco crítico:** falta test E2E del flujo de metas (dashboard → drill-down) y del
flujo de edición de estado. La lección DEBT-3.2 ("tsc+build+unit no bastan") se aplica
de nuevo aquí.

---

## 13. Documentation Audit

| Doc | Claim | Realidad | Estado |
|---|---|---|---|
| README.md §"Pendientes" | "R2/R4/R5/R6/R7/R10 pendientes" | Implementados y cableados (`reportes.ts`, `reportes/page.tsx`, `api/reportes`) | 🔴 STALE |
| SPRINT-STATUS.md §4 | "Sprint 23 — Faltan R2, R4, R5, R6, R7, R10" | Idem | 🔴 STALE |
| SPRINT-STATUS.md §2 | "Drill-down disponible en cada indicador" | Drill-down propuestas roto (§5.3) | 🟠 STALE |
| ARCHITECTURE.md §2 | `/metas/convenio` y `metas-convenio.ts` | ok, pero no menciona `/metas` (vistas) divergente | 🟠 |
| roadmap.md | 120 items "Pendiente" | Gran parte ya hechos en sprints 18–22 | 🔴 STALE |
| AGENTS.md | "22 migraciones" | hay **35** | 🟠 STALE |

---

## 14. Complete / Pending / Broken Matrix

| # | Ítem | Estado | Clase |
|---|---|---|---|
| 1 | Auth + roles + auditoría + lockout | Completo | A |
| 2 | Dashboard home (`/`) | Completo | A |
| 3 | Mapa + 5 herramientas SIG + MVT | Completo | A |
| 4 | Predios / Quebradas / Catálogos CRUD | Completo | A |
| 5 | Reportes R1–R10 | Completo (doc desactualizada) | A |
| 6 | Import CSV + import GDB | Completo | A |
| 7 | Búsqueda + calidad de datos | Completo | A |
| 8 | Workflow (máquina de estados) | Completo | A |
| 9 | Versionado metas (snapshots) | Completo | A |
| 10 | Editor de estado (dropdown/avance) | **Roto** | C |
| 11 | Drill-down propuestas de metas | **Roto** | C |
| 12 | `/metas` (vistas) vs `/metas/convenio` | **Inconsistente** | D |
| 13 | C2A2 global vs drill-down | **Inconsistente** | D |
| 14 | `/dashboard` (placeholder en sidebar) | Parcial | B |
| 15 | `/configuracion`, 3D, bookmarks | Placeholder | B (declarado) |
| 16 | Secretos commitheados | **Riesgo** | E |
| 17 | CI sin paso Build | Riesgo | E |
| 18 | Código muerto (`/metas`, `analysis`, `_archive`) | Deuda | F |

---

## 15. P0 / P1 / P2 / P3 Backlog

### P0 — BLOCKER
- **P0-1** Unificar el vocabulario de `estado` de intervención (dropdown + acción de
  estado + avance→100%) con la máquina de estados del workflow.
- **P0-2** Rotar y eliminar secretos commitheados (password Supabase + PAT GitHub).

### P1 — MUST FIX
- **P1-3** Corregir `metas-convenio.ts` `substring(2,3)` → `slice(2)` (drill-down).
- **P1-4** Definir y unificar C2A2 (¿global suma todas las C-A o solo C2A2?) y
  alinear `INDICADORES_META.ca` con esa definición.
- **P1-5** Elegir **una** fuente de verdad de metas: eliminar/redirigir `/metas`
  (vistas) o reconciliar ambas con una única lógica.
- **P1-6** Actualizar docs stale (README, SPRINT-STATUS) sobre reportes y metas.

### P2 — SHOULD FIX
- **P2-7** Resolver `/dashboard` placeholder (apuntar al dashboard real o quitar item).
- **P2-8** Re-activar el step `Build` en `.github/workflows/ci.yml`.
- **P2-9** Añadir `npm run audit:resultados` (reconciliación global==municipal==drill-down)
  + tests unit/E2E de `metas-convenio.ts`.

### P3 — OPTIONAL (no bloquean cierre)
- **P3-10** Limpiar código muerto: `/metas`, `api/analysis/*` vs `api/analisis/*`,
  `_archive/`, scripts de debug one-shot.
- **P3-11** Placeholders de 3D/bookmarks; sanitizar CSV (inyección de fórmulas).

---

## 16. Dependency Graph (DAG)

```
P0-1 (estado) ──────────────┐
P0-2 (secretos) ────────────┤  (independientes, paralelos)
                            ▼
   P1-5 (fuente única metas) ──► P1-3 (drill-down) ──► P1-4 (C2A2)
                                        │
                                        ▼
                              P2-9 (audit + tests) ──► P1-6 (docs)
                                        │
   P2-7 (dashboard) ──► P2-8 (CI build) ┤
                                        ▼
                              RELEASE GATE (§19)
```

- **Paralelizables:** P0-1 y P0-2. P2-7 y P2-8 (independientes de metas).
- **Secuenciales:** P1-5 → P1-3 → P1-4 (mismo archivo), luego P2-9 → P1-6.

---

## 17. Execution Sequence

1. **P0-1** — Corregir estados (bloquea todo lo que toca intervenciones).
2. **P0-2** — Rotar secretos (puede ir en paralelo con 1).
3. **P1-5** — Decidir y consolidar la fuente única de metas.
4. **P1-3** — Fix drill-down.
5. **P1-4** — Definir C2A2 global vs drill-down.
6. **P2-9** — Script de reconciliación + tests.
7. **P1-6** — Actualizar documentación.
8. **P2-7 / P2-8** — Dashboard + CI build.
9. **RELEASE GATE** (§19).

---

## 18. Agent Plan

| Agente | Responsabilidad | Archivos | No tocar |
|---|---|---|---|
| **A1 — Estados** | Unificar estados (P0-1) | `intervenciones/actions.ts`, `estado-dropdown.tsx`, `intervencion-detail.tsx`, `propuestas.ts`, `constants.ts`, `types.ts` | `workflow.ts`, `workflow-types.ts`, migraciones |
| **A2 — Secretos** | Rotar/scrub secretos (P0-2) | todos los listados en §10.1 | credenciales nuevas (fuera del repo) |
| **A3 — Metas** | Consolidar fuente única + drill-down + C2A2 (P1-3/4/5) | `metas-convenio.ts`, `metas.ts`, `app/metas/*`, migraciones 12/13 | reportes, fase6 |
| **A4 — Tests/audit** | Script reconciliación + tests (P2-9) | `scripts/`, `tests/` | lógica de negocio |
| **A5 — Docs/CI** | Docs + CI build + dashboard (P1-6, P2-7, P2-8) | README, SPRINT-STATUS, ci.yml, sidebar | código de negocio |

---

## 19. Definition of Done (Release Gate)

```
GOAL_COMPLETED = TRUE  ⇔  TODOS los checks siguientes pasan:
```

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm test` → 313+ passed, incluyendo tests de `metas-convenio.ts`
- [ ] `npm run build` → verde (reactivar step en CI)
- [ ] `node scripts/prod_smoke.mjs` → sin regresión (55/56 aceptado, sin nuevos fails)
- [ ] `npm run audit:resultados` → PASS (global == Σ municipios == Σ drill-down)
- [ ] Cambiar estado de intervención en `/intervenciones` usa la máquina de estados
      (sin error 23514) y queda auditado en `sgs_pro_estado_historial`
- [ ] Drill-down `/metas/convenio/propuestas?indicador=*` muestra propuestas y
      `suma == indicador global`
- [ ] Una sola página de "Metas del convenio" (sin `/metas` divergente)
- [ ] Sin `ghp_`/password/project-ref en `git grep` de archivos trackeados
- [ ] E2E (Playwright) verde con sesión real y BD prendida

Si algún check crítico falla → `GOAL_COMPLETED = FALSE`.

---

## 20. Exact Prompts for Agents

### Agente A1 — Estados de intervención

```text
OBJETIVO:
Reconciliar el vocabulario de estados de las intervenciones con la máquina de
estados del workflow (Sprint 20).

CONTEXTO:
La migración 33 cambió sgs_pro_propuesta.estado a 6 valores en MAYÚSCULAS
(BORRADOR, EN_REVISION, APROBADA, EN_EJECUCION, FINALIZADA, RECHAZADA) y su CHECK
constraint. El editor antiguo sigue usando "Pendiente"/"En ejecución"/"Finalizada",
lo que rompe el UPDATE (error 23514) y el sync de avance al 100%.

ARCHIVOS:
- src/app/intervenciones/actions.ts (cambiarEstadoIntervencionAction,
  actualizarAvanceIntervencionAction)
- src/app/intervenciones/estado-dropdown.tsx
- src/app/intervenciones/[id]/intervencion-detail.tsx
- src/lib/repos/propuestas.ts (setIntervencionEstado, agregarAvancePropuesta)
- src/lib/constants.ts, src/lib/types.ts

TAREAS:
1. Eliminar/adaptar EstadoIntervencionDropdown para que, o bien (a) delegue en el
   WorkflowPanel (recomendado), o (b) use ESTADOS del workflow-types.
2. Hacer que setIntervencionEstado y agregarAvancePropuesta usen el vocabulario del
   workflow (o que deleguen en aplicarTransicion).
3. Revisar types.ts/constants.ts: quitar EstadoIntervencion si queda sin uso o
   re-tipar a EstadoPropuesta.

NO HACER:
- No tocar workflow.ts / workflow-types.ts (la máquina es correcta).
- No cambiar migraciones.
- No introducir un tercer vocabulario de estados.

VALIDACIÓN:
npx tsc --noEmit && npm test && npm run lint

CRITERIOS DE ACEPTACIÓN:
AC-01: Cambiar estado en /intervenciones no lanza error de constraint.
AC-02: El cambio queda registrado en sgs_pro_estado_historial con usuario/rol.
AC-03: Registrar 100% de avance transiciona a FINALIZADA sin error.
AC-04: No quedan referencias a "Pendiente"/"En ejecución" en el editor de estado.

ENTREGABLE:
Resumen de cambios + resultados de validación + lista de archivos modificados.
```

### Agente A3 — Metas del convenio

```text
OBJETIVO:
Dejar una única fuente de verdad para las metas del convenio y corregir el drill-down.

CONTEXTO:
Existen 2 implementaciones divergentes: /metas (vistas sgs_v_metas_resumen, migraciones
12/13) y /metas/convenio (src/lib/repos/metas-convenio.ts). El sidebar apunta a
/metas/convenio. El drill-down de propuestas está roto: metas-convenio.ts línea 272 usa
meta.ca.substring(2,3) (devuelve "A") en vez de slice(2) (devuelve "A1"/"A2"), por lo
que devuelve 0 filas. Además C2A2 global suma todas las C-A pero INDICADORES_META.ca
dice C2A2 (global != drill-down).

ARCHIVOS:
- src/lib/repos/metas-convenio.ts
- src/lib/repos/metas.ts
- src/app/metas/**  (incluye convenio/, propuestas/, [id_municipio]/)
- scripts/db/init/12-metas.sql, 13-c3-metas.sql

TAREAS:
1. Corregir el filtro de acción del drill-down (slice(2)).
2. Decidir y documentar la definición de C2A2 (recomendado: alinear drill-down con el
   global — filtrar también sin C/A — o mover los casos C3A1 a C2A2 en datos).
3. Eliminar o redirigir /metas para que solo exista /metas/convenio (o reconciliar
   ambas con UNA lógica compartida).
4. Asegurar que INDICADORES_META (patrones) sea la única definición de fuzzy-match y
   que getC1A1/getC1A2/getC2A1/getC2A2 la reutilicen (eliminar patrones duplicados).

NO HACER:
- No tocar reportes.ts ni fase6.ts.
- No cambiar las metas objetivo (12 km, 15 ha, 79, 7, 48, 35) salvo confirmación.
- No inventar actividades/catálogos nuevos.

VALIDACIÓN:
npx tsc --noEmit && npm test && node scripts/test_metas_repo.mjs (si existe DATABASE_URL)

CRITERIOS DE ACEPTACIÓN:
AC-01: /metas/convenio/propuestas?indicador=cercos_vivos lista propuestas con km.
AC-02: la suma del drill-down == indicador global para los 10 indicadores.
AC-03: estaciones drill-down == 7 y obras == 96 (o la decisión documentada).
AC-04: una sola ruta de metas accesible desde el sidebar.
AC-05: npm test verde con tests nuevos para metas-convenio.

ENTREGABLE:
Resumen de la decisión de negocio, archivos modificados y resultados de validación.
```

### Agente A4 — Reconciliación + tests

```text
OBJETIVO:
Crear un script de reconciliación de indicadores y tests para metas-convenio.

CONTEXTO:
No existe forma automática de verificar que un indicador global == suma por municipio
== suma del drill-down. Los tests actuales solo cubren metas.ts (vistas) con mocks.

ARCHIVOS:
- scripts/audit_resultados.mjs (nuevo)
- package.json (script "audit:resultados")
- tests/unit/metas-convenio.test.ts (nuevo, mocks del patrón de metas.test.ts)

TAREAS:
1. Crear scripts/audit_resultados.mjs que, contra DATABASE_URL, calcule para cada
   IndicadorKey: global (getC1A1/...), suma por municipio (getDetalleMunicipio),
   y suma del drill-down (getPropuestasPorIndicador), y falle si difieren.
2. Registrar "audit:resultados" en package.json.
3. Test unitario de queryPropuestasHija verificando que el filtro de acción sea A1/A2.

NO HACER:
- No modificar la lógica de negocio (eso es de A3).

VALIDACIÓN:
node scripts/audit_resultados.mjs && npm test

CRITERIOS DE ACEPTACIÓN:
AC-01: audit:resultados retorna PASS con datos reales (o FAIL con causa clara).
AC-02: test unitario falla antes del fix de A3 y pasa después.

ENTREGABLE:
Script + test + salida de validación.
```

---

## 21. Release Gate Final (comando objetivo)

```powershell
cd platform
npx tsc --noEmit
if ($?) { npm run lint }
if ($?) { npm test }
if ($?) { npm run build }                 # reactivar en CI
if ($?) { node scripts/prod_smoke.mjs }   # requiere DATABASE_URL
if ($?) { npm run audit:resultados }      # requiere DATABASE_URL (nuevo)
```

Salida esperada: todo verde + `audit:resultados PASS` + sin secretos en
`git grep -lE 'ghp_[A-Za-z0-9]{20,}|password.*=.*[A-Za-z0-9]{10,}|project-ref.*=.*[A-Za-z0-9]{20,}'` (debe devolver vacío).

---

## 22. Final GOAL_COMPLETED Criteria + Veredicto

### ¿Está listo para finalizar hoy?

**`NO — requiere correcciones`**

### Por qué

El producto está funcionalmente **~90% completo y verificado** (313 tests verdes,
tsc limpio, E2E previos). Pero hay **un bug crítico (P0-1)** que rompe un flujo de
usuario (edición de estado de intervención), **un bug de drill-down (P1-3)** que rompe
la trazabilidad de los indicadores, **dos fuentes de verdad de metas divergentes
(P1-5)**, y **secretos commitheados (P0-2)**. Ninguno requiere re-arquitectura ni
features nuevas: son correcciones de coherencia + seguridad + re-verificación.

Tras cerrar P0-1, P0-2, P1-3, P1-4, P1-5 y P1-6, el estado pasa a
**`CASI — solo validación/release`** y, con el Release Gate §21 en verde,
**`SÍ — GOAL_COMPLETED = TRUE`**.

---

*Anexo — no se recomienda: rediseñar la app, migrar ORM/framework, microservicios,
IA nueva, app móvil, dark mode, clustering (UX-33), virtualización (UX-66), SSO, IoT,
IGAC/RUNAP, notificaciones email/SMS, logo (bloqueado por assets). Nada de eso es
necesario para cerrar el requisito existente.*
