# TerraSight — Plataforma SIG del Convenio CAR Cundinamarca

Plataforma web de análisis geográfico sobre el modelo **BDG** (Base de
Datos Geográfica) del convenio **CAR Cundinamarca – WWF Colombia –
Fundación Natura**. Construida sobre PostgreSQL/PostGIS y Next.js 15.

---

## Estado

**MVP-1 (`v0.1.0`) cerrado el 2026-07-06.** Cubre las HUs funcionales del
PRD: consulta (HU-CO-01..04), análisis espacial (HU-AA-01..04),
catálogos + estado de intervenciones (HU-TC-01/02/04), autenticación con
roles y auditoría (HU-AD-01..04), y los 4 reportes operativos vivos en
`/reportes`.

> Ver [`DOCS/`](./DOCS) para PRD, sprints, HU-* track, matriz de roles y
> bootstrap. La pista del siguiente sprint queda en cada documento.

## Stack

| Capa | Tecnología |
|---|---|
| Web | Next.js 15 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS v4 + Radix UI + Lucide icons |
| Mapas | Leaflet + react-leaflet + Turf.js |
| BD | PostgreSQL 16 + PostGIS 3.4 (Docker) |
| Auth | NextAuth v5 (JWT, `bcryptjs`) |
| Driver | `postgres` (postgres-js) — sin ORM |
| Gráficos | Recharts |
| Shapefiles | `shpjs` |

## Requisitos

- **Node.js 20+**
- **Docker Desktop** (levanta Postgres/PostGIS)
- **PowerShell 5.1+** (los scripts `db:*`, `auth:*` y `setup` son PowerShell)

## Setup

La forma recomendada para primera corrida o después de un `db:reset`:

```powershell
cd platform
npm install
npm run setup
```

`setup` es el orquestador: prepara `.env` (regenera `NEXTAUTH_SECRET` si está como placeholder),
levanta Postgres/PostGIS, espera a que esté lista, aplica esquema base + esquema de **auth**
+ datos demo, y crea el primer `ADMIN`. Es idempotente — podés correrlo varias veces.

Si preferís paso a paso manual (o ya tenés algo andando):

```powershell
cd platform
npm install
Copy-Item .env.example .env
# Editar .env: regenerar NEXTAUTH_SECRET (ver nota abajo)

npm run db:up
npm run db:migrate        # esquema del modelo BDG (sgs_pre_*, sgs_pro_*, etc.)
npm run db:auth-schema    # tablas de auth (sgs_adm_*) — NO se incluye en db:migrate
npm run db:seed
npm run auth:create-admin
```

> **⚠️ `db:auth-schema` no se ejecuta como parte de `db:migrate`** porque vive separado
> (se aplica después de crear el contenedor). Olvidarlo deja el login roto aunque el resto
> del sistema funcione. Por eso existe `npm run setup`.

> **NEXTAUTH_SECRET**: generar con
> `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
> y reemplazar el placeholder del `.env`.

## Scripts clave

| Comando | Función |
|---|---|
| `npm run dev` | Servidor de desarrollo en `http://localhost:3000` |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint (config `next`) |
| `npm run setup` | **Orquestador de primera corrida / post-reset** (idempotente) |
| `npm run db:up` / `db:down` | Levantar / detener contenedor Postgres |
| `npm run db:reset` | Reset completo del contenedor (⚠ borra datos) |
| `npm run db:logs` | Logs de Postgres |
| `npm run db:psql` | Shell `psql` contra `convenio_car_wwf` |
| `npm run db:migrate` | Aplica `db/migrations/*.sql` en orden lexicográfico |
| `npm run db:auth-schema` | Aplica `sgs_adm_*` (tablas de auth). **No** se incluye en `db:migrate`. |
| `npm run db:seed` | Carga datos demo del modelo BDG |
| `npm run auth:create-admin` | Bootstrap del primer usuario `ADMIN` |

> **🔀 Correr TerraSight y AeroAdmin AFM a la vez:** ambos usan `:3000` por default.
> Si tenés AFM también abierto, arrancá TerraSight con `npm run dev -- -p 3001` y
> en `.env` cambiá `NEXTAUTH_URL=http://localhost:3001`. Cualquier `:30xx` libre
> sirve, pero `:3001` es el puerto que el resto del equipo espera.

## Flujo demo sugerido

1. Login con el admin creado en setup → `/dashboard` (KPIs).
2. `/mapa` → filtros por municipio/componente/quebrada, dibujar bbox.
3. `/predios` → tabla de propietarios con sort y filtro por vereda.
4. `/quebradas` → gestión de quebradas + estado de intervenciones.
5. `/reportes` → selector → 4 reportes operativos → **CSV** (BOM + `;`)
   o **Imprimir / PDF** (`window.print()`).

## Arquitectura de carpetas

```
.
├── platform/                # App Next.js
│   ├── app/                 # App Router
│   │   ├── (platform)/      # Layout autenticado (header + sidebar)
│   │   ├── api/             # Route handlers
│   │   └── reportes/        # Reportes server-side
│   ├── components/          # Componentes UI (Radix + Tailwind v4)
│   ├── lib/
│   │   ├── db/              # Pool postgres-js + repositorios
│   │   ├── auth/            # Config NextAuth v5
│   │   ├── csv.ts           # Util CSV (BOM, separador `;`, RFC 4180)
│   │   └── …
│   ├── scripts/             # db-migrate, seed, create-admin, …
│   └── db/
│       ├── migrations/      # SQL versionado
│       └── seed/            # Datos demo del modelo BDG
└── DOCS/                    # PRD, sprints, HU-*, matriz de roles
```

## Pendientes conocidos (no incluidos en MVP-1)

- **Reportes R2/R4/R5/R6/R7/R10** — escritos en `DOCS/7` listos para
  enchufar (≈30 min c/u).
- **Catálogos lookup TC-03/05** — UI (~1 día, bajo valor inicial).
- **Cambio de password por usuario** — Server Action + `bcryptjs`
  (≈½ día).
- **Reset por email** — bloqueado hasta definir SMTP.

## Licencia

[MIT](./LICENSE).

## Créditos

Convenio **CAR Cundinamarca – WWF Colombia – Fundación Natura** · tesis
base de **Nikoll Ordoñez (Universidad del Valle, 2026)** · plataforma
desarrollada por **drozox** (single contributor).
