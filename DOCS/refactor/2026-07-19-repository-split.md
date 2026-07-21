# Plan: Split de `platform/src/lib/repository.ts` (4.199 líneas)

**Autor:** terrasync-arch · **Fecha:** 2026-07-19 · **Status:** propuesta (no implementado)
**Objetivo:** partir el monolito `repository.ts` en archivos por dominio para resolver el error de build
`Module not found: Can't resolve 'fs'` causado por client components que arrastran `db.ts` (y por tanto
`postgres` nativo de Node) al bundle del navegador.

---

## TL;DR (para gis, en paralelo)

- `repository.ts` se parte en `lib/types.ts` (tipos puros) + `lib/constants.ts` (values client-safe) +
  `lib/repos/*.ts` (queries con `db`).
- `repository.ts` se mantiene **1 release** como barrel de `repos/index.ts` para no romper los ~50
  importers en el primer commit.
- 6 client components críticos (no 5 — ver §4) cambian import a `@/lib/types` y/o `@/lib/constants`.
- Riesgo bajo: ningún importador externo se entera del split hasta que se migre, y los tests no
  tocan `repository.ts` (verificado).

---

## 1. Inventario de tipos vs values en `repository.ts`

Mapa por categoría, basado en grep + lectura de las 4.199 líneas. **No** es una lista exhaustiva, es
la que mueve la aguja:

- **Tipos puros client-safe** (sin dependencia de `db`, sin `Date` raro, `Record<...>` planos) → van
  a `lib/types.ts`:
  - `PredioFull`, `PropietarioMini`, `VeredaMini`, `PropietarioFull`, `PredioPorMunicipio`
  - `QuebradaFull`, `MunicipioMini`, `MunicipioFull`, `VeredaFull`, `MicrocuencaFull`
  - `BeneficiarioFull`, `BeneficiarioMini`
  - `ComponenteFull`, `AccionFull`, `ComponenteLookup`, `AccionLookup`,
    `ComponenteValido`, `AccionValida`
  - `MonitoreoPunto`, `MonitoreoKpis`, `BeneficiarioMini` (ya repetido)
  - `IntervencionCompleta`, `AvancePropuesta`, `PropuestaSimple`
  - `IntervencionReciente`, `Alerta`, `FooterKpis`
  - `ReporteTipo` y las 10 `ReporteRxFila`
  - `UsuarioAdmin`, `AuditEvento`, `AuditEvent`, `AuditFiltros`
  - `BufferTarget`, `BufferResultTipo`, `BufferResultItem`, `MatrizFila`,
    `CoberturaMunicipioFila`, `BoundingBox`, `IntersectionResult`
  - `RolSistema` ya está en `auth.ts` (no se mueve).
  - `EstadoIntervencion` (literal type).
  - Interfaces GeoJSON (`GeoJSONLineString`, `GeoJSONPolygon`) — son `export interface`,
    no traen nada runtime.

- **Types que NO se exportan fuera del módulo** (se quedan en sus `repos/*.ts` como helpers
  internos, no hace falta promoverlos a `lib/types.ts`):
  - `UsuarioRowRaw`, `PredioRow`, `QuebradaRow`, `MunicipioRow`, `VeredaRow`, `PropietarioRow`,
    `MicrocuencaRow`, `BeneficiarioRow`, `MonitoreoRow`, `PuntoGeom`, `LineaGeom`,
    `PoligonoGeom`, `IntervencionCompletaBase`, `AuditRowRaw`.
  - `GeoJSONLineString`/`GeoJSONPolygon` SÍ se exportan (los usa `intervenciones/[id]/mapa-mini.tsx`),
    entonces SÍ van a `types.ts`.

- **Values (constants / records / arrays literales) que se importan desde client components o
  que el cliente debe poder usar** → van a `lib/constants.ts`:
  - `TIPOS_PUNTO` (array `as const`)
  - `TIPO_PUNTO_LABEL` (Record)
  - `TIPO_PUNTO_COLOR` (Record)
  - `COMPONENTES_VALIDOS` (array `as const`)
  - `ACCIONES_VALIDAS` (array `as const`)
  - `REPORTE_LABELS` (Record)
  - `REPORTE_DESCRIPCIONES` (Record)
  - **Type guards puros** (no usan `db`, son funciones puras) — recomendación: van a `constants.ts`
    también, son client-safe:
    - `isTipoPunto(s: string): s is TipoPunto` (cliente lo necesita en `monitoreo/page.tsx` server,
      pero también lo usa `repository.ts` internamente; el refactor lo deja accesible).
    - `isBufferTarget(s: string): s is BufferTarget` (server-only, no lo importa nadie cliente,
      pero es pura → `constants.ts`).
    - `isEstadoIntervencion(s: string): s is EstadoIntervencion` (**la usa
      `monitoreo/punto-detalle.tsx` que ES cliente** — confirmado en grep).

- **Values que se quedan en `repos/*.ts`** (internos, no los importa nadie fuera):
  - `ESTADOS_VALIDOS` (línea 2132) — solo se usa dentro de `setIntervencionEstado`. Se va a
    `repos/propuestas.ts` como `const` privado.
  - `TELEFONO_REGEX`, `isValidTelefono` (líneas 3427-3433) — no se importan en ningún archivo del
    proyecto (grep lo confirmó). **Están muertos**: o se borran o se mueven a `lib/validation.ts`.
    Recomiendo mover a `validation.ts` (es lo coherente con la regla "coincide con el CHECK
    constraint"). Decisión a confirmar con el orquestador, fuera del scope del split.

- **Funciones de query (todas importan `sql` de `db`)** → van a `lib/repos/*.ts`, agrupadas por
  dominio de negocio. Mapeo completo en §2.

- **Observación cruzada** (no rompe build, pero es bug latente): `lib/geo-import.ts:104` define su
  PROPIO `COMPONENTES_VALIDOS: ComponenteKey[] = ["C1", "C2", "C3"]`, duplicado del de
  `repository.ts`. **No tocar en este refactor** (es para otra tarea), pero anotado.

---

## 2. Estructura nueva propuesta

### 2.1 Archivos a crear

```
platform/src/lib/
├── types.ts                    # (extender el actual; ver §2.2)
├── constants.ts                # NUEVO — values client-safe
└── repos/
    ├── index.ts                # barrel — re-exporta TODO lo de abajo
    ├── predios.ts              # CRUD predios + propietarios + veredas
    ├── quebradas.ts            # CRUD quebradas + municipios mini
    ├── propuestas.ts           # intervenciones + avances + estado
    ├── catalogos.ts            # componentes + acciones + lookups (mini/lookup/full)
    ├── auth.ts                 # usuarios + roles
    ├── auditoria.ts            # audit eventos
    ├── reportes.ts             # R1..R10
    ├── analisis.ts             # buffer / matriz / cobertura / bbox / dashboard
    └── monitoreo.ts            # puntos + KPIs + beneficiarios

platform/src/lib/repository.ts  # (modificar) — pasa a ser un barrel que re-exporta
                                  # TODO lo de repos/index.ts + types.ts + constants.ts
```

### 2.2 `lib/types.ts` — qué va (todos los tipos puros de §1)

Reemplaza/amplía el `types.ts` actual (que ya tiene `DashboardKpis`, `ComponenteTotal`,
`CoberturaTotal`, `IntervencionReciente`, `Alerta`, `FooterKpis`, `MapProperties`, `MapFeature`,
`MapFeatureCollection`, `PredioMini`, `PredioPorMunicipio`, `SerieTemporal`).

**Importante**: importar este archivo desde un client component **debe ser 100% tree-shakeable a
tipos**. Como todos son `interface` / `type`, TS los borra en runtime y webpack no emite nada.

### 2.3 `lib/constants.ts` — values client-safe

```ts
// constants.ts — valores seguros para importar desde "use client"
// NO importar db ni postgres. NO ejecutar side-effects.

export const TIPOS_PUNTO = [...] as const;
export const TIPO_PUNTO_LABEL: Record<TipoPunto, string> = {...};
export const TIPO_PUNTO_COLOR: Record<TipoPunto, ...> = {...};
export const COMPONENTES_VALIDOS = ["C1","C2","C3"] as const;
export const ACCIONES_VALIDAS = ["A1","A2"] as const;
export const REPORTE_LABELS: Record<ReporteTipo, string> = {...};
export const REPORTE_DESCRIPCIONES: Record<ReporteTipo, string> = {...};

// type guards puros (no tocan DB)
export function isTipoPunto(s: string): s is TipoPunto {...}
export function isBufferTarget(s: string): s is BufferTarget {...}
export function isEstadoIntervencion(s: string): s is EstadoIntervencion {...}
```

`TipoPunto`, `BufferTarget`, `EstadoIntervencion` se importan desde `./types` (son puros, viven ahí).

### 2.4 `lib/repos/*.ts` — funciones de query (server-only)

Cada archivo sigue el patrón de `audit.ts` (verificado en lectura): importa `sql, pgInt, pgNum,
pgDate, pgText` desde `@/lib/db` y arma `withFallback(...)` cuando aplica. **Ningún repos importa
otro repos** (ver §8 — circular imports).

Mapeo concreto (basado en grep de líneas 1-4250 de `repository.ts`):

- **`repos/predios.ts`**: `getPrediosGeoJSON`, `getPrediosMini`, `listPredios`, `getPredioById`,
  `crearPredio`, `actualizarPredio`, `eliminarPredio`, `listPropietarios`, `listPropietariosFull`,
  `getPropietarioById`, `crearPropietario`, `actualizarPropietario`, `eliminarPropietario`,
  `listVeredas`, `listVeredasFull`, `getVeredaById`, `crearVereda`, `actualizarVereda`,
  `eliminarVereda`. **Tipos asociados en `types.ts`**: `PredioFull`, `PropietarioMini`,
  `PropietarioFull`, `PropietarioInput`, `VeredaMini`, `VeredaFull`, `VeredaInput`,
  `PredioPorMunicipio`, `MapFeature`, `MapFeatureCollection`, `MapProperties`.

- **`repos/quebradas.ts`**: `getQuebradasMini`, `listQuebradasFull`, `getQuebradaById`,
  `crearQuebrada`, `actualizarQuebrada`, `eliminarQuebrada`, `listMunicipios`, `listMunicipiosFull`,
  `getMunicipioById`, `crearMunicipio`, `actualizarMunicipio`, `eliminarMunicipio`. **Tipos**:
  `QuebradaFull`, `MunicipioMini`, `MunicipioFull`, `MunicipioInput`.

- **`repos/propuestas.ts`**: `getIntervencionesRecientes`, `getIntervencionCompleta`,
  `getIntervencionesGeoJSON`, `setIntervencionEstado`, `listAvancesByPropuesta`,
  `agregarAvancePropuesta`, `getUltimoAvanceReal` (interno, helper del anterior). `ESTADOS_VALIDOS`
  como `const` privado. **Tipos**: `IntervencionCompleta`, `AvancePropuesta`, `PropuestaSimple`,
  `IntervencionReciente`. **Helper interno**: `parseGeoJSON` (función pura, se queda como helper
  del archivo).

- **`repos/catalogos.ts`**: `listComponentesFull`, `getComponenteById`, `crearComponente`,
  `actualizarComponente`, `eliminarComponente`, `listAccionesFull`, `getAccionById`, `crearAccion`,
  `actualizarAccion`, `eliminarAccion`, `listComponentesLookup`, `listAccionesLookup`. **Tipos**:
  `ComponenteFull`, `AccionFull`, `ComponenteLookup`, `AccionLookup`, `ComponenteValido`,
  `AccionValida`. (Los `*as const` arrays de `COMPONENTES_VALIDOS`/`ACCIONES_VALIDAS` están en
  `constants.ts`; los types derivados también en `types.ts`.)

- **`repos/auth.ts`**: `listUsuarios`, `getUsuarioById`, `findUsuarioByEmail`, `crearUsuario`,
  `actualizarUsuario`, `resetPasswordUsuario`, `setUsuarioActivo`, `listRoles`. **Tipos**:
  `UsuarioAdmin` (en `types.ts`). El `RolSistema` ya está en `auth.ts` del proyecto — no se duplica.
  **Decisión**: el archivo `lib/auth.ts` actual (que tiene 6.961 bytes — más grande que `db.ts` y
  mucho más que `audit.ts`) se mantiene tal cual (es lógica de sesión/passwords, no de queries de
  admin). El nuevo `repos/auth.ts` es solo para la **gestión administrativa** de usuarios (HU-AD-02).
  **Si en el futuro el equipo decide fusionar `repos/auth.ts` con `lib/auth.ts`, hacerlo en otro
  PR** — fuera de scope.

- **`repos/auditoria.ts`**: `listAuditEventos`, `listEventTypes`. **Tipos**: `AuditEvento`,
  `AuditEvent`, `AuditFiltros`. (Los `writeAudit`/`auditLoginOk`/etc. ya viven en `lib/audit.ts`;
  no se tocan — son la API de escritura, distinta de la de lectura.)

- **`repos/reportes.ts`**: `getReporteR1`..`getReporteR10` (10 funciones) + sus tipos
  `ReporteR1Fila`..`ReporteR10Fila`. **Agrupar las 10 en un solo archivo** porque comparten el
  patrón (todas son `withFallback` + un solo SELECT); el archivo queda ~500 líneas pero es
  manejable. Alternativa: 10 archivos `reporte-r1.ts`..`r10.ts` — **descartado**, sobre-fragmenta.

- **`repos/analisis.ts`**: `getAnalisisBuffer`, `getMatrizComponenteMunicipio`,
  `getCoberturaPorMunicipio`, `getIntersectPorBoundingBox`, `getCoberturaVegetal`,
  `getDashboardKpis`, `getFooterKpis`, `getPrediosPorMunicipio`, `getPropuestasPorComponente`,
  `getAlertas`, `pingDb`, `listPropuestasSimple` (este se reexporta también desde
  `repos/propuestas.ts` para no romper imports — ver §5). **Tipos**: `BufferTarget`,
  `BufferResultTipo`, `BufferResultItem`, `MatrizFila`, `CoberturaMunicipioFila`, `BoundingBox`,
  `IntersectionResult`, `DashboardKpis`, `ComponenteTotal`, `CoberturaTotal`, `FooterKpis`,
  `PropuestaSimple`, `Alerta`.
  - **Mover `listPropuestasSimple` a `repos/propuestas.ts`** es la decisión correcta (es una
    propuesta, no un análisis). `repos/analisis.ts` lo importa desde `./propuestas`. Así no
    queda "huérfano" en análisis.

- **`repos/monitoreo.ts`**: `getMonitoreoKPIs`, `listMonitoreoPuntos`, `getMonitoreoPuntoById`,
  `listBeneficiariosByPunto`, `listBeneficiariosDisponiblesByPunto`, `actualizarPunto`,
  `asociarBeneficiario`, `desasociarBeneficiario`. **Tipos**: `MonitoreoPunto`, `MonitoreoKpis`,
  `BeneficiarioMini`, `TipoPunto` (este último, como `type`, va a `types.ts`).
  - `TIPOS_PUNTO`, `TIPO_PUNTO_LABEL`, `TIPO_PUNTO_COLOR` se importan desde `@/lib/constants`
    (ya están ahí).
  - `MONITOREO_BASE_SELECT` se queda privado en este archivo (es un fragmento SQL grande, no se
    reusa).

- **`repos/index.ts`** — barrel que re-exporta TODO desde los 9 archivos de arriba:

  ```ts
  export * from "./predios";
  export * from "./quebradas";
  export * from "./propuestas";
  export * from "./catalogos";
  export * from "./auth";
  export * from "./auditoria";
  export * from "./reportes";
  export * from "./analisis";
  export * from "./monitoreo";
  ```

### 2.5 `repository.ts` — pasa a ser un barrel de 3 líneas

```ts
// Compatibilidad temporal (1 release). Importar desde @/lib/repos directamente.
export * from "./repos";
export * from "./types";
export * from "./constants";
```

Mantiene **exactamente la misma API pública** que hoy. Ningún importador se rompe.

### 2.6 Nada más se mueve

- `lib/db.ts` — sin cambios. Sigue siendo el único punto de contacto con `postgres`.
- `lib/audit.ts` — sin cambios.
- `lib/auth.ts` — sin cambios.
- `lib/geo-import.ts` — sin cambios en este refactor (el duplicado de `COMPONENTES_VALIDOS` se
  aborda en otro PR).
- `lib/types.ts` actual — se **extiende**, no se reemplaza. Los 13 tipos que ya están se quedan
  donde están; se les suman los ~40 nuevos.

---

## 3. Plan de migración de imports (paso a paso)

### 3.1 Orden de ejecución dentro del PR único

Aunque sea un solo PR, el orden de los commits internos importa para que el build nunca esté
roto a mitad de camino:

1. **Commit 1 (verde)**: crear `lib/repos/*.ts` + `lib/repos/index.ts` + poblar `lib/types.ts` y
   `lib/constants.ts`. `repository.ts` se reescribe como barrel de 3 líneas (`export * from`).
   - **Resultado**: build sigue verde, tests siguen verdes. Cero cambios visibles.
2. **Commit 2 (verde)**: migrar los **6 client components con has-values** a `@/lib/types` y
   `@/lib/constants` (ver §4 para el detalle por archivo).
   - **Resultado**: ya no traen `db` al bundle. Build verde.
3. **Commit 3 (verde)**: migrar los **22 archivos type-only** (los 11 client + 11 server que solo
   importan types) de `@/lib/repository` a `@/lib/types`.
4. **Commit 4 (verde)**: migrar los **~25 archivos server** que importan funciones de
   `@/lib/repository` a `@/lib/repos`. Cosmético — el barrel hace que sea drop-in, pero es
   limpieza.
5. **Commit 5 (opcional, en PR aparte)**: borrar `repository.ts`. **No en este PR.**

### 3.2 Para los 22 type-only (cambio mecánico, no funcional)

- Cambiar `import type { ... } from "@/lib/repository"` → `import type { ... } from "@/lib/types"`.
- El compilador de TS no emite nada en runtime para tipos, así que el bundle del cliente no
  cambia. `next build` sigue verde.

### 3.3 Para los ~25 server con funciones (cambio cosmético)

- Cambiar `import { fn } from "@/lib/repository"` → `import { fn } from "@/lib/repos"`.
- No hay cambio de comportamiento. El barrel `repos/index.ts` re-exporta todo.

### 3.4 Plan de migración por archivo (resumen)

| Archivo | Cambio | Tipo |
|---|---|---|
| `monitoreo/monitoreo-map.tsx` | Split import: constants + types (§4) | client has-values |
| `monitoreo/monitoreo-view.tsx` | Split import: constants + types (§4) | client has-values |
| `monitoreo/punto-detalle.tsx` | Split import: constants + types (§4) | client has-values |
| `monitoreo/puntos-table.tsx` | Split import: constants + types (§4) | client has-values |
| `reportes/reporte-selector.tsx` | Split import: constants + types (§4) | client has-values |
| `catalogos/catalogos-forms.tsx` | Split import: constants + types (§4) | client has-values (**no estaba en el mapa del orquestador**) |
| 11 archivos client type-only | `repository` → `types` | cosmético |
| ~11 server type-only | `repository` → `types` | cosmético |
| ~25 server con funciones | `repository` → `repos` | cosmético |
| `lib/repository.ts` | Reescribir como barrel | core |
| 9 archivos `lib/repos/*.ts` | Crear con funciones movidas | core |
| `lib/types.ts` | Extender con ~40 tipos | core |
| `lib/constants.ts` | Crear | core |

---

## 4. Plan concreto para los 6 client components con has-values

Cada uno se resuelve **moviendo el value a `constants.ts` y el type a `types.ts`**. No hace falta
endpoint API ni pasar como prop: ninguno necesita una lista de BD — son records y arrays literales.

### 4.1 `monitoreo/monitoreo-map.tsx`

Import actual (línea 23):
```ts
import { TIPO_PUNTO_LABEL, type MonitoreoPunto, type TipoPunto } from "@/lib/repository";
```
Cambio a:
```ts
import { TIPO_PUNTO_LABEL } from "@/lib/constants";
import type { MonitoreoPunto, TipoPunto } from "@/lib/types";
```
**Decisión: split en dos imports**. `TIPO_PUNTO_LABEL` es un Record literal → va a `constants.ts`.
Los types van a `types.ts`. Cero impacto en funcionalidad.

### 4.2 `monitoreo/monitoreo-view.tsx`

Import actual (líneas 18-25): `TIPOS_PUNTO`, `TIPO_PUNTO_LABEL`, `TIPO_PUNTO_COLOR`,
`type TipoPunto`, `type MonitoreoKpis`, `type MonitoreoPunto`.
Cambio a:
```ts
import { TIPOS_PUNTO, TIPO_PUNTO_LABEL, TIPO_PUNTO_COLOR } from "@/lib/constants";
import type { TipoPunto, MonitoreoKpis, MonitoreoPunto } from "@/lib/types";
```
**Decisión: split**. Los 3 values son arrays/Records literales.

### 4.3 `monitoreo/punto-detalle.tsx`

Import actual (líneas 35-43): `TIPOS_PUNTO`, `TIPO_PUNTO_LABEL`, `TIPO_PUNTO_COLOR`,
`isEstadoIntervencion` (function), `type MonitoreoPunto`, `type BeneficiarioMini`, `type TipoPunto`,
`type EstadoIntervencion`.
Cambio a:
```ts
import { TIPOS_PUNTO, TIPO_PUNTO_LABEL, TIPO_PUNTO_COLOR, isEstadoIntervencion } from "@/lib/constants";
import type { MonitoreoPunto, BeneficiarioMini, TipoPunto, EstadoIntervencion } from "@/lib/types";
```
**Decisión: split**. `isEstadoIntervencion` es type guard puro (no toca DB) → vive en
`constants.ts`. (Esto es coherente con que `monitoreo/page.tsx` server también lo usa vía
`repository` hoy — el refactor lo deja accesible desde `constants.ts` para todos.)

### 4.4 `monitoreo/puntos-table.tsx`

Import actual (línea 17): `TIPO_PUNTO_LABEL, TIPO_PUNTO_COLOR, type MonitoreoPunto`.
Cambio a:
```ts
import { TIPO_PUNTO_LABEL, TIPO_PUNTO_COLOR } from "@/lib/constants";
import type { MonitoreoPunto } from "@/lib/types";
```
**Decisión: split**.

### 4.5 `reportes/reporte-selector.tsx`

Import actual (líneas 10-13): `REPORTE_LABELS`, `type ReporteTipo`.
Cambio a:
```ts
import { REPORTE_LABELS } from "@/lib/constants";
import type { ReporteTipo } from "@/lib/types";
```
**Decisión: split**.

### 4.6 `catalogos/catalogos-forms.tsx` (**NO ESTABA EN EL MAPA DEL ORQUESTADOR**)

Import actual (líneas 4-5): `type ComponenteFull, AccionFull` + `COMPONENTES_VALIDOS,
ACCIONES_VALIDAS`. Verificado con grep: este archivo es `"use client"` y rompe el build igual
que los otros 5.

Cambio a:
```ts
import { COMPONENTES_VALIDOS, ACCIONES_VALIDAS } from "@/lib/constants";
import type { ComponenteFull, AccionFull } from "@/lib/types";
```
**Decisión: split**.

**Corrección al mapa del orquestador**: la lista de 5 críticos es en realidad 6. El orquestador
listó a `catalogos-forms.tsx` entre los 11 type-only por error (probablemente porque leyó
solo el primer import — `import type { ... }` — y no vio el segundo, `import { ... }`, en la
línea 5).

---

## 5. Compatibilidad hacia atrás

### Recomendación: **mantener `repository.ts` como barrel durante 1 release**.

Razones:
- 51 archivos importan de `@/lib/repository` hoy (verificado con grep). Migrarlos todos en el
  mismo PR que crea los `repos/*.ts` es ruido de diff enorme.
- El barrel de 3 líneas (`export * from "./repos"; export * from "./types"; export * from
  "./constants";`) hace que la API pública sea **bit-by-bit idéntica**. Riesgo ≈ 0.
- Borrar `repository.ts` se puede hacer en un PR posterior pequeño, una vez migrados los imports.
  Pre-condición: ningún archivo debe quedar con `import` desde `@/lib/repository`.

### Lo que re-exporta `repository.ts`

**Todo lo de `repos/index.ts` + `types.ts` + `constants.ts`**. Es un barrel completo. No hace
falta una lista puntual porque `export *` ya cubre los ~120 nombres públicos del monolito original.

### Excepción a documentar

- `listPropuestasSimple` se mueve físicamente a `repos/propuestas.ts` y se re-exporta desde
  `repos/analisis.ts` (vía `export { listPropuestasSimple } from "./propuestas"`). Razón: el
  importador `app/analisis/page.tsx` ya lo trae desde `repository.ts` agrupado con funciones de
  análisis; mantener esa agrupación evita un cambio adicional.
- `REPORTE_LABELS` y `REPORTE_DESCRIPCIONES` van a `constants.ts`, no a `repos/reportes.ts` (que
  es server-only). Esto es necesario porque `reporte-selector.tsx` los necesita en cliente.

### `next.config.ts`

**No requiere cambios**. No agrego `serverExternalPackages: ["postgres"]` como parche. El refactor
elimina la causa raíz (los imports de `db` desde client components desaparecen), no la enmascara.
Si después de migrar a `@/lib/types` y `@/lib/constants` algún componente sigue trayendo `db`,
será un bug, no un tema de config.

---

## 6. Plan de deploy

### Recomendación: **un solo PR**.

Razones (en contra de partirlo):
- Los 6 client components críticos comparten el mismo "release" lógico: mientras uno solo siga
  importando de `@/lib/repository` y ese barrel exista, todo funciona. Pero **el momento en que
  el último componente crítico se mueva a `@/lib/types`/`@/lib/constants`, el barrel deja de
  importar `db` transitivamente para ese componente** (porque `types.ts` y `constants.ts` no
  importan `db`). O sea: el PR es "todo o nada" para los 6 críticos.
- Los 5 commits internos del PR (§3.1) son atómicos entre sí. Partirlos en PRs separados
  introduciría estados intermedios donde un importador crítico podría estar apuntando a un
  barrel que ya no existe.
- Code review: un solo diff cohesivo es más fácil de auditar que 5 PRs chicos relacionados.
- Tests: un solo `vitest run` + `next build` + `playwright test` al final.

Riesgo bajo: el barrel de 3 líneas en `repository.ts` garantiza que ningún importador externo
rompe hasta que explícitamente se decida migrar.

### Orden de merges (interno al PR)

`repos/*.ts` y `types.ts`/`constants.ts` primero → `repository.ts` reescrito como barrel → 6
client críticos migrados → type-only migrados → server migrados.

### Rollback

Un solo `git revert`. Bajo riesgo operacional.

---

## 7. Plan para tests

### Estado actual (verificado con grep)

- `tests/unit/db.test.ts` importa de `@/lib/db` (pgInt/pgNum/etc.). **No toca `repository.ts`** —
  los tests de helpers de parseo no se ven afectados.
- `tests/unit/validation.test.ts`, `utils.test.ts`, `csv.test.ts` — sin relación con `repository`.
- `tests/e2e/*.spec.ts` (login, predios, reportes) — no importan de `@/lib/repository` directamente;
  son black-box. **No se ven afectados**.

**Conclusión: NO hay tests que importen `@/lib/repository`**. El refactor no requiere migración
de tests.

### Verificación post-cambio

Correr en este orden:
1. `cd platform && npx tsc --noEmit` — type check global.
2. `npm run build` — debe pasar (era el bug original).
3. `npx vitest run` — los 4 unit tests siguen pasando.
4. `npx playwright test` (o `npm run e2e`) — los 3 e2e pasan contra dev server.
5. Smoke manual: `/monitoreo`, `/reportes`, `/catalogos` (que tocan los 6 client críticos).

---

## 8. Riesgo: circular imports + mitigación

### Mapa de dependencias entre `repos/*.ts`

Auditado con grep de las funciones: **no hay dependencia cruzada entre repos** en la lógica
actual. La única "compartida" es `listPropuestasSimple`, que se mueve físicamente a
`repos/propuestas.ts` y `repos/analisis.ts` la re-exporta con un `export { listPropuestasSimple
} from "./propuestas";` explícito (no `export *`, para no abrir la puerta a ciclos accidentales
más adelante).

### Tipos compartidos

Todos los tipos viven en `lib/types.ts` y se importan con `import type { ... }`. Como los
`import type` se borran en compile-time, **no pueden generar ciclos en runtime**.

### `withFallback`

Si cada `repos/*.ts` necesita su propio `withFallback` privado, hay duplicación. **Decisión**:
mover `withFallback` a `lib/repos/_helpers.ts` (con guion bajo, marca "interno") y que cada repo
lo importe. Esto es server-only (vive en `repos/`, no en `lib/`), así que no hay riesgo de
contaminar el bundle del cliente.

### Demo data

`repository.ts` actual importa de `./demo-data` (11 constantes `DEMO_*`). Estas se importan con
valores literales — son **client-safe en sí mismas** (son data estática). Sin embargo, viven en
`demo-data.ts` y se usan como `fallback` dentro de `withFallback`. **Decisión**: dejar
`demo-data.ts` como está. Cada `repos/*.ts` que lo necesite lo importa directo. Si en algún
momento `demo-data` se quiere client-side, moverlo a `constants.ts` (fuera de scope de este PR).

### Mitigación general para circulares

Regla para coder: **`repos/*.ts` solo importa de `./_helpers`, `./types`, `./constants` (este
último para type guards puros), y de `../db`**. **Nunca** importa de otro `repos/*.ts`. Si dos
repos necesitan la misma función, se extrae a `_helpers.ts` o se duplica (si son <10 líneas).

---

## 9. Notas para el agente gis (en paralelo)

- Las **5 queries espaciales** que validaste están en:
  - `repos/analisis.ts` → `getAnalisisBuffer`, `getIntersectPorBoundingBox`, `getCoberturaPorMunicipio`.
  - `repos/predios.ts` → `getPrediosGeoJSON`.
  - `repos/propuestas.ts` → `getIntervencionCompleta` (toma geom desde `sgs_pro_propuesta`).
- En el monolito viven entre las líneas 1583-1950 (analisis buffer/bbox), 1748-1810 (cobertura
  municipio), 284-340 (predios geojson), 2617-2820 (intervención completa). En el split quedan
  cada una en su archivo de dominio, sin cambios funcionales. Las queries SQL no se tocan.
- Tu validación es: leer cada archivo nuevo y verificar que el SQL sea idéntico al original
  (línea por línea con `git diff` ignorando whitespace).
- Si encontrás una query espacial rota en el proceso, es un bug pre-existente, no del split.

---

## 10. Criterios de done

- [ ] `lib/types.ts` extendido con los ~40 tipos de §1.
- [ ] `lib/constants.ts` creado con los 6 values + 3 type guards de §1.
- [ ] 9 archivos `lib/repos/*.ts` + `lib/repos/index.ts` creados.
- [ ] `lib/repository.ts` reescrito como barrel de 3 líneas.
- [ ] 6 client components críticos migrados (§4).
- [ ] 22 type-only migrados a `@/lib/types`.
- [ ] ~25 server con funciones migrados a `@/lib/repos`.
- [ ] `next build` pasa (era el bug original — debe resolverse acá).
- [ ] `tsc --noEmit` sin errores.
- [ ] 4 unit tests + 3 e2e tests pasan.
- [ ] Ningún nuevo `import` desde un `"use client"` apunta a un archivo que termine trayendo
      `db.ts` (verificable con grep `^"use client"` + `from "@/lib/repos` → debe dar 0 matches).

---

## 11. Lo que NO entra en este PR

- Borrar `repository.ts` (1 release de gracia).
- Resolver el duplicado de `COMPONENTES_VALIDOS` en `lib/geo-import.ts:104`.
- Mover `TELEFONO_REGEX`/`isValidTelefono` (están muertos; ver §1).
- Dividir `lib/auth.ts` (6.961 bytes) — fuera de scope.
- `next.config.ts`: agregar `serverExternalPackages: ["postgres"]` — parche que NO se necesita
  si el split está bien hecho. Si después de migrar queda algo trayendo `db` al cliente, es bug.
