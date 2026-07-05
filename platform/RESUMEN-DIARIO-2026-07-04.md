# Resumen diario de proyectos — 2026-07-04 (vie)

> Generado por Mavis (cron `resumen-de-tareas` 16:54 COT) para planeación de entregas.
> Fuentes: estado de git en repos activos + memoria de agente + archivos del workspace.

---

## 🟢 AeroAdmin AFM — DroneFlightAFM

**Path:** `C:\Users\agFab\OneDrive\Documents\DroneFlightAFM`
**Stack:** Next.js 16 + React 19 + Leaflet + PostGIS + Supabase
**Dominio:** Panel admin/GIS para fumigación con drones en Valle del Cauca.

### Estado
- Refactor front-end cerrado 2026-06-18 (botones muertos fuera, dashboard sin duplicar KPIs, 113 tests nuevos, **158/160 pasando** — los 2 que fallan son del scraper, no del front).
- **Sprint DJI data pipeline cerrado en 3 olas (2026-07-01):**
  - **S1.6** Asset downloader DJI (signed S3, ~10× más rápido sin Playwright, 30 tests).
  - **S1.7** Dashboard migrado de `getParcels()` legacy → `getParcelsNormalized()` (lee `dji_parcels`). `getParcels()` borrado en S2.
  - **S2** Drop legacy code: `dji_land_assets` + `dji_daily_summaries` ya estaban dropeadas en BD pero el código las seguía referenciando (bug latente). Limpieza + snapshot defensivo `dji_legacy_snapshot`.
  - **S3** Cleanup cosmético: `TRUNCATE` en vez de `DELETE` para imports, README purgado.
- **Tests: 463/463 pasando, 0 errores TS.**

### Pendiente / Próximos pasos
1. **🚨 Validación end-to-end con URLs frescas** (la más importante):
   ```bash
   node scripts/fetch-lands-from-djiag.js \
     && node scripts/download-land-assets.js \
     && node import_djiag_data.js \
     && npm run dev
   ```
   Las URLs firmadas del `lands.json` actual expiraron (TTL ~12h). Esperado: ~5–8 min, 1200 fincas × 3 kinds. Confirmar que dashboard renderiza con geometría real.
2. Backfill `dji_fumigations` per-parcel ya hecho (363 eventos). Si hay nuevas fincas en BD → re-correr `backfill-fumigations-from-flights.js`.
3. Tests del scraper (los 2 que siguen fallando `ST_MakeValid`): ¿vale la pena arreglarlos o son del importer y los obviamos?

### 🚨 Riesgo activo
- **OneDrive Files On-Demand está vaciando `.git/`** en `DroneFlightAFM`. La carpeta existe pero no tiene `HEAD` ni objects — git reporta "not a repository". Esto rompe `git log`, `git status`, historial. Si haces un commit ahora vas a perder todo el historial (que está en la nube si hubo push, o perdido si no).
  - **Acción sugerida:** verificar si hubo push a GitHub/remote. Si no, **commit AHORA antes de seguir tocando código** (recuperar historial sería muy caro).
  - Workaround OneDrive:右键 carpeta → "Always keep on this device", o `attrib +P` para pinning, o deshabilitar Files On-Demand para esa carpeta.

---

## 🟡 TerraSight / TG-Nikoll

**Path:** `C:\Users\agFab\OneDrive\Documents\GitHub\TG-Nikoll`
**Stack:** Next.js 15 + React 19 + TS + Tailwind v4 + Leaflet + postgres-js
**Dominio:** Plataforma SIG para Convenio CAR Cundinamarca – WWF – Fundación Natura sobre modelo BDG PostgreSQL/PostGIS.

### Estado
- Repo nuevo, rama `main`, commit inicial `fcdacec` 2026-06-30 con DOCS/ + Stich/ originales + plataforma MVP.
- **Último commit `e0b20b1` 2026-07-04 15:15 COT** (hoy, hace ~1.5h): "feat(platform): fallback demo para queries BD". Permite render completo sin PostgreSQL/PostGIS levantado (Docker apagado, CI, demos offline, presentaciones). Sin cambios en contratos públicos.
- MVP Fase 1 + 1.5 cerrado:
  - Dashboard conectado a BD con component-ribbon C1/C2/C3.
  - KPIs sidebar (predios/intervenciones/donut componentes/alertas).
  - Tabla de intervenciones, donut cobertura+uso, mapa Leaflet (OSM/Topo/Esri).
  - Footer KPI bar, logo CAR Cundinamarca oficial en topbar.
  - Tools + brújula + labels regiones + capas agrupadas.
  - 9 shapefiles cargados a PostGIS desde `Datos_ejemplo.txt`.
  - `/alertas` real end-to-end.

### 🚨 Alerta crítica
**30 archivos eliminados del working tree pero NO committeados.** Incluye TODO el material conceptual del cliente:
- `DOCS/0–10/`: Análisis, esquemas (conceptual/relacional/normalizado/BDG), catálogo objetos, script implementación, vistas, consultas, **historias de usuario** (`.xlsx`), manuales (técnico + usuario).
- `Stich/DESIGN.md`, `stitch_interfaz_sig_ambiental.zip` (referencia visual).
- `DOCS/ChatGPT Image... EJEMPLO PLATAFORMA.png`.

**¿Borrado intencional o accidente?**
- `git status --short` lista 30 archivos como ` D` (deleted in worktree, tracked). Eso significa que **estaban commiteados** y `git checkout`/`rm` los borró del disco sin stagear.
- Si querías empezar limpio (no incluir DOCS/ en el repo público), ahora es buen momento — solo `git add -u && git commit` para confirmar la baja.
- Si fue accidente → `git checkout HEAD -- DOCS/ Stich/` para restaurar TODO.

### Pendiente (HU Fase 1)
- ✅ Cubierto: HU-CO-01/02/03, HU-AA-01, HU-TC-04.
- ❌ Pendiente: **HU-TC-01..05 (CRUD)**, **HU-AA-02..04 (análisis)**, HU-CO-04 (reportes), **HU-AD-01..04 (auth/roles/alertas)**.
- Cobertura actual ~6/22 HUs = **~27%**.

### Sugerencia de orden
1. Resolver lo de los DOCS eliminados (commit o restore) — bloquea cualquier avance si fue accidente.
2. CRUD de tablas catálogo (HU-TC-01..05) — habilita todo lo demás.
3. Auth + roles (HU-AD-01..04) — sin esto no se puede desplegar multiusuario.
4. Análisis espacial (HU-AA-02..04) — el "core" del SIG.
5. Reportes (HU-CO-04).

### Nota técnica
- Postgres local: puerto **5433** (5432 lo tiene `afm-postgis` de AeroAdmin). `.env` y `lib/db.ts` ya configurados.
- `next dev` arranca en ~6s pero **no levantar desde el bash tool en background** (se mata por timeout); usar terminal interactiva o `timeout: 600000` explícito.

---

## ⚪ Playground (sin contexto)

**Path:** `C:\Users\agFab\OneDrive\Documents\Playground`
**Señales:** `.git/` (vacío por OneDrive), `api/`, `frontend/`, `spacetimedb/`, `scripts/`, `docs/`, `dist/`.
**Hipótesis:** experimento / PoC con SpaceTimeDB. No hay commits accesibles, no hay notas.

**Sugerencia:** Si está activo, agregale un README al root y/o un AGENTS.md para que la próxima sesión sepa qué es. Si no está activo, moverlo a `~/archive/` o marcarlo.

---

## ⚪ GeoTwin Comunitario de Riesgo

**Path:** `C:\Users\agFab\OneDrive\Documents\GitHub\GeoTwin Comunitario de Riesgo`
**Señales:** `backend/`, `frontend/`, `.git/` (vacío).
**Sin commits visibles, sin contexto en memoria.** No sé si está activo o es scaffold viejo.

---

## 📋 Otras carpetas detectadas (probablemente inactivas / aprendizaje)

`brocode`, `curso-node-js-main`, `javascript`, `typescript`, `React_learn`, `tailwind`, `vueJS`, `Python`, `geofencing_project`, `sig-proxy-n8n-Ideam-data-`, `aprendiendo-react_midu_fulL_clases`, `museo-3d`, `Ideam_Geovisor`, `miniconda_enviroments`, `obsidian`, `NetJS_Projects`, `warp_opencode`, `CoDataMCP`. **No las toqué** — no parecen activas, pero si alguna sí está en uso decime y la agrego al radar.

---

## 🎯 Lo que te sugiero hacer HOY (en orden)

1. **(5 min)** AeroAdmin: decidir si hubo push a remote → si NO, hacer commit para salvar el historial antes de que OneDrive lo pierda del todo.
2. **(2 min)** TerraSight: mirar la lista de DOCS/ borrados — ¿intencional o accidente? Si fue accidente, `git checkout HEAD -- DOCS/ Stich/`.
3. **(30 min)** AeroAdmin: correr la validación end-to-end con URLs frescas (verificar que dashboard renderiza con geometría real post-S2/S3).
4. **(planificación)** Definir sprint siguiente TerraSight: CRUD vs auth vs análisis. Mi voto: **auth primero** (sin auth no podés mostrarle al cliente, y desbloquea el resto porque ya sabés quién hace qué).
5. **(5 min)** Decidir si Playground y GeoTwin siguen activos o se archivan.