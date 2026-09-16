# PLAN — Filtro por ACCIÓN (sub-filtros de componente)

**Ejecutor:** MiniMax (T1) · **Autor del plan:** T0 · **Repo:** `C:\dev\tg-t0` (o worktree propio)
**Rama sugerida:** `t1/filtro-accion` desde `main`

---

## 1. Objetivo

Hoy el dashboard filtra **solo por componente** (`Todas → C1 → C2 → C3`). Se debe
agregar el **sub-filtro por acción**:

```
Todas ─┬─ C1 ─┬─ C1A1
       │      └─ C1A2
       ├─ C2 ─┬─ C2A1
       │      └─ C2A2
       └─ C3 ──── C3AU
```

El filtro de acción debe actualizar **KPIs, metas, tabla y mapa**.

---

## 2. Modelo de datos (VERIFICADO en BD)

`sgs_com_componente`: `id_componente → nombre` = **3→C1, 1→C2, 2→C3** (¡ojo, no es 1,2,3!).
`sgs_com_accion`: `id_accion, nombre, id_componente`:

| id_accion | nombre | id_componente | componente | propuestas |
|-----------|--------|---------------|------------|-----------|
| 1 | A2 | 1 | C2 | 101 |
| 2 | A1 | 1 | C2 | 158 |
| 3 | U  | 2 | C3 | 431 |
| 4 | A1 | 3 | C1 | 139 |
| 5 | A2 | 3 | C1 | 145 |
| 6 | A1 | 2 | C3 | 407 |
| 7 | A2 | 2 | C3 | 0 |

**Regla del cliente:** C3 tiene **una sola acción visual** = `C3AU` (agrupa A1 + U).

### Catálogo canónico (5 acciones)
| Código | Componente | `nombre` de acción(es) |
|--------|-----------|------------------------|
| C1A1 | C1 | A1 |
| C1A2 | C1 | A2 |
| C2A1 | C2 | A1 |
| C2A2 | C2 | A2 |
| C3AU | C3 | U **y** A1 |

> **Importante:** filtrar por `(c.nombre, a.nombre)` (semántico), **no** por
> `id_accion` numérico (los IDs son surrogate y pueden diferir por entorno).

---

## 3. Contrato de URL

- `?componente=C1` → todo el componente (compatibilidad actual).
- `?accion=C1A1` → una acción concreta (el componente se deriva: `C1`).
- `?componente=C1&accion=C1A1` es equivalente; el código de acción manda.
- "Todas" → sin parámetros.

Helper central (nuevo `src/lib/acciones.ts`):
```ts
export type AccionCode = "C1A1" | "C1A2" | "C2A1" | "C2A2" | "C3AU";
export interface AccionDef { code: AccionCode; componente: "C1"|"C2"|"C3"; acciones: string[]; }
export const ACCIONES: AccionDef[] = [
  { code: "C1A1", componente: "C1", acciones: ["A1"] },
  { code: "C1A2", componente: "C1", acciones: ["A2"] },
  { code: "C2A1", componente: "C2", acciones: ["A1"] },
  { code: "C2A2", componente: "C2", acciones: ["A2"] },
  { code: "C3AU", componente: "C3", acciones: ["U", "A1"] },
];
export function accionesDeComponente(c: string): AccionCode[];      // C1 → [C1A1, C1A2]
export function normalizarAccion(v?: string|null): AccionCode|null; // valida el param
export function componenteDeAccion(code: AccionCode): "C1"|"C2"|"C3";
export function codigoDePropuesta(componente: string, accionNombre: string): AccionCode | null; // C3+A1/U → C3AU
```

---

## 4. Tareas

### FASE A — Repos (threading del filtro de acción)
Firma propuesta: agregar `accion?: AccionCode | null` (o `acciones?: string[] | string | null`).

| Archivo | Función | Cambio |
|---------|---------|--------|
| `src/lib/repos/analisis.ts` | `getIntervencionesRecientesImpl` | Ya acepta `accion` por `a.nombre`. Cambiar a aceptar **código** `CxAy`: si `C3AU` → `a.nombre IN ('U','A1')`; si no → `c.nombre = comp AND a.nombre = letra`. |
| `src/lib/repos/analisis.ts` | `getDashboardKpisComponente` | Aceptar acción; filtrar propuestas/predios/polígonos por la acción. |
| `src/lib/repos/analisis.ts` | `getPrediosGeoJSONImpl`, `getPrediosMiniImpl` | Aceptar acción además de componente. |
| `src/lib/repos/resumen-componente.ts` | `getResumenComponente` | Aceptar acción: `conteos`, `porAccion`, `topMunicipios/Veredas` y **indicadores** filtrados (si hay acción, mostrar solo los indicadores de `ca` correspondiente). |
| `src/lib/repos/geojson.ts` | `getComponenteFootprintGeoJSON` | Aceptar acción (huella del componente **o** de la acción). |
| `src/lib/repos/metas-convenio.ts` | `getPropuestasPorIndicador` | (Opcional) aceptar acción para drill-down. |

### FASE B — Ribbon con sub-filtros (UI)
Archivo: `src/components/dashboard/component-ribbon.tsx`
- Al clickear `C1/C2/C3`: setea `?componente=Cx` **y despliega** los chips de acción (`C1A1`, `C1A2`…).
- Click en un chip: `router.replace('/?componente=Cx&accion=CxAy')`.
- "Todas": sin params. La opción activa se resalta; el chip de acción activo también.
- Persistir `?q` al cambiar filtro (usar `searchParams` existentes).
- **A11y:** los chips deben ser `<button>`/`<Link>` fuera del `<button>` del ribbon (evitar anidar interactivos).

### FASE C — Columna COMPONENTE con código completo
- `src/lib/types.ts`: agregar `componenteAccion?: string` a `IntervencionReciente`.
- `analisis.ts` (`getIntervencionesRecientesImpl`): calcular `codigoDePropuesta(r.nombre_componente, r.nombre_accion)` y devolverlo.
- `src/components/dashboard/intervenciones-table.tsx`: nueva columna **"Componente"** mostrando `C1A1 / C1A2 / C2A1 / C2A2 / C3AU` (badge con color por componente).
- `src/app/intervenciones/page.tsx`: misma columna si aplica; corregir `ACCIONES_POR_COMPONENTE` para usar los códigos (`C1A1`,`C1A2`, …) y `C3 → C3AU`.

### FASE D — Mapa
- `src/app/api/geo/route.ts`: `?layer=componente&componente=Cx&accion=CxAy` → pasar la acción.
- `src/components/map/map-componente-focus-layer.tsx`: incluir `&accion=` en el fetch y re-`fitBounds`.
- `map-client.tsx`: pasar `activeAccion` a la capa de foco.

### FASE E — Propagar el param por el dashboard
- `src/app/page.tsx`: leer `accion`; pasarlo a `getDashboardKpisComponente`, `getIntervencionesRecientes`, `getResumenComponente`, `getAvanceProComponente` (no aplica), `MapSection`.
- `src/app/dashboard-suspense.tsx`: props `accionFiltro` hacia `MapSection` y secciones.

---

## 5. Criterios de aceptación

1. Click en `C1` despliega `C1A1` y `C1A2`; `C2` → `C2A1`/`C2A2`; `C3` → `C3AU`.
2. Al elegir `C1A1`: KPIs, metas, tabla y mapa muestran **solo** C1A1 (139 propuestas).
3. `C3AU` muestra las **838** propuestas de C3 (A1 407 + U 431).
4. La tabla muestra la columna **Componente** con el código completo (`C1A1`, …, `C3AU`).
5. "Todas" y `?componente=Cx` sin acción siguen funcionando (retrocompatibilidad).
6. `npm run release:gate` → `GOAL_COMPLETED = TRUE`.

## 6. Verificación (comandos)
```powershell
# conteos esperados por acción (SQL de control)
# C1A1=139, C1A2=145, C2A1=158, C2A2=101, C3AU=838
npm run release:gate
```
Reaplicar/validar vistas si se toca `metas-convenio.ts`:
`node scripts/apply_migration.mjs scripts/db/init/42-metas-fixes-c1a2-c2a2-c3.sql`

## 7. Reglas de coordinación
- Trabajar en worktree propio: `git worktree add C:\dev\tg-minimax -b t1/filtro-accion main`.
- Un commit por fase (mensajes en español, prefijo `feat/fix`).
- **No** tocar la BD sin avisar (la vista de metas es fuente única).
- Al terminar: `release:gate` verde y avisar a T0 para el merge.
