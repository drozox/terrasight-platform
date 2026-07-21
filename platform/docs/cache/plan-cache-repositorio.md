# Plan de caching con `unstable_cache` + `revalidateTag` — TerraSight

> **Estado:** diseño, listo para handoff a coder.
> **Stack:** Next.js 15.1.6 (App Router) + postgres-js + repos en `platform/src/lib/repos/`.
> **Objetivo:** bajar de 5-12 queries/request a ≤2 en la home e `/intervenciones` sin
> introducir datos stale visibles.
> **NO es alcance de este doc:** schema SQL, queries PostGIS, código de implementación.

---

## 0. Resumen ejecutivo (TL;DR)

- **Estrategia:** `unstable_cache` por capa de invalidación, **TTL corto + `revalidateTag` agresivo** al mutar.
- **Tags por capa funcional** (no por función): `dashboard`, `intervenciones`, `predios`,
  `quebradas`, `monitoreo`, `analisis`, `reportes`, `catalogos:full`, `catalogos:lookup`.
- **TTLs:** 60s para dashboard/geojson/intervenciones, 120s para reportes/analisis, 300s para catálogos.
- **Invalidación:** toda mutación llama `revalidateTag` de los tags que afecta (lista exacta en §2).
- **Riesgo principal:** datos stale si una action olvida invalidar. Mitigación: e2e test
  "mutar → ver reflejado" + `revalidatePath` como red de seguridad.
- **Deploy:** 1 PR, 8 commits incrementales (helper → actions → capas de lectura).

---

## 1. Mapa de cache

### 1.1 Decisión tag-por-función vs tag-compartido

**Recomendación: tag por capa de invalidación.** Razones:

1. La home hace 8 queries; cualquier mutación de predio/quebrada/intervención impacta al menos 3-5
   de ellas. Invalidar 5 tags uno por uno en cada CRUD es frágil y se va a olvidar.
2. La invalidación por capa es **transaccional en la práctica**: el user espera que un cambio
   se vea "en todo el dashboard", no "en la query 3 sí pero en la 7 no".
3. Los `revalidateTag` múltiples son baratos (son writes a un store de tags, no a Postgres).

Donde **sí** uso tag individual: queries que se invalidan por un único CRUD (catálogos full,
porque solo se mutan desde `/catalogos`).

### 1.2 Tabla maestra

Leyenda: **TTL** en segundos. **Key params** son los args de la función que forman parte del
cache key (`unstable_cache` los stringifica). **Invalidada por** lista las actions que llaman
`revalidateTag(...)` con ese tag.

| # | Función (repos) | Archivo | Tags | TTL | Key params | Invalidada por | Riesgo invalidación masiva |
|---|---|---|---|---|---|---|---|
| 1 | `getDashboardKpis` | `analisis.ts` | `["dashboard"]` | 60 | `[]` | predios ✓, intervenciones ✓, quebradas ✓, catalogos ✓ | medio (afecta 8 queries del home) |
| 2 | `getFooterKpis` | `analisis.ts` | `["dashboard"]` | 60 | `[]` | predios ✓, quebradas ✓, intervenciones ✓ | bajo (es 1 row) |
| 3 | `getIntervencionesRecientes(limit, componente)` | `propuestas.ts` | `["dashboard", "intervenciones"]` | 60 | `[limit, componente ?? "all"]` | intervenciones ✓, predios ✓, catalogos ✓ | medio (varias keys distintas por filtro) |
| 4 | `getComponentes()` | `analisis.ts` | `["dashboard", "catalogos:full"]` | 300 | `[]` | catalogos ✓ | bajo (catálogo cerrado, cambia raro) |
| 5 | `getPrediosPorMunicipio(limit)` | `analisis.ts` | `["dashboard"]` | 60 | `[limit]` | predios ✓ | bajo (depende solo de predios) |
| 6 | `getPropuestasPorComponente()` | `analisis.ts` | `["dashboard"]` | 60 | `[]` | intervenciones ✓, catalogos ✓ | bajo |
| 7 | `getCoberturaVegetal()` | `analisis.ts` | `["dashboard", "analisis"]` | 300 | `[]` | predios ✓ (cambia si se edita cobertura) | bajo (datos demo en su mayoría hoy) |
| 8 | `getMonitoreoKPIs()` | `monitoreo.ts` | `["monitoreo"]` | 60 | `[]` | monitoreo ✓, catalogos ✓, beneficiarios ✓ | medio |
| 9 | `listMonitoreoPuntos(opts)` | `monitoreo.ts` | `["monitoreo"]` | 60 | `[opts.tipo ?? "all", opts.componente ?? "all", opts.q ?? "", opts.limit ?? 200]` | monitoreo ✓, catalogos ✓, beneficiarios ✓ | medio (muchas keys por filtro) |
| 10 | `getReporteR1..R10` (10 fns) | `reportes.ts` | `["reportes"]` | 120 | `[]` | predios ✓, intervenciones ✓, catalogos ✓, monitoreo ✓ | alto (afecta 10 queries; ver §2.2) |
| 11 | `listMunicipios()` (mini, para `<select>`) | (donde esté) | `["catalogos:lookup"]` | 300 | `[]` | catalogos ✓ (crear/editar/eliminar municipio) | bajo |
| 12 | `listVeredas()` (mini) | `predios.ts` | `["catalogos:lookup"]` | 300 | `[]` | catalogos ✓ | bajo |
| 13 | `listPropietarios()` (mini) | `predios.ts` | `["catalogos:lookup"]` | 300 | `[]` | catalogos ✓ | bajo |
| 14 | `listComponentesFull()` | `catalogos.ts` | `["catalogos:full"]` | 300 | `[]` | catalogos ✓ | bajo |
| 15 | `listAccionesFull()` | `catalogos.ts` | `["catalogos:full"]` | 300 | `[]` | catalogos ✓ | bajo |
| 16 | `listMunicipiosFull()` | (catalogos secundarios) | `["catalogos:full"]` | 300 | `[]` | catalogos ✓ | bajo |
| 17 | `listVeredasFull()` | `predios.ts` | `["catalogos:full"]` | 300 | `[]` | catalogos ✓ | bajo |
| 18 | `listPropietariosFull()` | `predios.ts` | `["catalogos:full"]` | 300 | `[]` | catalogos ✓ | bajo |
| 19 | `listMicrocuencasFull()` | (catalogos secundarios) | `["catalogos:full"]` | 300 | `[]` | catalogos ✓ | bajo |
| 20 | `listBeneficiariosFull()` | `monitoreo.ts` | `["catalogos:full", "monitoreo"]` | 300 | `[]` | catalogos ✓, monitoreo ✓ | bajo |
| 21 | `getPrediosGeoJSON(componente)` | `analisis.ts` | `["dashboard", "mapa", "reportes"]` | 60 | `[componente ?? "all"]` | predios ✓, catalogos ✓, intervenciones ✓ | medio (es la query más pesada; PostGIS-free) |
| 22 | `getPrediosMini(componente)` | `analisis.ts` | `["mapa"]` | 300 | `[componente ?? "all"]` | predios ✓, intervenciones ✓, catalogos ✓ | bajo |
| 23 | `getQuebradasMini()` | `analisis.ts` | `["mapa", "dashboard"]` | 300 | `[]` | quebradas ✓, predios ✓ | bajo |
| 24 | `getMatrizComponenteMunicipio()` | `analisis.ts` | `["analisis"]` | 300 | `[]` | intervenciones ✓, catalogos ✓, predios ✓ | bajo |
| 25 | `getCoberturaPorMunicipio()` | `analisis.ts` | `["analisis"]` | 300 | `[]` | predios ✓, catalogos ✓ | bajo |
| 26 | `getAnalisisBuffer(args)` | `analisis.ts` | **NO CACHEAR** | — | — | — | — |
| 27 | `getIntersectPorBoundingBox(bbox)` | `analisis.ts` | **NO CACHEAR** | — | — | — | — |
| 28 | `getIntervencionCompleta(id)` | `propuestas.ts` | **NO CACHEAR** | — | — | — | — (single-record, sirve fresh) |

### 1.3 Justificación de los TTLs

| Categoría | TTL | Razonamiento |
|---|---|---|
| Dashboard KPIs / footer / intervenciones / geojson | **60s** | El gestor edita en vivo; un minuto es el peor caso aceptable. El cache lo invalidan los CRUD igual, así que el TTL es solo un backstop. |
| Reportes R1-R10 | **120s** | Más pesados (multi-JOIN), menos consultados por sesión. 2 min es razonable. |
| Análisis (cobertura, matriz) | **300s** | Pagina `/analisis` se abre 1-2 veces por sesión; los datos no cambian seguido. |
| Catálogos (lookup + full) | **300s** | Cambian 1-2 veces por mes. 5 min es invisible. |
| Mini mapas (predios, quebradas) | **300s** | Se renderizan en cada navegación; si hay 1000 features el cache pega. |

### 1.4 Queries que **NO** se cachean (y por qué)

| Función | Razón |
|---|---|
| `getAnalisisBuffer(args)` | Query ad-hoc, parametrizable por `distanciaM` (1-50000). El número de keys distintas sería explosivo y el patrón de uso es "abrir panel, jugar con distancia, cerrar". Mejor fresh. |
| `getIntersectPorBoundingBox(bbox)` | Mismo caso: el user arrastra el bbox, 4 floats cambian. Fresh. |
| `getIntervencionCompleta(id)` | Single-record + sirve para editar; debe ser fresh. **Crítico para la UX del gestor** (cambia estado, refresca, ve el cambio). |
| `getAlertas(limit)` | Hoy es un demo estático hardcodeado en el repo. No vale la pena cachear hasta que exista tabla real. |
| `pingDb()` | Health check, debe ser fresh. |
| `getReporteRX` cuando se sirven vía `/api/reportes/route.ts` (CSV) | **Decisión:** cachear igual con el mismo tag `reportes`. El CSV se genera a partir de los mismos datos; si la BD cambió y no se invalidó, el CSV queda stale igual. Es la misma fuente de verdad, mismo TTL, misma invalidación. |
| `getMonitoreoPuntoById(id)` | Single-record, sirve para editar/expandir. Fresh. |
| `listBeneficiariosByPunto(id)` / `listBeneficiariosDisponiblesByPunto(id)` | Single-record, interactivas. Fresh. |

---

## 2. Plan de invalidación

### 2.1 Matriz action × tags

Cada `revalidateTag` se llama **antes** del `return { ok: true, ... }`. Si la action tira
excepción, NO se invalida (consistente con el comportamiento actual de `revalidatePath`).

| Server action (archivo) | Tags a invalidar |
|---|---|
| `cambiarEstadoIntervencionAction` (intervenciones/actions.ts) | `intervenciones`, `dashboard` |
| `actualizarAvanceIntervencionAction` | `intervenciones`, `dashboard` |
| `agregarNotaAvanceAction` | `intervenciones` (el dashboard KPIs no cambia, pero la lista sí) |
| `crearPredioAction` | `predios`, `dashboard`, `mapa`, `analisis`, `reportes`, `catalogos:lookup` (si cambió idVereda/idPropietario) |
| `actualizarPredioAction` | `predios`, `dashboard`, `mapa`, `analisis`, `reportes` |
| `eliminarPredioAction` | `predios`, `dashboard`, `mapa`, `analisis`, `reportes` |
| `crearQuebradaAction` | `quebradas`, `dashboard` (footer), `mapa`, `reportes` (R9) |
| `actualizarQuebradaAction` | `quebradas`, `dashboard`, `mapa`, `reportes` |
| `eliminarQuebradaAction` | `quebradas`, `dashboard`, `mapa`, `reportes` |
| `crearComponenteAction` / `actualizarComponenteAction` / `eliminarComponenteAction` | `catalogos:full`, `dashboard`, `intervenciones`, `reportes` |
| `crearAccionAction` / `actualizarAccionAction` / `eliminarAccionAction` | `catalogos:full`, `dashboard`, `intervenciones`, `reportes` |
| `crearMunicipioAction` / `actualizarMunicipioAction` / `eliminarMunicipioAction` | `catalogos:full`, `catalogos:lookup`, `dashboard`, `reportes` |
| `crearVeredaAction` / `actualizarVeredaAction` / `eliminarVeredaAction` | `catalogos:full`, `catalogos:lookup`, `dashboard`, `mapa` (vereda mueve un predio) |
| `crearPropietarioAction` / `actualizarPropietarioAction` / `eliminarPropietarioAction` | `catalogos:full`, `catalogos:lookup`, `dashboard` |
| `crearMicrocuencaAction` / `actualizarMicrocuencaAction` / `eliminarMicrocuencaAction` | `catalogos:full`, `dashboard` (footer si cuenta) |
| `crearBeneficiarioCatalogosAction` / `actualizarBeneficiarioAction` / `eliminarBeneficiarioAction` | `catalogos:full`, `monitoreo` |
| `actualizarPuntoAction` (monitoreo) | `monitoreo`, `dashboard` (si afecta KPIs) |
| `asociarBeneficiarioAction` / `desasociarBeneficiarioAction` | `monitoreo` |
| `crearBeneficiarioAction` (monitoreo) | `monitoreo`, `catalogos:full` |
| `crearUsuarioAction` / `actualizarUsuarioAction` / `resetPasswordAction` / `toggleActivoAction` (admin) | `usuarios` *(no hay query cacheada hoy; dejar prevista)* |

### 2.2 Por qué `reportes` es un único tag compartido

Los 10 reportes R1-R10 son multi-JOIN sobre tablas distintas (predios, propuestas, acciones,
componentes, quebradas, biomas, infraestructura, municipios, beneficiarios, monitoreo).
Si cada reporte tuviera su propio tag, una mutación de predio debería invalidar `reportes:r1`,
`reportes:r2`, `reportes:r4`, `reportes:r6`, `reportes:r8` (y posiblemente más).

**Decisión:** un solo tag `reportes` cubre los 10. Cuando se invalida, se regeneran los 10 en
la próxima request al reporte correspondiente. **Riesgo:** si el user abre R5 justo después de
invalidar `reportes` por una mutación de predio, igual regenera R5 desde BD (correcto). Si
después abre R1, también regenera (correcto, no estaba en cache). El "invalida todo" es
barato porque solo se regenera la query que el user pide.

**Mitigación de costo:** los reportes son queries pesadas pero se piden 1-2 veces por sesión
típica; invalidar el grupo no impacta performance.

### 2.3 Tag chain: invalidar en cascada

Hay una jerarquía de dependencias: un cambio en `predios` puede afectar `dashboard` (KPIs
cuentan predios), `mapa` (geojson), `reportes` (R1, R2, R4, R6), `analisis` (cobertura,
matriz). **Recomendación:** las actions invalidan el tag de la capa mutada + los tags
agregados que se listan arriba. **NO** poner lógica de cascada en un wrapper (acopla mucho).

Si en el futuro se quiere evitar invalidar `dashboard` por un cambio de propietario, refinar
los tags (ej. `dashboard:footer` separado de `dashboard:kpis`). **No es prioritario hoy.**

---

## 3. Patrón de código (1 ejemplo copy-pasteable)

### 3.1 Helper único: `lib/repos/_cache.ts`

```typescript
// platform/src/lib/repos/_cache.ts
import { unstable_cache } from "next/cache";

/**
 * Envoltorio tipado de `unstable_cache` para queries del repositorio.
 *
 *   - `tags`: array de tags para `revalidateTag` desde server actions.
 *   - `ttl`: segundos hasta revalidación por tiempo (backstop de la invalidación por tag).
 *   - `keyParts`: string[] que forman parte de la cache key junto con los args de la fn.
 *
 * Decisiones:
 *   - La función interna es async; `unstable_cache` la serializa y cachea el resultado.
 *   - Preserva tipos: `cached<Q, A extends unknown[]>(fn: (...args: A) => Promise<Q>)`
 *     devuelve `(...args: A) => Promise<Q>` con la misma firma.
 *   - Si los args de la fn no son primitivos (objetos), se serializan con `JSON.stringify`
 *     para formar la cache key estable.
 */
export function cached<Q, A extends unknown[]>(
  fn: (...args: A) => Promise<Q>,
  opts: { tags: string[]; ttl?: number; keyParts?: string[] },
): (...args: A) => Promise<Q> {
  return unstable_cache(
    fn,
    opts.keyParts ?? [],
    { tags: opts.tags, revalidate: opts.ttl ?? false },
  ) as (...args: A) => Promise<Q>;
}
```

### 3.2 Aplicación a `getDashboardKpis` (sin args, sin params)

```typescript
// platform/src/lib/repos/analisis.ts
import { cached } from "./_cache";

export const getDashboardKpis = cached(
  async (): Promise<DashboardKpis> => {
    // ... (query actual, sin cambios)
  },
  { tags: ["dashboard"], ttl: 60 },
);
```

### 3.3 Aplicación a `getIntervencionesRecientes` (con args)

```typescript
// platform/src/lib/repos/propuestas.ts
import { cached } from "./_cache";

// Antes:
//   export async function getIntervencionesRecientes(limit = 6, componente?: string | null)
// Después: la firma se preserva exactamente.
export const getIntervencionesRecientes = cached(
  async (limit = 6, componente: string | null = null): Promise<IntervencionReciente[]> => {
    // ... (query actual, sin cambios)
  },
  {
    tags: ["dashboard", "intervenciones"],
    ttl: 60,
    // stringificar el null para que la cache key sea estable
    keyParts: [], // unstable_cache ya incluye los args en la key por default
  },
);
// Llamador no cambia: `await getIntervencionesRecientes(8, componenteFiltro)`.
```

**Importante:** según la doc de Next, `unstable_cache` ya usa los argumentos de la función
como parte del cache key, **pero hay que pasar `keyParts` si la fn usa closures o variables
externas**. En nuestro caso no hay closures, así que `keyParts: []` alcanza.

**Cuidado con `null` vs `undefined`:** dos llamadas con `(8, undefined)` y `(8, null)` pueden
generar keys distintas. Documentar o normalizar en el wrapper. **Recomendación:** en el
call-site, pasar siempre `null` o siempre `undefined`. En `getIntervencionesRecientes(limit,
componente?)` el default es `null` cuando no se pasa, así que el call-site que no filtra
hace `getIntervencionesRecientes(8, null)` y el que filtra hace `getIntervencionesRecientes(8, "C1")`. Estable.

### 3.4 Invalidación en server action

```typescript
// platform/src/app/intervenciones/actions.ts
import { revalidatePath, revalidateTag } from "next/cache";

export async function cambiarEstadoIntervencionAction(formData: FormData): Promise<Result> {
  // ... (validación actual, sin cambios)
  try {
    await setIntervencionEstado(idPropuesta, estadoStr as EstadoIntervencion);
    // NUEVO: invalidar cache por tag, antes del revalidatePath.
    revalidateTag("intervenciones");
    revalidateTag("dashboard");
    // El revalidatePath queda como red de seguridad: si la página usa `force-dynamic`
    // o si nos olvidamos de un tag, sigue funcionando.
    revalidatePath("/intervenciones");
    revalidatePath(`/intervenciones/${idPropuesta}`);
    return { ok: true, message: `Estado actualizado a "${estadoStr}".` };
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "No se pudo cambiar el estado." };
  }
}
```

### 3.5 Cambio de firma de tipos: ¿afecta?

`unstable_cache` en Next 15.1.6 retorna `(...args: TArgs) => Promise<T>` cuando se le pasa
`(...args: TArgs) => Promise<T>`. El cast `as (...args: A) => Promise<Q>` en el helper
preserva la firma. **No hay cambio de tipos en el resto del código.** Las pages que hoy
hacen `await getDashboardKpis()` siguen funcionando idéntico.

**Única precaución:** si una fn hoy es `export async function foo()` y se convierte a
`export const foo = cached(...)`, los `grep` de definiciones de función siguen funcionando.
Pero el `eslint-plugin-import/no-anonymous-default-export` puede quejarse — se cambia trivial.

---

## 4. Consideraciones de seguridad

### 4.1 Estado actual: no hay queries user-specific

Verificado leyendo `analisis.ts`, `predios.ts`, `propuestas.ts`, `monitoreo.ts`,
`catalogos.ts`, `reportes.ts`. **Ninguna query filtra por `id_usuario` o `rol`.** Todas son
globales al territorio (Cundinamarca/Valle). El cache es seguro.

### 4.2 Patrón a documentar para el futuro

Si en el futuro se agrega una query que filtra por usuario (ej. "mis intervenciones asignadas"):

1. **NO usar `unstable_cache`** para esa query sin incluir el `idUsuario` en la cache key.
2. Si se cachea con `keyParts: [idUsuario.toString()]`, hay una key por usuario → la
   "amortización" del cache es baja (1 hit por user activo) y el overhead de bookkeeping
   no compensa.
3. **Recomendación:** esas queries NO se cachean. Se ejecutan fresh cada request.
   Usar `Promise.all` en la page para mantener latencia baja.

Si la query filtra por **rol** (ANALISTA vs GESTOR vs ADMIN), la cache key debería incluir
`rol`. Pero otra vez: 3 keys distintos no se amortiza, no vale la pena.

**Regla para code review:** si alguien quiere cachear una query con `id_usuario` o `rol` en
el WHERE, **rechazar el PR** y pedir que no se cachee.

### 4.3 `withFallback` y datos demo

Hoy todas las queries pesadas (en `analisis.ts`, `monitoreo.ts`, `catalogos.ts`,
`predios.ts`) usan `withFallback(label, query, fallback)` que retorna `DEMO_X` si la BD
falla. **Si envolvemos con `unstable_cache`, el fallback también se cachea.**

Implicancia: en dev, cuando la BD está caída, el cache de demo persiste hasta el TTL.
Aceptable (la BD no se levanta sola en dev). **En prod no aplica** porque la BD siempre
responde (no hay fallback real).

**Decisión:** envolver `withFallback(...)` por fuera, así:

```typescript
// mal: unstable_cache envuelve la fn, pero withFallback está adentro
// y se cachea igual el resultado de la fn (sea demo o real)
const getDashboardKpis = cached(
  async () => withFallback("dashboardKpis", async () => { /* sql */ }, DEMO_X),
  { tags: ["dashboard"], ttl: 60 },
);
```

Eso está bien — la fn async interna hace el `withFallback`, y `unstable_cache` cachea el
resultado (sea real o demo). La invariante que queremos es: si la BD falló, el cache guarda
el demo hasta el TTL. La próxima mutación llama `revalidateTag("dashboard")` y al pedir
de nuevo se vuelve a intentar la BD.

---

## 5. Consideraciones de performance

### 5.1 `Promise.all` + `unstable_cache`: ¿paralelo o serie?

**Paralelo.** Next 15 con React 19: `unstable_cache` retorna una Promise; en `Promise.all`
todas las Promises inician al mismo tiempo y se esperan juntas. La dedupe del cache es por
key, no por orden de await. La latencia es `max(t_query1, t_query2, ...)`, no la suma.

Hoy la home hace `Promise.all([getDashboardKpis(), getComponentes(), ...])` (8 queries).
Con cache: en hit todas resuelven en <5ms (lectura del file-store de Next). En miss, la
primera request paga la latencia completa de la BD (~100-500ms), las siguientes ya tienen
cache.

### 5.2 Cache stampede

**Definición:** N requests concurrentes en miss ejecutan la fn N veces en paralelo, no se
amortiza la latencia.

**Mitigación primaria:** la invalidación por `revalidateTag` en cada CRUD hace que el cache
se refresque **antes** de que expire el TTL. La ventana de stampede es solo cuando el TTL
expira y nadie mutó — en la práctica, mientras el sistema esté en uso, la probabilidad es
muy baja.

**Mitigación secundaria (si se observa stampede):** en Next 15, `unstable_cache` con
`revalidate: N` (TTL) **no** hace single-flight automático entre requests distintos. Si
llega a ser un problema:

- **Opción A:** subir el TTL a 300s en queries pesadas (ya lo hice en reportes a 120s, podría
  ser 300s). Menos hits, más latencia en caso de mutación olvidada.
- **Opción B:** implementar un mutex in-process (Map<key, Promise>) en el helper. **No
  built-in, hay que codearlo.** Es 10 líneas; bajo riesgo.
- **Opción C:** migrar a Next 16 `use cache` + `cacheLife` que sí tiene SWR nativo con
  single-flight. **No urgente**, solo cuando se haga el upgrade mayor.

**Recomendación:** arrancar sin mitigación secundaria. Medir. Si el dashboard se ve
bloqueado en horario pico, implementar opción B. **No migrar a Next 16 solo por esto.**

### 5.3 Memoria

`unstable_cache` usa el file-store de Next (`.next/cache/fetch-cache`). Por default, no
expira por tamaño sino por TTL o tag invalidation. Para TerraSight:

- 8 queries del dashboard × TTL 60s → ~10 entradas máximo (algunos filtros).
- 10 reportes × TTL 120s → 10 entradas.
- 7 catálogos full × TTL 300s → 7 entradas.
- Catálogos lookup × TTL 300s × N keys (municipios ~30, veredas ~80, propietarios ~200) → ~310 entradas.
- GeoJSON por filtro de componente (~3 componentes) → 3 entradas.
- Intervenciones recientes por `(limit, componente)` → 2-3 entries por página, 5 páginas → ~15 entries.

**Total: ~360 entries.** Cada entry es JSON serializado de la query result; la más pesada
es `getPrediosGeoJSON` (~100 KB por entry × 3 entries = 300 KB). **Total estimado <1 MB.**
Insignificante.

---

## 6. Consideraciones de testing

### 6.1 Tests existentes (no asumen cache fresco)

Verificado por grep en `platform/tests/`:

- `tests/unit/db.test.ts` — testea `pgInt/pgNum/pgText/pgDate`. Puros. No rompe.
- `tests/unit/validation.test.ts` — testea `safeParseForm`. Puro. No rompe.
- `tests/unit/csv.test.ts`, `utils.test.ts` — grep no encontró match con las queries ni
  `unstable_cache` ni `revalidateTag`. Asumo puros. No rompen.
- `tests/e2e/login.spec.ts` — solo verifica que `/login` renderiza. No asume query fresca.
- `tests/e2e/predios.spec.ts` — solo verifica redirect de middleware en `/predios`. Hay un
  `test.skip` para "con sesión válida" (HU-CA-04, próximo sprint). No rompe.
- `tests/e2e/reportes.spec.ts` — idem. No rompe.

**Conclusión: ningún test existente asume query fresca.** Migrar a `unstable_cache` no
rompe la suite actual.

### 6.2 Test de invalidación (Vitest, unit)

Agregar `tests/unit/cache-invalidation.test.ts` con este patrón:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock del cache y de las actions para verificar que llaman los tags correctos.
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: (fn: any) => fn, // identity para que la fn se ejecute en línea
}));

import { cambiarEstadoIntervencionAction } from "@/app/intervenciones/actions";
import { revalidateTag } from "next/cache";

describe("cambiarEstadoIntervencionAction invalida tags", () => {
  it("llama revalidateTag('intervenciones') y revalidateTag('dashboard')", async () => {
    // setup: mockear auth, mockear setIntervencionEstado
    const fd = new FormData();
    fd.set("idPropuesta", "1");
    fd.set("estado", "Finalizada");
    const res = await cambiarEstadoIntervencionAction(fd);
    expect(res.ok).toBe(true);
    expect(revalidateTag).toHaveBeenCalledWith("intervenciones");
    expect(revalidateTag).toHaveBeenCalledWith("dashboard");
  });
});
```

Hacer 1 test similar por cada action que invalida tags. Suite de 8-10 tests, ~1 archivo.

### 6.3 Test e2e de mutación → reflejo (Playwright)

Habilitar el `test.skip` de `predios.spec.ts` cuando exista `npm run db:seed:test-user`
(HU-CA-04). El test ya cubre la tabla de predios; **agregar variante**:

```typescript
test("cambiar estado de intervención y verlo reflejado en /intervenciones", async ({ page }) => {
  // 1. Login con seed user
  // 2. Ir a /intervenciones, capturar el estado de la fila #5
  // 3. Click en el dropdown de estado de la fila #5, cambiar a "Finalizada"
  // 4. Esperar el POST a la action
  // 5. Esperar que la fila #5 ahora muestre "Finalizada" SIN recargar la página
  //    (confirma que el cache fue invalidado y la re-renderización trajo data fresca)
});
```

Si este test pasa consistentemente, **la invalidación funciona en E2E real**. Es el test
más valioso del plan.

### 6.4 Test "cache hit" (opcional, dev-only)

Agregar endpoint debug `/api/cache/stats` que devuelva:

```typescript
import { unstable_cache } from "next/cache";
export async function GET() {
  // @ts-ignore - getStats no está en tipos públicos pero existe
  const stats = unstable_cache.getStats?.() ?? null;
  return Response.json(stats);
}
```

Protegido por `requireAdmin` + `NODE_ENV !== "production"`. Útil para confirmar en
desarrollo que las queries se están cacheando y qué tags tienen entradas.

---

## 7. Plan de deploy

### 7.1 Recomendación: 1 PR, 8 commits

1. **commit 1: `feat(cache): add cached() helper`**
   - Crea `lib/repos/_cache.ts` con el wrapper tipado.
   - Sin tocar ninguna query. Sin invalidaciones. Verde.

2. **commit 2: `feat(cache): add revalidateTag calls to all server actions`**
   - Agrega `revalidateTag` a las 6 actions files (intervenciones, predios, quebradas,
     catalogos, admin, monitoreo). Sin `unstable_cache` aún, así que los `revalidateTag`
     son no-ops. Es un cambio defensivo para no olvidar.
   - Verde. Tests siguen pasando.

3. **commit 3: `feat(cache): wrap catalogos full queries`**
   - `listComponentesFull`, `listAccionesFull`, `listMunicipiosFull`, `listVeredasFull`,
     `listPropietariosFull`, `listMicrocuencasFull`, `listBeneficiariosFull`.
   - Bajo riesgo: los catálogos cambian 1-2 veces por mes.
   - Medir en /catalogos que la latencia baja.

4. **commit 4: `feat(cache): wrap catalogos lookup queries (dropdowns)`**
   - `listMunicipios`, `listVeredas`, `listPropietarios`, `listComponentesLookup`,
     `listAccionesLookup`.
   - Riesgo medio: `listPropietarios` puede tener 200+ rows. Cachearla reduce el
     "click en nuevo form" de ~80ms a <5ms.

5. **commit 5: `feat(cache): wrap dashboard queries`**
   - `getDashboardKpis`, `getFooterKpis`, `getIntervencionesRecientes`, `getComponentes`
     (en analisis), `getPrediosPorMunicipio`, `getPropuestasPorComponente`,
     `getCoberturaVegetal`, `getPrediosGeoJSON`.
   - El test e2e de mutación → reflejo (cuando esté) es el guard de este commit.

6. **commit 6: `feat(cache): wrap intervenciones + monitoreo`**
   - Lista de intervenciones recientes en `/intervenciones`, `getMonitoreoKPIs`,
     `listMonitoreoPuntos`.

7. **commit 7: `feat(cache): wrap analisis espacial + reportes`**
   - `getMatrizComponenteMunicipio`, `getCoberturaPorMunicipio`, R1..R10.

8. **commit 8: `test(cache): add invalidation tests + e2e mutate-and-see`**
   - `tests/unit/cache-invalidation.test.ts` con los 8-10 tests.
   - Habilitar el `test.skip` de `predios.spec.ts` con el nuevo test "cambiar y ver".
   - Endpoint debug `/api/cache/stats`.

### 7.2 Por feature (alternativa, **descartada**)

Sería N PRs, uno por capa. **Problemas:**

1. Cada PR deja el sistema en estado inconsistente: con cache pero sin invalidar (commit 1),
   o invalidando sin cache (commit 2). Rinde el doble de PR review.
2. La integración con e2e (test mutate-and-see) solo se puede validar al final, así que los
   PRs individuales no tienen el test que los respalda.
3. Más overhead de CI/deploy.

**Recomendación firme: 1 PR, 8 commits.** Si el review pide dividirlo, partir en 2 PRs:
PR-A (commits 1-2: helper + invalidaciones, sin cache, todo no-op) y PR-B (commits 3-8:
cache + tests). PR-A es trivial de aprobar; PR-B es la feature en sí.

### 7.3 Rollback

- El helper `cached` es opt-in: si una query envuelta se rompe, se quita el `cached(`
  y vuelve a ser una `export async function`. Cambio en 1 línea por query, revert
  granular.
- Las invalidaciones por `revalidateTag` son aditivas: si sobran tags, no rompen nada
  (solo invalidan más de lo necesario).
- Si la feature entera se revierte: `git revert <merge-sha>`. El estado "sin cache" es
  el actual.

---

## 8. Riesgos y mitigaciones

### 8.1 Tests E2E que asumen query fresca

**Verificado:** los 3 e2e specs (`login`, `predios`, `reportes`) **NO asumen query fresca**.
Solo verifican redirect de middleware. **No hay riesgo de regresión aquí.**

El `test.skip` de predios y reportes (HU-CA-04) se habilita con seed de test user, no
con cache. Se puede habilitar en el commit 8 sin tocar el resto.

### 8.2 Cambios recientes en `unstable_cache` (Next 15.1.6)

**Verificado contra docs oficiales de Next 15:**

- La firma `unstable_cache(fn, keyParts, { tags, revalidate })` **no cambió** desde Next 14.
  Estable en 15.1.6.
- `revalidate` acepta `number | false`. Con `false` el cache es indefinido hasta que se
  invalide por tag. Con número, es el TTL.
- `tags` es `string[]`. Cada tag se cachea como índice; `revalidateTag` lo limpia.
- **En Next 16** (futuro): `unstable_cache` se reemplaza por `use cache` directive y
  `cacheTag`/`updateTag`/`revalidateTag(tag, 'max')`. **Migración a hacer cuando se
  upgrade, no antes.** Mientras estés en 15.x, este plan funciona.

**Cambio de comportamiento que SÍ afecta en Next 15:** llamar `revalidateTag` o
`revalidatePath` durante render ahora tira error (PR #71093). **No aplica a este plan**
porque las invalidaciones están dentro de server actions (post-mutación), nunca en render.

### 8.3 Stale data no detectable visualmente

El síntoma clásico: el user crea/edita algo y no se refleja en el dashboard hasta que el
TTL expira. Causa típica: una action olvidó llamar `revalidateTag`.

**Mitigaciones en capas:**

1. **Code review:** el PR de invalidaciones (commit 2) es trivial de auditar — son ~30
   `revalidateTag` agregados, uno por CRUD. Checklist de review: "esta action afecta al
   tag X, ¿está en la lista?".

2. **Logging:** agregar `console.info("[revalidate]", { action, tags })` en cada
   `revalidateTag` (solo en `NODE_ENV !== "production"`). Si el user reporta stale,
   pedirle el log de la mutación y verificar qué tags se invalidaron.

3. **`revalidatePath` como red de seguridad:** las actions ya llaman `revalidatePath`
   hoy. Mantenerlos incluso después de agregar `revalidateTag` (es 1 línea, no duele).
   El `revalidatePath` por sí solo ya era la estrategia actual; el `revalidateTag` es
   aditivo.

4. **E2E test "mutate and see"** (commit 8): cuando esté habilitado, corre en CI y
   detecta regresiones de invalidación. El test es de <10s, no cuesta agregarlo al
   pipeline.

5. **Endpoint debug `/api/cache/stats`**: en dev, `curl /api/cache/stats | jq` muestra
   cuántas entradas hay por tag. Si `dashboard` tiene 0 entries pero el dashboard
   renderiza, hay un problema de capa.

### 8.4 Stale por mutación fuera de la app (seed, ETL, admin directo)

El cache es per-app. Si alguien corre `psql` y modifica `sgs_pre_predio` directamente
(migración, fix de datos), el cache queda stale hasta el TTL.

**Mitigación:** agregar endpoint admin `/api/admin/cache/invalidate` con `requireAdmin`
que llama `revalidateTag("*")` (Next soporta wildcard). Documentar en `docs/` que se
llame después de cualquier migración manual.

**Probabilidad real:** baja. El seed se hace con BD vacía, las migraciones son
destructivas (re-crean), y el admin directo no es workflow normal. Documentar y listo.

### 8.5 PostGIS: cache del plan de query

Las queries espaciales marcadas como **NO CACHEAR** (`getAnalisisBuffer`,
`getIntersectPorBoundingBox`) usan `ST_Distance`, `ST_DWithin`, `ST_Intersects`,
`ST_Area`, `ST_AsGeoJSON`. **No se cachean**, así que no hay riesgo de cache romper el
plan de query.

Las queries cacheadas con PostGIS (en realidad son **ninguna** — `getPrediosGeoJSON`
NO usa PostGIS, solo `latitud_centroide`/`longitud_centroide` que son columnas
numéricas, no geometrías). Verificado: `getPrediosGeoJSON` es la única query "espacial"
en el mapa de cache, y no toca `geom` ni `ST_*`.

**Coordinación con gis:** no hay queries PostGIS cacheadas. Si en el futuro se agrega
una (ej. `getPrediosGeoJSONBounds`), **validar con gis antes** que el plan de query no
degrade. Pero hoy: cero acoplamiento.

### 8.6 `unstable_cache` no soporta `null`/`undefined` consistente

Ya mencionado en §3.3. **Mitigación:** documentar en el helper (`_cache.ts`) la
convención "siempre pasar `null` para filtros vacíos, no `undefined`". Los call-sites
que ya pasan `null` (ej. `getPrediosGeoJSON(componenteFiltro)`) no cambian.

---

## 9. Checklist de handoff a coder

- [ ] Crear `platform/src/lib/repos/_cache.ts` con el helper `cached()` (§3.1).
- [ ] Agregar `revalidateTag(...)` en las 6 actions files (§2.1, commit 2).
- [ ] Envolver las 28 queries listadas en §1.2 (commits 3-7). NO envolver las 4 marcadas
      "NO CACHEAR" en §1.4.
- [ ] Agregar `tests/unit/cache-invalidation.test.ts` (commit 8, §6.2).
- [ ] Habilitar test e2e mutate-and-see cuando haya seed de test user (commit 8, §6.3).
- [ ] Agregar `/api/cache/stats` con `requireAdmin + NODE_ENV !== "production"` (§6.4).
- [ ] Manual QA: probar el flujo crítico "crear intervención → ver en dashboard
      `/` → cambiar estado → ver reflejado sin recargar" antes de mergear.
- [ ] Verificar en DevTools Network que la segunda carga del dashboard tiene
      `cache: HIT` (en el response de RSC).

---

## 10. Referencias

- Docs Next 15 `unstable_cache`: <https://nextjs.org/docs/app/api-reference/functions/unstable_cache>
- Docs Next 15 `revalidateTag`: <https://nextjs.org/docs/app/api-reference/functions/revalidateTag>
- Release Next 15 (caching defaults, breaking changes): <https://nextjs.org/blog/next-15>
- Migración a Next 16 `use cache` (futuro, no ahora): <https://www.buildwithmatija.com/blog/nextjs-use-cache-migration-guide>
- Discusión sobre revalidación y stampede: <https://github.com/vercel/next.js/discussions/63120>
- Discusión trpc sobre cambio de revalidateTag en Next 16: <https://github.com/trpc/trpc/discussions/7032>
