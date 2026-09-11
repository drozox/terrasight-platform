# SIG TERRITORIO — Plataforma SIG Integrada

> **Convenio CAR Cundinamarca – WWF – Fundación Natura.**
> Frontend del modelo BDG (PostgreSQL/PostGIS) sobre datos **reales** del convenio.
> Branding visible: "SIG TERRITORIO" (mayúsculas). Identifier: `sigTerritorio`.

---

## TL;DR

- **Plataforma SIG web** que muestra el inventario territorial y el avance operativo del convenio
  (predios, propuestas, drenajes, áreas protegidas, metas del convenio).
- **Datos reales** importados del GDB del cliente (1,381 propuestas, 132 predios, 5,959 vías, 656
  quebradas, cobertura CLC/POMCA/RFP/páramos, 20 municipios de Cundinamarca).
- **35 migraciones** aplicadas al Supabase del convenio (region sa-east-1, ver `.env.local`).
- **Stack**: Next.js 15 + React 19 + PostGIS + Supabase + NextAuth v5 + Leaflet + Recharts.
- **Deploy**: Vercel (auto-deploy desde `main`).
- **5 metas operativas del convenio** + drill-down municipio/propuestas + export PDF.
- **UI audit**: 46/55 items cerrados (84%).

---

## Documentos para reviewers

| Doc | Para qué |
|-----|----------|
| **`AGENTS.md`** | Convenciones, comandos, anti-patrones. **Leer primero** si vas a codear. |
| **`docs/ARCHITECTURE.md`** | Cómo está montado el sistema, modelos de datos, decisiones clave. |
| **`docs/REVIEW-GUIDE.md`** | Checklist de code review + qué validar antes de aprobar un PR. |
| **`docs/SPRINT-STATUS.md`** | Estado actual de las metas del convenio + UX audit + TECH-DEBT. |
| **`docs/TECH-DEBT.md`** | Deuda técnica cerrada (0 items abiertos al 2026-08). |
| **`docs/ui-ux-audit-2026-07-24.md`** | Audit vivo de UX (P0–P3, 46/55 cerrados). |
| **`docs/MetasConvenio/`** | Spec del convenio + plan de import Fase 6/7. |

---

## Stack

- **Next.js 15.1** (App Router) + **React 19** + **TypeScript**
- **PostgreSQL 16 + PostGIS 3.4** (Supabase)
- **Tailwind v4** con tokens de design system SIG TERRITORIO
- **Leaflet 1.9** + **react-leaflet 5** (visor 2D; OSM/Topo/Esri como basemaps)
- **Recharts 2.15** (gráficos de torta, donut, charts)
- **postgres-js** como cliente (sin ORM, SQL directo via tagged templates)
- **NextAuth v5** (auth, 3 roles: ADMIN, ANALISTA, GESTOR)
- **Lucide React** (iconografía)
- **shadcn/ui** (componentes UI primitivos, escritos a mano)
- **Vitest** (unit + component) + **Playwright** (E2E smoke)
- **Vercel** (deploy)

---

## Estructura

```
platform/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Shell (Sidebar + TopBar)
│   │   ├── page.tsx            # Dashboard home
│   │   ├── mapa/                 # Visor 2D
│   │   ├── predios/              # CRUD predios
│   │   ├── intervenciones/       # CRUD propuestas
│   │   ├── monitoreo/            # Estaciones + obras de captación
│   │   ├── analisis/             # Buffer + Matriz + Cobertura
│   │   ├── reportes/             # Los 10 SQL del cliente
│   │   ├── alertas/              # Sistema de alertas
│   │   ├── metas/convenio/       # ⭐ 5 metas operativas + drill-down
│   │   ├── catalogos/            # CRUD catálogos (admin)
│   │   └── configuracion/        # Admin + roles
│   ├── components/
│   │   ├── ui/                 # Primitivos (Button, Card, Input, Badge, Breadcrumb, Skeleton, SortableHeader)
│   │   ├── layout/             # Sidebar, TopBar, FooterKpiBar
│   │   ├── map/                # MapClient, MapLayersPanel, MapTools
│   │   └── dashboard/          # ComponentRibbon, KpiSidebar, charts
│   ├── lib/
│   │   ├── db.ts               # postgres-js singleton + pgNum/pgInt/pgDate helpers
│   │   ├── auth-guard.ts       # requireUser, requireRole, requireAdmin
│   │   ├── auth.ts             # NextAuth v5 config
│   │   ├── types.ts            # Tipos client-safe
│   │   ├── constants.ts        # COMPONENTES_VALIDOS, etc.
│   │   ├── utils.ts            # cn, formatInt, formatHa, formatDate
│   │   └── repos/              # 11 archivos de queries
│   │       ├── _cache.ts       # unstable_cache + tags wrapper
│   │       ├── _helpers.ts     # withFallback, TELEFONO_REGEX
│   │       ├── analisis.ts     # Dashboard, KPIs, intervenciones
│   │       ├── auditoria.ts    # Eventos de login
│   │       ├── catalogos.ts    # Componentes, acciones, municipios, etc.
│   │       ├── fase6.ts        # 5 indicator tables + 5 junction tables
│   │       ├── metas-convenio.ts ⭐ 5 metas + drill-down municipio + propuestas
│   │       ├── monitoreo.ts    # Estaciones, obras de captación
│   │       ├── predios.ts      # Listado, geojson, KPIs
│   │       ├── propuestas.ts   # Intervenciones
│   │       ├── quebradas.ts    # Drenajes, microcuencas
│   │       └── reportes.ts     # 10 reportes del cliente
│   └── types/                  # tipos auxiliares
├── docs/                       # Documentación viva
├── scripts/                    # PowerShell + Node helpers
│   ├── db/init/                # 31 migraciones SQL
│   ├── *.mjs                   # Import GDB, smoke tests, fixes
└── public/                     # assets (logos aliados, etc.)
```

---

## Arranque rápido (desarrollo)

```bash
# 1) Clonar
git clone https://github.com/drozox/terrasight-platform.git
cd terrasight-platform/platform

# 2) Instalar
npm install

# 3) Variables de entorno
cp .env.example .env
# Llenar DATABASE_URL con la URL de Supabase (pedir al owner)

# 4) Aplicar migraciones
node scripts/migrate.mjs --no-seed

# 5) Dev server
npm run dev
# → http://localhost:3000
```

**Datos**: si necesitas datos reales del GDB del cliente, ver `docs/SPRINT-STATUS.md` § "Import GDB" o
ejecutar `py scripts/extract_gdb.py` + `node scripts/import_gdb_to_pg.mjs`.

---

## Comandos frecuentes

| Comando | Para qué |
|---------|----------|
| `npm run dev` | Dev server en :3000 (o :3001 si 3000 ocupado) |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm test` | Vitest (156+ unit + component tests) |
| `npm run test:e2e` | Playwright (smoke + flujos) |
| `npm run db:up` | docker compose up -d db |
| `npm run db:reset` | wipe + re-seed |
| `node scripts/migrate.mjs --no-seed` | Aplicar 31 migraciones sin seed demo |
| `node scripts/prod_smoke.mjs` | Smoke test (55/56 pass pre-prod) |

---

## Modelo de datos (resumen)

El esquema completo está en `scripts/db/init/01-31-*.sql`. Las tablas principales:

- **Lookup**: `bcs_lpa_municipio` (20), `bcs_lpa_vereda` (560), `bcs_dh_microcuenca` (40), `bcs_dh_quebrada` (656)
- **Predios**: `sgs_pre_propietario` (56), `sgs_pre_predio` (132)
- **Propuestas**: `sgs_pro_propuesta` (1,381 súper) + 692 punto + 450 línea + 239 polígono
- **Componentes/Acciones**: `sgs_com_componente` (3), `sgs_com_accion` (7)
- **Ambiental**: `sgs_amb_cobertura_clc` (162), `sgs_amb_bioma` (5), `sgs_amb_paramos` (10), `sgs_amb_zonificacion_pomca` (245), `sgs_amb_zonificacion_rfp` (486)
- **Infraestructura**: `sgs_inf_via` (17,877), `sgs_inf_drenaje_simple` (1,260), `sgs_inf_drenaje_doble` (7)
- **Fase 6 — análisis**: 5 junction (`sgs_rel_predio_*`) + 5 indicator (`sgs_ind_*`)
- **Auth**: `sgs_usuario` (3 usuarios de prueba)

Convenciones:
- **PK por nombre** (no FID): `id_predio`, `id_municipio`, etc.
- **FK con `ON DELETE SET NULL`** (no CASCADE) — respetar las dependencias.
- **Geometría en SRID 4686** (geográfico, MAGNA-SIRGAS). Cálculos de distancia/área deben usar
  `::geography` cast.

---

## Estado del proyecto (2026-09-08)

| Fase | Estado | Notas |
|------|--------|-------|
| MVP-1 | ✅ Cerrado | commit `0144a58` (pre-audit) |
| Import GDB (Phase 1–5) | ✅ Cerrado | 5 fases, datos reales cargados |
| Phase 6 — Análisis territorial | ✅ Cerrado | 5 junction + 5 indicator + supabase import |
| Phase 7 — Re-import propuestas | ✅ Cerrado | commit `c9a16a7` (fix serial PKs) |
| **Metas del convenio** | ✅ Implementado | 5 metas + drill-down municipio/propuestas + export PDF |
| **Branding SIG TERRITORIO** | ✅ Cerrado | commit `a5ddcc2` (rename) |
| **UX audit** | 46/55 (84%) | ver `docs/ui-ux-audit-2026-07-24.md` |
| **TECH-DEBT** | 0 items abiertos | ver `docs/TECH-DEBT.md` |

---

## Workflow de contribución

1. Crear branch desde `main`: `git checkout -b feat/<descripcion-corta>`
2. Hacer cambios + tests (`npm test` + `npx tsc --noEmit` + `npm run lint`)
3. Commit con Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
4. PR contra `main` — ver `docs/REVIEW-GUIDE.md` para el checklist
5. Una vez aprobado, merge → Vercel auto-deploya

---

## Contacto

- **Owner del repo**: drozox (GitHub) — Pedro
- **Cliente**: Convenio CAR Cundinamarca – WWF – Fundación Natura
- **Modelo BDG**: Nikoll Tatiana Ordoñez Diaz (Universidad del Valle, 2026)
- **Stack dev**: Next.js 15 + React 19 + PostGIS + Supabase + Vercel

---

**Si algo crítico no anda, no esperes a terminar todo**: dejá un issue o mensaje.
