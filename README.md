# TerraSight — SIG del Convenio 3038-2024

**Convenio de Asociación 3038-2024 CAR Cundinamarca – WWF Colombia – Fundación Natura.**
Sistema de Información Geográfica web para integrar, sistematizar y gestionar la
información ambiental de los predios concertados (19 municipios priorizados +
localidad de Usme, cubierta por Bogotá).

> **Estado:** ✅ **COMPLETADO** · Tag [`v1.0.0`](https://github.com/drozox/terrasight-platform/releases/tag/v1.0.0) ·
> Release gate con datos reales: **`GOAL_COMPLETED = TRUE`**.

---

## Cumplimiento de objetivos

| Objetivo | Entregable | Evidencia |
|---|---|---|
| **General** — SIG para integrar/gestionar la información ambiental y apoyar la toma de decisiones | Base geográfica PostGIS + app web | `node scripts/prod_smoke.mjs` sin fallos |
| **OE1** — Identificar variables ambientales/territoriales/prediales | 44 tablas por dominio | [`docs/MODELO-DATOS.md`](./platform/docs/MODELO-DATOS.md) |
| **OE2** — Consolidar la información en una BD geográfica | GDB importada a PostGIS | **1.381 propuestas · 140 predios · 20 municipios · 560 veredas** |
| **OE3** — Visor web para visualización, análisis y seguimiento | Mapa · Predios · Intervenciones · Metas · Análisis · Reportes | `npm run audit:resultados` → 20/20 PASS |

Detalle completo: [`docs/ENTREGABLE-OBJETIVOS.md`](./platform/docs/ENTREGABLE-OBJETIVOS.md) ·
Resumen para el cliente: [`docs/RESUMEN-CLIENTE.md`](./platform/docs/RESUMEN-CLIENTE.md).

## Alcance (lo que cumple los objetivos)

Inicio · **Mapa** (capas + medir/identificar/buffer/selección) · **Predios** ·
**Intervenciones** (workflow + avance) · **Metas del convenio** (10 indicadores +
drill-down) · **Análisis Espacial** · **Reportes** (R1–R10, CSV/PDF).
Ver [`docs/ALCANCE.md`](./platform/docs/ALCANCE.md).

## Indicadores del convenio (datos reales)

| Meta | Indicador | Avance | Meta | % |
|---|---|---|---|---|
| C1A1 | Cercos vivos | 11.10 km | 12 | 92% |
| C1A1 | Aislamientos (alambre) | 8.89 km | 12 | 74% |
| C1A2 | Franjas de conectividad | 5.20 km | 15 | 35% |
| C1A2 | Silvopastoriles | 6.46 ha | 15 | 43% |
| C1A2 | Agroforestales | 4.44 ha | 15 | 30% |
| C2A1 | Cosecha de agua | 79 | 79 | 100% ✅ |
| C2A1 | Kit de compostaje | 79 | 79 | 100% ✅ |
| C2A2 | Estaciones limnimétricas | 7 | 7 | 100% ✅ |
| C2A2 | Obras de captación | 96 | 48 | 200% ✅ |
| C3 | Predios en áreas protegidas | 39 | 35 | 111% ✅ |

Fuente única y auditable: vistas `sgs_v_indicador_*` (migración 36).

## Stack

| Capa | Tecnología |
|---|---|
| Web | Next.js 15 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS v4 + Radix UI + Lucide |
| Mapas | Leaflet + react-leaflet + Turf.js (MVT + GeoJSON) |
| BD | PostgreSQL 16 + PostGIS (Supabase) |
| Auth | NextAuth v5 (JWT + `bcryptjs`, roles ADMIN/ANALISTA/GESTOR) |
| Driver | `postgres` (postgres-js) — sin ORM |
| Gráficos | Recharts |

## Setup (local)

```powershell
cd platform
npm install
npm run setup        # levanta PostGIS, aplica las 37 migraciones + auth + admin
npm run dev          # http://localhost:3000
```

Requisitos: Node 20+, Docker Desktop, PowerShell 5.1+.

## Comandos clave

| Comando | Función |
|---|---|
| `npm run dev` | Dev server (`:3000`) |
| `npm run build` | Build de producción |
| `npm run release:gate` | **Gate completo**: typecheck + lint + test + build (+ smoke + reconciliación si hay `DATABASE_URL`) |
| `npm test` | Unit + integración (integración se salta sin `DATABASE_URL`) |
| `npm run test:e2e` | Playwright (smoke + flujos) |
| `npm run db:migrate` | Aplica las 37 migraciones (idempotente) |
| `npm run audit:resultados` | Reconciliación de los 10 indicadores (global == detalle) |
| `node scripts/prod_smoke.mjs` | Smoke de datos/integridad/performance |

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/RESUMEN-CLIENTE.md`](./platform/docs/RESUMEN-CLIENTE.md) | Entrega en 1 página |
| [`docs/ENTREGABLE-OBJETIVOS.md`](./platform/docs/ENTREGABLE-OBJETIVOS.md) | Objetivo → entregable → evidencia |
| [`docs/MODELO-DATOS.md`](./platform/docs/MODELO-DATOS.md) | Diccionario de datos (44 tablas) |
| [`docs/ALCANCE.md`](./platform/docs/ALCANCE.md) | Alcance funcional |
| [`docs/PLAN-CIERRE-HOY.md`](./platform/docs/PLAN-CIERRE-HOY.md) | Plan de cierre |
| [`platform/docs/ARCHITECTURE.md`](./platform/docs/ARCHITECTURE.md) | Arquitectura y decisiones |
| [`platform/docs/RUNBOOK.md`](./platform/docs/RUNBOOK.md) | Operación (deploy, secretos, rollback) |
| [`DEPLOY.md`](./DEPLOY.md) | Deploy en Vercel + Supabase |
| [`platform/AGENTS.md`](./platform/AGENTS.md) | Convenciones para contribuir |

## Estructura

```
.
├── platform/                # App Next.js
│   ├── src/app/             # App Router (rutas + API)
│   ├── src/components/      # UI (layout, map, dashboard, ui)
│   ├── src/lib/             # repos (queries), auth, db, utils
│   ├── src/lib/repos/       # metas-convenio, reportes, fase6, …
│   ├── scripts/             # migrate, seed, prod_smoke, audit, release_gate
│   ├── scripts/db/init/     # 37 migraciones SQL
│   └── tests/               # unit + components + integration + e2e
├── DOCS/                    # PRD, sprints, modelo BDG (cliente)
└── Stich/                   # design system
```

## Licencia y créditos

[MIT](./LICENSE). Convenio **CAR Cundinamarca – WWF Colombia – Fundación Natura** ·
tesis base de **Nikoll Ordoñez (Universidad del Valle, 2026)** · desarrollado por **drozox**.
