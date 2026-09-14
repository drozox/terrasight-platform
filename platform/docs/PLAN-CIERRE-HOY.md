# PLAN DE CIERRE — Convenio 3038-2024 CAR–WWF–Natura

> Objetivo: cerrar los **3 objetivos específicos** hoy, con lo mínimo que los
> cumple. Se prioriza correctitud de datos + visor, no features.
> HEAD: `422efbf` · Migraciones: **37** · Fecha: 2026-09-13.

---

## 1. Diagnóstico: qué está logrado

| Objetivo | Estado | Evidencia | Brecha real |
|---|---|---|---|
| **OG** — SIG para integrar/gestionar la info ambiental del convenio | ✅ ~95% | GDB normalizada en PostGIS (Supabase) + app web | Verificar cobertura 19 municipios + Usme; deploy con esquema nuevo |
| **OE1** — Identificar variables ambientales/territoriales/prediales | ✅ | 37 migraciones: predios, propietarios, veredas, municipios, microcuencas, quebradas, coberturas, biomas, páramos, POMCA, RFP, vías, drenajes, propuestas (punto/línea/polígono), componentes/acciones, monitoreo | Falta **diccionario de datos** (documento) |
| **OE2** — Consolidar info + BD geográfica SIG | ✅ ~90% | Import GDB: 1,381 propuestas, 132 predios, 5,959 vías, 560 veredas | **Migraciones 36/37 no aplicadas en producción**; `audit:resultados` sin verificar con datos reales |
| **OE3** — Visor web (visualización + análisis + seguimiento) | ✅ ~90% | `/mapa` (Leaflet + medir/identificar/buffer/bbox/MVT + panel de datos por capa + capas de intervenciones), `/predios`, `/intervenciones` (workflow+avance), `/metas/convenio` (10 indicadores + drill-down + strip resumen en home), `/reportes` | Deploy con esquema nuevo + smoke |

**Conclusión:** no faltan funcionalidades. Faltan **3 cosas operativas**: (1) aplicar el esquema nuevo en producción, (2) desplegar, (3) verificar cobertura/reconciliación.

---

## 2. BLOQUEANTE CRÍTICO (owner, hoy)

`metas-convenio.ts` ahora lee `sgs_v_indicador_global` (**migración 36**). Si la BD
de producción no tiene 36/37, `/metas/convenio` **falla**.

```powershell
# Con la connection string DIRECTA de Supabase (puerto 5432)
$env:DATABASE_URL="postgresql://postgres:[PASS]@db.<ref>.supabase.co:5432/postgres?sslmode=require"
cd platform
node scripts/migrate.mjs --no-seed     # aplica 36 y 37
node scripts/prod_smoke.mjs            # sin regresión
npm run audit:resultados               # 10/10 PASS
```

**Criterio:** `audit:resultados` → 10 PASS y `prod_smoke` sin fallos nuevos.

---

## 3. Plan ASAP (hoy)

### Fase 0 — Esquema + datos (owner) · ✅ EJECUTADA 2026-09-13
- [x] Migraciones **36 y 37 aplicadas** a Supabase (producción).
- [x] `audit:resultados` → **20/20 PASS** (global == detalle en los 10 indicadores).
- [x] `prod_smoke` → **56 pass, 2 fail** (ver §6; ninguno bloquea).
- [x] Vistas: solo `sgs_v_indicador_global` + `sgs_v_indicador_propuesta` (las viejas, eliminadas).
- [x] `chk_pro_estado` = el constraint nuevo (6 valores). La falla de migración 04 al re-aplicar es inocua (la 33 lo restaura).
- [x] Datos reales: **1,381 propuestas · 140 predios · 20 municipios · 560 veredas**.

> **Usme:** resuelto — la localidad de Usme (Bogotá) queda **cubierta por el
> límite municipal de BOGOTÁ** (`bcs_lpa_municipio` id 4). No se agrega como
> entidad separada.

### Fase 0b — Datos menores (opcional, no bloquea)
- 2 fails de `prod_smoke`: (a) `drenaje_doble.geom = 0` (preexistente);
  (b) `sgs_ind_predio` cubre 132/140 predios (8 sin indicador).

### Fase 1 — Reducir a lo fundamental (T0) · ✅ EJECUTADA
- [x] Sidebar: dejar solo los módulos que sirven a los objetivos; ocultar lo placeholder/ops.
- [x] Mantener: Inicio, Mapa, Predios, Intervenciones, Metas del convenio, Reportes.
- [x] Ocultar del nav: Dashboard (redirect), Catálogos, Alertas, Quebradas, Monitoreo, Análisis, Admin (calidad/importaciones), Configuración.
- [x] Quitados botones 3D y bookmarks (placeholders) + logos del header.
- [x] **Dashboard del home (`/`) ahora incluye el strip resumen de Metas del convenio** (10 indicadores con barra de progreso).
- [x] **/analisis → /mapa** (redirect; el análisis vive en el visor como herramientas del toolbar).

### Fase 2 — Entregables documentales + tests core · ✅ EJECUTADA
- [x] `docs/MODELO-DATOS.md` — diccionario de variables (OE1, generado de la BD real).
- [x] `docs/ENTREGABLE-OBJETIVOS.md` — objetivo → módulo → evidencia.
- [x] `docs/ALCANCE.md` — acotamiento de módulos/funcionalidades.
- [x] E2E core: smoke-routes + `metas.spec` + `intervenciones.spec`.

### Fase 3 — Deploy + smoke (owner) · 1 h · **crítico**
- [ ] Deploy Vercel (env: DATABASE_URL pooler, NEXTAUTH_*, AUTH_TRUST_HOST).
- [ ] Smoke manual: `/`, `/login`, `/mapa`, `/predios`, `/intervenciones`, `/metas/convenio`, `/api/health` → 200.
- [ ] `GET /api/health` → `{ ok: true }`.

### Fase 4 — Gate de cierre (T0) · ✅ (falta E2E con server)
- [x] `release:gate` con `DATABASE_URL` real → **GOAL_COMPLETED = TRUE**.
- [ ] `RUN_E2E=1 npm run release:gate` (requiere dev server) — pendiente.
- [x] Tag de release `v1.0.0`.

---

## 4. Criterios de aceptación (GOAL_COMPLETED)

- [ ] Los 19 municipios + Usme tienen datos; predios concertados cargados.
- [ ] `audit:resultados` = 10/10 PASS (indicadores reconciliados).
- [ ] `/mapa` visualiza las capas reales y las 5 herramientas funcionan.
- [ ] `/metas/convenio` muestra los 10 indicadores y el drill-down suma igual al global.
- [ ] `/predios` e `/intervenciones` listan/detallan los predios concertados.
- [ ] `release:gate` verde en CI (typecheck+lint+test+build) y smoke de producción 200.

---

## 5. Fuera de alcance (se ocultan/omiten, no bloquean el cierre)
Alertas, Catálogos, Configuración, Calidad de datos, Importaciones CSV, vistas 3D,
bookmarks, dashboards independientes. Quedan accesibles por URL pero fuera del nav.
