# Review Guide — SIG TERRITORIO

> Checklist para **agentes externos** (humanos o IA) que revisan un PR antes de aprobarlo.
> Si eres un agente IA externo a este proyecto, lee también `AGENTS.md` y `docs/ARCHITECTURE.md`
> para tener contexto del stack y convenciones.

---

## 0. TL;DR

- **Verificar primero**: que el branch compila, los tests pasan y no hay secrets en el diff.
- **Revisar segundo**: que el cambio sigue las convenciones de `AGENTS.md`.
- **Revisar tercero**: que no rompe ninguno de los 9 anti-patrones listados al final.
- **Si el PR es una feature nueva**: validar end-to-end con la URL de Vercel preview.

---

## 1. Pre-checks (automatizables)

Antes de leer el código, correr:

```bash
# Desde platform/
npm install
npx tsc --noEmit          # 0 errors esperado
npm test                  # 156+ tests, 0 failures esperado
npm run lint              # 0 errors, 0 warnings esperado
node scripts/prod_smoke.mjs  # 55/56 pass esperado (el fail preexistente es drenaje doble geom=0)
```

Si alguno falla, **rechazar el PR** con un comentario citando el output. No abrir discusión sobre
"qué hacer" si los tests no pasan.

---

## 2. Anti-patrones (rechazo inmediato)

Ver `AGENTS.md` § "Anti-patrones". Los más importantes para un reviewer:

| ❌ Anti-patrón | Cómo detectarlo | Por qué importa |
|----------------|------------------|-----------------|
| `ST_Length(geom)` sin `::geography` | `grep -rn "ST_Length" src/ \| grep -v geography` | Devuelve grados, no metros. Bug histórico. |
| `ST_Area(geom)` sin `::geography` | `grep -rn "ST_Area" src/ \| grep -v geography` | Idem. |
| `TRUNCATE table CASCADE` con FK `ON DELETE SET NULL` | `grep -rn "TRUNCATE" src/ scripts/` | Borra tablas dependientes que deberían quedar. |
| Redefinir `--spacing-{sm,md,lg,...}` | `grep -n "spacing-sm\|spacing-md\|spacing-lg" src/` (definición) | Rompe utilities estándar de Tailwind. |
| `transition-all` en buttons | `grep -rn "transition-all" src/components/ui/` | Re-paint de shadows, lag. |
| Hardcodear `2025-...` o datos demo en prod | `grep -rn "DEMO_" src/app/ src/lib/repos/` (uso, no definición) | Demo data solo en `demo-data.ts`. |
| `ghp_` o cualquier secret en diff | `grep -n "ghp_\|password\|secret" $(git diff main...HEAD)` | CRÍTICO — bloquear merge. |
| `sql.array(.*, "int")` (string) | `grep -rn 'sql\.array.*"int"' src/` | TS error. Usar `sql.array(value, 23)` (OID). |
| Filtros territoriales sin server query | buscar `useState` + `?componente=` en client components | Placebo UX. |

Si encuentras alguno, **rechazo inmediato** con la cita del código.

---

## 3. Convenciones de código

### 3.1 Naming

- **Componentes**: PascalCase (`IndicadorCard`, `BloqueComponente`).
- **Funciones de repos**: camelCase con prefijo `get*` (`getMetasConvenio`, `getDetalleMunicipio`).
- **Archivos de repos**: lowercase con guión si compuesto (`fase6.ts`, `metas-convenio.ts`).
- **Tipos**: PascalCase (`MetaIndicador`, `DetalleMunicipio`).
- **SQL columns**: snake_case (`id_predio`, `area_ha`, `longitud_km`).

### 3.2 TypeScript

- **No usar `any`** salvo necesidad real (con `// eslint-disable-next-line` y razón).
- **Tagged templates con tipo genérico**:
  ```ts
  const rows = await sql<{ id: number; nombre: string }[]>`SELECT ...`;
  ```
- **Usar helpers de db.ts**: `pgNum()`, `pgInt()`, `pgDate()`, `pgText()` para parsear valores que
  vienen como string desde Postgres.

### 3.3 React / Next.js

- **Server Components por defecto**. Client Components solo cuando hay `useState`, `useEffect`,
  `onClick`, etc.
- **No `useEffect` para data fetching** — usar RSC + `cached()`.
- **No `console.log`** en producción. `console.warn` solo en dev.
- **Español en UI**, identificadores en **inglés**.

### 3.4 CSS / Tailwind

- **Tokens del design system**: usar `bg-primary`, `text-on-surface`, `bg-surface-container`, etc.
  No hardcodear colores (`bg-[#006d37]`).
- **NO redefinir** `--spacing-{sm,md,lg,...}`, `--breakpoint-*`, `--container-*`.
- Usar namespace `--spacing-terrasight-*` para tokens custom.
- **Iconos**: Lucide. No emojis.

### 3.5 SQL / PostGIS

- **SRID 4686** (geográfico). Toda geometría va en 4686.
- **Cálculos**: `ST_Length(geom::geography)`, `ST_Area(geom::geography)`.
- **Intersección espacial**: `ST_Intersects(muni.geom, prop.geom)`. No usar `ST_Contains` sin
  verificar el orden de los argumentos.
- **ILIKE con tildes**: usar `unaccent(col) ILIKE unaccent($pattern)`.
- **Tipos multi**: `ST_Multi(ST_GeomFromText(...))` para forzar multi si la tabla lo requiere.
- **CTE sobre subqueries** cuando hay JOINs múltiples (más legible).
- **Límite de seguridad**: `LIMIT 100` en queries que devuelven listas grandes.

### 3.6 Commits

- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `style:`.
- Mensaje en inglés (los commits se ven en GitHub), descriptivo.
- Si cierra un item del audit UI/UX, citar el ID: `fix(ui): UX-40 — formatHa(0) returns "0"`.
- PRs chicos: 1-3 files ideal, hasta 10 si es un refactor.

---

## 4. Por capa

### 4.1 Repos (`src/lib/repos/`)

- ✅ Función pública exportada con `cached()` + tags + TTL.
- ✅ Usa `withFallback()` para devolver demo data si falla.
- ✅ Tipos en `src/lib/types.ts` (no en el repo).
- ✅ Queries parametrizadas (NO concatenar strings del usuario).
- ✅ No expone `pgNum`/`pgInt` al llamador (mapea internamente).
- ❌ NO importa componentes UI.
- ❌ NO tiene `console.log` en producción.

### 4.2 Componentes UI (`src/components/ui/`)

- ✅ Sin dependencias de la app (solo `cn` de `lib/utils` + Tailwind).
- ✅ Sin `useState`/`useEffect` (puros).
- ✅ Props tipados explícitamente (no `any`, no spread sin control).
- ✅ `aria-label` en iconos solos.
- ✅ Soporte `prefers-reduced-motion` para animaciones.
- ❌ NO importa de `repos/` ni de `db.ts`.

### 4.3 Páginas (`src/app/**/page.tsx`)

- ✅ Server Component (sin `"use client"` salvo necesidad).
- ✅ `export const dynamic = "force-dynamic"` en páginas que dependen de searchParams o data
  del usuario.
- ✅ `export const metadata = { title: "..." }` para SEO.
- ✅ `withFallback()` para que la UI siempre renderice.
- ✅ Estados de carga con `loading.tsx` para rutas lentas.
- ✅ Breadcrumbs en drill-downs (3+ niveles).
- ❌ NO hace queries directamente con `sql` (usar repos).
- ❌ NO muestra datos demo en producción (usar `withFallback`).

### 4.4 Scripts (`scripts/*.mjs`)

- ✅ PowerShell solo donde es necesario; Node para lo demás.
- ✅ Lee `DATABASE_URL` de env, no hardcodeado.
- ✅ Logs claros (`✓`, `✗`, `→`).
- ✅ `--dry-run` o `--no-seed` cuando es destructivo.
- ❌ NO borra datos sin pedir confirmación.

---

## 5. Validación específica por feature

### 5.1 Feature nueva en `/metas/convenio` o drill-down

- [ ] ¿Está en el spec de Nikoll (`docs/MetasConvenio/`)?
- [ ] ¿El query usa `unaccent()` para tildes?
- [ ] ¿Respeta fuzzy match del spec (cerco vivo, cerca viva, etc.)?
- [ ] ¿Suma TODAS las instancias en cualquier C-A (no solo C2A2)?
- [ ] ¿Tiene `aria-current="page"` en breadcrumb?
- [ ] ¿Tiene `loading.tsx`?
- [ ] ¿Está en `INDICADORES_META` con su kind + patterns correctos?

### 5.2 Cambio en mapa (Leaflet)

- [ ] ¿Las features se cargan vía `/api/geo` (no inline)?
- [ ] ¿Las features grandes (>2MB) tienen HTTP cache en el cliente?
- [ ] ¿Los controles de zoom tienen 44x44 px (CSS global)?
- [ ] ¿Los popups tienen `aria-label` para screen readers?

### 5.3 Cambio en tabla (predios, intervenciones, etc.)

- [ ] ¿Tiene sort clickeable en headers (`SortableHeader`)?
- [ ] ¿La paginación es server-side (no client-side sobre 1000+ rows)?
- [ ] ¿Tiene `EmptyState` cuando no hay datos?
- [ ] ¿El `loading.tsx` usa `SkeletonTable`?

### 5.4 Cambio en auth / roles

- [ ] ¿Usa `requireUser()` o `requireRole(...)`?
- [ ] ¿Los roles están en MAYÚSCULAS (`ADMIN`, `ANALISTA`, `GESTOR`)?
- [ ] ¿Las acciones destructivas usan `ConfirmDialog`?
- [ ] ¿Se llama `revalidateTag` después de la mutación?

### 5.5 Migración nueva (SQL)

- [ ] ¿Es idempotente? (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- [ ] ¿DROP NOT NULL cuando hay datos NULL reales?
- [ ] ¿CHECK constraints se ajustan a los datos reales (no inventar)?
- [ ] ¿Se aplicó al Supabase real del convenio (ver `.env.local`)?
- [ ] ¿Se probó con el smoke test (`scripts/prod_smoke.mjs`)?

### 5.6 Cambio de import (scripts/import_*.mjs)

- [ ] ¿Usa `DELETE FROM` en vez de `TRUNCATE ... CASCADE`?
- [ ] ¿Recalcula `longitud_km` y `area_ha` con `::geography`?
- [ ] ¿Maneja SRID incorrecto (reprojecta con `ST_Transform`)?
- [ ] ¿Valida con `ST_MakeValid()` si la geometría viene corrupta?
- [ ] ¿Documenta qué se importó y qué se omitió?

---

## 6. Tests

- **Unit**: agregar test en `tests/unit/` o archivo `.test.ts` co-localizado.
- **Component**: agregar test en `tests/components/` con Vitest + RTL.
- **E2E**: agregar test en `tests/e2e/` con Playwright.
- **Smoke**: si tocas una ruta, agregala a `scripts/prod_smoke.mjs`.
- Para queries: testear el SQL con datos sintéticos antes de confiar en `withFallback`.

---

## 7. Checklist final antes de aprobar

```markdown
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npm test` → 0 failures
- [ ] `npm run lint` → 0 errors
- [ ] `node scripts/prod_smoke.mjs` → sin regresión
- [ ] No hay secrets en el diff (`ghp_`, passwords, tokens)
- [ ] No hay `ST_Length/Area(geom)` sin `::geography`
- [ ] No hay `TRUNCATE ... CASCADE` con FK `ON DELETE SET NULL`
- [ ] No hay `any` sin razón
- [ ] No hay `useEffect` para data fetching
- [ ] No hay emojis como iconos
- [ ] No hay `console.log` en producción
- [ ] Si cierra un item del audit, está citado en el commit
- [ ] Si agrega migración, está aplicada al Supabase real
- [ ] Si toca UX, el loading.tsx y breadcrumb están actualizados
- [ ] Si toca la base, el smoke test pasa
- [ ] Si el PR es destructivo, el usuario lo aprobó explícitamente
```

---

## 8. Después de aprobar

1. Mergear a `main` (squash o rebase, según preferencia del owner).
2. Vercel auto-detecta y deploya.
3. Verificar en la URL de producción:
   - Páginas afectadas renderizan correctamente.
   - No hay errores en la consola del browser.
   - Las queries de Supabase no exceden 1s (Vercel Analytics).
4. Si el PR cierra un item del audit (`UX-XX` o `DEBT-X.X`), actualizar el doc
   `docs/ui-ux-audit-2026-07-24.md` o `docs/TECH-DEBT.md`.

---

## 9. Recursos

- `AGENTS.md` — convenciones, comandos, anti-patrones
- `docs/ARCHITECTURE.md` — capas, modelo de datos, decisiones
- `docs/SPRINT-STATUS.md` — qué hay y qué falta
- `docs/TECH-DEBT.md` — deuda técnica cerrada
- `docs/ui-ux-audit-2026-07-24.md` — audit vivo de UX
- `docs/review-producto-2026-07-23.md` — checklist de revisión para el cliente (histórico, 2026-07)
