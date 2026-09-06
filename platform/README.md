# SIG TERRITORIO — Plataforma SIG Integrada (Convenio CAR – WWF – Fundación Natura)

> Frontend del modelo BDG (PostgreSQL/PostGIS) ya diseñado por Nikoll Tatiana Ordoñez Diaz
> (Universidad del Valle, 2026) + sistema visual **"SIG TERRITORIO"** (Stitch v1).

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind v4** con tokens del design system (paleta emerald/ocean blue/ochre)
- **Leaflet 1.9 + react-leaflet 5** para el visor 2D, OSM/Topo/Esri como basemaps
- **shadcn/ui** (Card / Button / Badge / Input) — escrito a mano, sin generación interactiva
- **postgres-js** como cliente de base de datos (sin ORM, SQL directo)
- **lucide-react** para iconografía
- **PostGIS 16-3.4** corriendo en Docker

## Arranque

```bash
# 1) Levantar la BD (PostGIS + seed automático del script del cliente)
npm run db:up

# 2) Instalar dependencias (primera vez)
npm install

# 3) Crear .env (copy del template)
cp .env.example .env

# 4) Dev server
npm run dev
```

Abre <http://localhost:3000>.

## Comandos útiles

```bash
npm run db:reset   # bajar contenedor + borrar volumen + re-seed desde cero
npm run db:psql    # abre psql interactivo dentro del contenedor
npm run db:logs    # logs de Postgres
```

## Estructura

```
platform/
├── docker-compose.yml          # PostGIS 16-3.4
├── scripts/db/init/01-schema.sql   # copia exacta del Script_Implementacion.sql
├── scripts/{seed,psql}.ps1
├── src/
│   ├── app/
│   │   ├── layout.tsx          # AppShell (sidebar + topbar)
│   │   ├── page.tsx            # dashboard (HU-CO-01, HU-CO-02, HU-CO-03)
│   │   ├── mapa/                 # visor 2D/3D (fase 2)
│   │   ├── dashboard/            # dashboard analítico (fase 2)
│   │   ├── predios/              # CRUD predios (fase 2)
│   │   ├── intervenciones/       # CRUD propuestas (fase 2)
│   │   ├── monitoreo/            # obras y estaciones (fase 3)
│   │   ├── analisis/             # análisis espacial (fase 3)
│   │   ├── reportes/             # los 10 SQL del cliente (fase 3)
│   │   ├── alertas/              # notificaciones (fase 4)
│   │   └── configuracion/        # admin + roles (fase 4)
│   ├── components/
│   │   ├── layout/              # Sidebar, TopBar, FooterKpiBar, ModulePlaceholder
│   │   ├── dashboard/           # ComponentRibbon, KpiSidebar, IntervencionesTable, etc.
│   │   ├── map/                 # LeafletMap (carga dinámica)
│   │   ├── ui/                  # Card, Button, Badge, Input
│   │   └── icons.tsx            # SVGs inline (SigTerritorioLogo, partners, etc.)
│   ├── lib/
│   │   ├── db.ts                # postgres-js singleton + helpers pgNum/pgInt/pgDate
│   │   ├── repository.ts        # queries del dashboard
│   │   ├── types.ts             # tipos compartidos
│   │   └── utils.ts             # cn, formatInt, formatHa, formatPct, formatDate
│   └── app/globals.css          # tokens @theme (SIG TERRITORIO)
└── .env.example
```

## Roadmap (validación por fases)

| Fase | Alcance | HU cubiertas |
|---|---|---|
| **1 — MVP (esta entrega)** | Dashboard + mapa básico + KPIs + tabla intervenciones | HU-CO-01/02/03, HU-AA-01, HU-TC-04 |
| **2 — CRUDs** | Predios, Propuestas, Monitoreo | HU-TC-01..05, HU-AA-02 |
| **3 — Análisis + Reportes** | Cruces espaciales, exportes PDF/CSV | HU-CO-04, HU-AA-03/04 |
| **4 — Auth + Alertas** | Roles, Supabase-style RLS, alertas | HU-AD-01..04 |

## Sistema visual "SIG TERRITORIO"

- **Primary emerald** `#006d37` — conservación, métricas positivas
- **Secondary deep ocean blue** `#2f6388` — agua, navegación
- **Tertiary earthy ochre** `#944a00` — alertas, otras categorías
- **Tipografía:** Hanken Grotesk (cargada por `font-sans` con fallback system)
- **Layout híbrido** 240 px sidebar + viewport fluido + 320 px indicators
