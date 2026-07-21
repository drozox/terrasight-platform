# Refactor: Split de `platform/src/lib/repository.ts`

> Plan consolidado. Output de `terrasight-arch` (plan de split) + `terrasight-gis` (validación de queries espaciales). Decisiones del orquestador (Mavis).

## Contexto

`platform/src/lib/repository.ts` tiene **4.199 líneas** con **~100 exports** (tipos + valores + funciones de query). Es un monolito que arrastra `db.ts` → `postgres` (cliente nativo de Node) al bundle del cliente.

**Síntoma**: `npm run build` falla con:
```
Module not found: Can't resolve 'fs'
Import trace for `./src/lib/db.ts ./src/lib/repository.ts ./src/app/...`
```

**Causa**: 6 client components importan **values** de `@/lib/repository` (no solo types). Webpack intenta bundlear `postgres` para el navegador, que no puede resolver `fs`, `net`, `tls`, `perf_hooks`.

## Decisión del orquestador

**Un solo PR con 5 commits internos** (cada uno deja build verde). El split elimina la causa raíz; **no parchar con `serverExternalPackages`**.

## Estructura nueva

```
src/lib/
├── types.ts              # EXTENDER (13 tipos hoy → ~40)
├── constants.ts          # NUEVO: values client-safe (Records, arrays, type guards)
├── demo-data.ts          # sin cambios (solo mock data, ya import types)
├── db.ts                 # sin cambios (pool postgres, server-only)
├── auth.ts               # sin cambios (NextAuth v5)
├── auth-guard.ts         # sin cambios
├── audit.ts              # sin cambios
├── validation.ts         # sin cambios
├── csv.ts                # sin cambios
├── utils.ts              # sin cambios
├── types.ts              # EXTENDER
├── repository.ts         # SE CONVIERTE en barrel de 3 líneas
└── repos/
    ├── index.ts          # barrel interno
    ├── _helpers.ts       # withFallback + helpers compartidos (server-only)
    ├── predios.ts        # CRUD predios + propietarios + veredas
    ├── quebradas.ts      # CRUD quebradas + municipios
    ├── propuestas.ts     # intervenciones + avances + listPropuestasSimple
    ├── catalogos.ts      # componentes + acciones + lookups
    ├── auth.ts           # gestión admin usuarios (no toca lib/auth.ts)
    ├── auditoria.ts      # listAuditEventos, listEventTypes
    ├── reportes.ts       # R1..R10 (10 funciones, 1 archivo)
    ├── analisis.ts       # buffer/matriz/cobertura/bbox/dashboard/alertas
    └── monitoreo.ts      # puntos + KPIs + beneficiarios
```

## Regla de oro

**Cada `repos/*.ts` SOLO importa de:**
- `./_helpers` (withFallback, etc.)
- `./types` (interfaz pura)
- `./constants` (type guards puros)
- `../db` (helpers `pgInt/pgNum/...`)

**Nunca** de otro `repos/*.ts`. Si dos repos comparten lógica, se extrae a `_helpers.ts`. Si comparten tipos, van a `types.ts`.

**Tipos compartidos**: todos viven en `lib/types.ts` y se importan con `import type` → borrados en compile-time → cero ciclos runtime.

## Inventario de exports

### A `lib/types.ts` (extender con ~40 tipos)

Hoy tiene 13: `DashboardKpis`, `ComponenteTotal`, `CoberturaTotal`, `IntervencionReciente`, `Alerta`, `FooterKpis`, `MapProperties`, `MapFeature`, `MapFeatureCollection`, `PredioMini`, `PredioPorMunicipio`, `SerieTemporal`.

**Agregar**:
- Predios: `PredioFull`, `PropietarioMini`, `PropietarioFull`, `VeredaMini`, `VeredaFull`, `VeredaInput`, `PropietarioInput`.
- Quebradas: `QuebradaFull`, `MunicipioMini`, `MunicipioFull`, `MunicipioInput`.
- Propuestas: `IntervencionCompleta` (y su base discriminated union), `AvancePropuesta`, `PropuestaSimple`, `EstadoIntervencion`, `PuntoGeom`, `LineaGeom`, `PoligonoGeom`, `GeoJSONLineString`, `GeoJSONPolygon`.
- Catálogos: `ComponenteFull`, `AccionFull`, `ComponenteLookup`, `AccionLookup`, `ComponenteValido`, `AccionValida`, `MicrocuencaFull`, `MicrocuencaInput`, `BeneficiarioFull`, `BeneficiarioMini`, `BeneficiarioInput`.
- Análisis: `BufferTarget`, `BufferResultTipo`, `BufferResultItem`, `MatrizFila`, `CoberturaMunicipioFila`, `BoundingBox`, `IntersectionResult`.
- Reportes: `ReporteTipo` + 10 `ReporteR1Fila..R10Fila`.
- Admin: `UsuarioAdmin`, `AuditEvento`, `AuditEvent`, `AuditFiltros`.
- Monitoreo: `TipoPunto`, `MonitoreoPunto`, `MonitoreoKpis`.

### A `lib/constants.ts` (NUEVO, client-safe)

- `TIPOS_PUNTO` (array de strings literal).
- `TIPO_PUNTO_LABEL: Record<TipoPunto, string>`.
- `TIPO_PUNTO_COLOR: Record<TipoPunto, ...>`.
- `COMPONENTES_VALIDOS = ["C1", "C2", "C3"] as const`.
- `ACCIONES_VALIDAS = ["A1", "A2"] as const`.
- `REPORTE_LABELS: Record<ReporteTipo, string>`.
- `REPORTE_DESCRIPCIONES: Record<ReporteTipo, string>`.
- 3 type guards puros (sin `db`): `isTipoPunto`, `isBufferTarget`, `isEstadoIntervencion`.

### Quedan privados en `repos/*.ts` (server-only)

- `ESTADOS_VALIDOS` (helper interno de `setIntervencionEstado`).
- `*RowRaw` (tipos de filas crudas de BD, antes de mapear).
- `MONITOREO_BASE_SELECT` (constante SQL).
- `parseGeoJSON` (helper interno de `getIntervencionCompleta`).

### A eliminar (muertos)

- `TELEFONO_REGEX` / `isValidTelefono` (línea 3427-3435). `grep` confirmó que nadie los importa. **Borrar**.

## Plan de migración de imports

**Orden de los 5 commits** (cada commit deja `next build` o `tsc --noEmit` verde):

### Commit 1 — Crear estructura nueva sin tocar imports
- Crear `lib/types.ts` extendido.
- Crear `lib/constants.ts` con todos los values.
- Crear `lib/repos/_helpers.ts` con `withFallback` y helpers compartidos.
- Crear `lib/repos/{predios,quebradas,propuestas,catalogos,auth,auditoria,reportes,analisis,monitoreo}.ts`.
- Crear `lib/repos/index.ts` (barrel de los 9 archivos).
- `lib/repository.ts` se reduce a:
  ```ts
  export * from "./repos";
  export * from "./types";
  export * from "./constants";
  ```
- **Estado del build**: TODAVÍA ROTO (los 6 client críticos siguen importando de `@/lib/repository` que arrastra `db`). Pero `tsc --noEmit` pasa.

### Commit 2 — Migrar los 6 client críticos
Split de import en cada uno (constants + types, no values del repo):

| Archivo | Cambio |
|---|---|
| `app/monitoreo/monitoreo-map.tsx` | `TIPO_PUNTO_LABEL` → constants; `MonitoreoPunto, TipoPunto` → types |
| `app/monitoreo/monitoreo-view.tsx` | `TIPOS_PUNTO, TIPO_PUNTO_LABEL, TIPO_PUNTO_COLOR` → constants; `TipoPunto, MonitoreoKpis, MonitoreoPunto` → types |
| `app/monitoreo/punto-detalle.tsx` | values → constants; `MonitoreoPunto, BeneficiarioMini, TipoPunto, EstadoIntervencion` → types |
| `app/monitoreo/puntos-table.tsx` | values → constants; `MonitoreoPunto` → type |
| `app/reportes/reporte-selector.tsx` | `REPORTE_LABELS` → constants; `ReporteTipo` → type |
| `app/catalogos/catalogos-forms.tsx` | `COMPONENTES_VALIDOS, ACCIONES_VALIDAS` → constants; `ComponenteFull, AccionFull` → types |

- **Estado del build**: `next build` PASA por primera vez. Los 6 críticos ya no importan `db`.

### Commit 3 — Migrar los 22 type-only client components
Cambiar `@/lib/repository` → `@/lib/types` en:

- `app/admin/usuarios/usuarios-table.tsx`
- `app/analisis/{buffer-form,cobertura-municipio-section,intersection-results,matriz-table,_types}.{tsx,ts}`
- `app/catalogos/{beneficiarios,catalogos-table,catalogos-panels,microcuencas,municipios,propietarios,veredas}-view.tsx`
- `app/intervenciones/estado-dropdown.tsx`
- `app/intervenciones/[id]/{timeline,mapa-mini,intervencion-detail}.tsx`
- `app/predios/predio-form.tsx`
- `app/predios/[id]/predio-detail.tsx`
- `app/quebradas/quebrada-table.tsx`
- `app/reportes/reporte-viewer.tsx`

- **Estado**: `tsc --noEmit` y `next build` verde. Sin cambios de runtime.

### Commit 4 — Migrar los ~25 server components
Cambiar `@/lib/repository` → `@/lib/repos` (el barrel interno):

- `app/page.tsx`
- `app/layout.tsx`
- `app/{alertas,analisis,catalogos,catalogos/*,dashboard,intervenciones,intervenciones/*,mapa,monitoreo,predios,predios/*,quebradas,quebradas/*,reportes,admin/auditoria,admin/usuarios}/page.tsx`
- `app/{catalogos,predios,quebradas,intervenciones,monitoreo,admin/usuarios}/actions.ts`
- `app/api/{reportes,analisis/buffer}/route.ts`

- **Estado**: todo verde.

### Commit 5 (OPCIONAL) — Cleanup
- Borrar `lib/repository.ts` (ya nadie lo usa).
- Borrar `TELEFONO_REGEX/isValidTelefono` (muertos).
- `lib/types.ts` queda como única fuente de tipos.
- `lib/constants.ts` queda como única fuente de values client-safe.

> El commit 5 puede ser PR aparte. No es bloqueante.

## Reglas de codificación para coder

1. **NO** modificar `db.ts`, `auth.ts`, `audit.ts`, `validation.ts`, `csv.ts`, `utils.ts`, `geo-import.ts`, `demo-data.ts`.
2. **NO** tocar `next.config.ts`. El split elimina la causa raíz.
3. **NO** agregar `serverExternalPackages` ni workarounds similares.
4. **NO** cambiar firmas de funciones públicas. Si una función devuelve `X`, sigue devolviendo `X`.
5. **NO** renombrar funciones. Si la auditoría dice "refactorizar nombres", eso va en otro PR.
6. **NO** agregar tests nuevos (no hay tests que importen `repository.ts`).
7. **NO** mover las queries a sub-archivos dentro de cada repo. Mantener 1:1 con la estructura actual.
8. **NO** crear índices nuevos en BD. Eso es DEBT-3.
9. **NO** arreglar el bug SRID preexistente de `getIntersectPorBoundingBox` ni el bug de `MONITOREO_BASE_SELECT` (DEBT-9). El split no los toca.
10. **NO** tocar archivos de `app/**` salvo los listados en commits 2, 3, 4.

## Stop conditions para coder

- [ ] Commit 1: `tsc --noEmit` verde, `vitest run` verde, `next build` **todavía falla** (esperado, es lo que arregla el commit 2).
- [ ] Commit 2: `next build` verde por primera vez. Los 6 críticos migrados.
- [ ] Commit 3: 22 type-only migrados. `tsc --noEmit` verde.
- [ ] Commit 4: ~25 server migrados. `tsc --noEmit` y `vitest run` verde. `next build` verde.
- [ ] `git grep "from \"@/lib/repository\"" platform/src/` → 0 matches (o solo en archivos que documenten el deprecation).
- [ ] `git grep "from \"@/lib/db\"" platform/src/components/ platform/src/app/**/*.tsx` (excluyendo `*.ts` de server) → 0 matches.
- [ ] Commit con mensaje: `refactor(platform): split repository.ts en repos/* + types + constants. Fix next build (DEBT-1).`
- [ ] 5 commits internos en orden, todos commiteados al PR.

## Bumps / cosas que pueden salir mal

1. **Circular import detectado tarde**: si pasa, arch/gis lo descubrió. Plan: el repo que necesita la query la mueve a `_helpers.ts` o duplica la query. Nunca importar entre repos.
2. **TS narrowing de discriminated union falla**: la línea 2755 de `repository.ts` tiene `return { ...base, tipo, geom } as IntervencionCompleta`. El split mantiene esto tal cual. Si falla el cast después del split, es bug de TS — agregar `as unknown as IntervencionCompleta` (mismo truco que ya usa).
3. **Tests rotos**: 0 tests importan `repository.ts`, así que es 0% probable. Pero correr `vitest` después de cada commit igual.
4. **Build falla por otro módulo nativo**: si postgres o @turf/turf u otra dep nativa aparece en el bundle del cliente, es bug NUEVO. Reportar, no parchar.
5. **Cache `unstable_cache` no existe**: no aplica. Si existiera, el split cambiaría las cache keys (de nombre de función a path del archivo). Hoy no hay, no hay impacto.

## Verificación final post-PR

- [ ] `npm run dev` levanta sin error.
- [ ] `/` (home) renderiza.
- [ ] `/dashboard` renderiza.
- [ ] `/predios` renderiza.
- [ ] `/mapa` renderiza.
- [ ] `/intervenciones` renderiza.
- [ ] `/intervenciones/1` renderiza (verificar mapa mini de la ficha).
- [ ] `/monitoreo` renderiza (con TIPO_PUNTO_LABEL y TIPO_PUNTO_COLOR).
- [ ] `/analisis` renderiza.
- [ ] `/reportes` renderiza con selector de 10 reportes.
- [ ] `/catalogos` renderiza (con COMPONENTES_VALIDOS y ACCIONES_VALIDAS en el form).
- [ ] `/admin/usuarios` renderiza.
- [ ] `/admin/auditoria` renderiza.
- [ ] Smoke test: `GET /api/reportes?tipo=R1` devuelve CSV con BOM.
- [ ] Smoke test: `POST /api/analisis/buffer` con `{tipo: "quebrada", id: 1, distanciaM: 500}` devuelve JSON.

## Bugs preexistentes que el split NO arregla (anotar para DEBT-9+)

- `getIntersectPorBoundingBox`: `ST_MakeEnvelope(..., 4326)` contra `sgs_pre_predio.geom` (4686). `ST_Intersects` con SRIDs distintos devuelve false silenciosamente. Detectado en auditoría original.
- `MONITOREO_BASE_SELECT`: `ST_X(pp.geom::geometry) AS lon, ST_Y(pp.geom::geometry) AS lat` para SRID 4686 devuelve coords planas MAGNA-SIRGAS, no lon/lat. **Bug NUEVO** descubierto por GIS en este review. La UI recibe coords erróneas. El sistema "funciona" en demo data porque las coords son válidas, solo que no son lon/lat.
- `db-migrate.ps1`: bug de `$MyInvocation.MyCommand.Path` (DEBT-2).
- Sin `unstable_cache` (DEBT-4).

## Decisiones bloqueantes ya tomadas

- ✅ Un solo PR, 5 commits en orden.
- ✅ `repository.ts` se mantiene como barrel 1 release (después commit 5 lo borra).
- ✅ NO parchar con `serverExternalPackages`.
- ✅ NO arreglar bugs preexistentes en este PR.
- ✅ NO renombrar funciones ni cambiar firmas.
- ✅ NO agregar tests nuevos.

## Si algo se rompe

- Si `next build` falla después del commit 2: probablemente se te olvidó migrar un archivo. `git grep "from \"@/lib/repository\"" platform/src/components/ platform/src/app/**/*.tsx` (excluyendo `*.ts` de server) → debería ser 0.
- Si `tsc --noEmit` falla: probablemente un tipo no se movió a `types.ts`. Buscá el símbolo en `lib/repos/*.ts` y movélo.
- Si un test falla: es muy raro (0 tests importan `repository.ts`). Reportá el error.
