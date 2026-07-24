# AGENTS.md — TerraSight Platform

> Convenciones y referencia para agentes IA que trabajen en `platform/`
> (Next.js 15 + React 19 + Tailwind v4 + Radix UI + Leaflet + Recharts +
> PostGIS/Supabase, NextAuth v5, Playwright + Vitest).

## Antes de empezar

1. **Lee el design system** — `../Stich/DESIGN.md` define la paleta,
   tipografía, espaciado y elevación de TerraSight Intelligence. Es la
   **fuente única de verdad visual**. Si tu trabajo toca UI, alineate con
   esa guía antes de proponer cambios.
2. **Lee el audit UI/UX vivo** — `docs/ui-ux-audit-2026-07-24.md`. Es la
   lista priorizada (P0–P3) de issues conocidos con archivo y línea
   citados. Antes de "mejorar la UI", revisalo: es probable que el issue
   ya esté reportado y haya un patrón acordado.
3. **Lee TECH-DEBT** — `docs/TECH-DEBT.md` lista los bugs ya cerrados y
   los lessons learned (DEBT-3.X). No repitas errores viejos.
4. **Sigue las convenciones**:
   - Componentes UI primitivos en `src/components/ui/` (Button, Card, Input, Badge).
   - Composición con `cn()` de `lib/utils.ts`.
   - Tailwind v4 — NO redefinir `--spacing-{sm,md,lg,...}` ni
     `--breakpoint-*` ni `--container-*` (rompe utilities estándar). Usar
     namespace `--spacing-terrasight-*` o el `@utility`/`@layer utilities`
     para tokens custom.
   - Server Components por defecto, Client Components solo cuando hace
     falta estado / efectos / eventos.
   - Idioma de UI: **español** (es-CO). Identifiers en **inglés**.
   - Iconos: **Lucide** (`lucide-react`). Los `IconLeaf`/`IconDrop`/
     `IconForest`/`IconUpload`/`IconWarn`/`IconArrowUp` de
     `src/components/icons.tsx` son solo para el ComponentRibbon (C1/C2/C3
     + Importar).
   - Cliente: español (Pedro). Respuestas del agente: español.

## Skills disponibles

| Skill | Cuándo usarla |
|-------|---------------|
| **`ui-ux-pro-max`** | Cualquier cambio de UI/UX. Cargala para que el agente tenga los 50+ estilos, 97 paletas, 99 guidelines y los 7 grupos de reglas (Accesibilidad, Interacción, Performance, Layout, Tipografía, Animación, Estilo). |
| `app-builder` | Para features nuevas full-stack. |
| `plan-mode` | Cuando hay ambigüedad o múltiples approaches. Saltar para tasks triviales. |
| `playwright` (browser-automation-testing) | Para tomar screenshots o hacer tests E2E. |
| `supabase-postgres-best-practices` | Para queries PostGIS o schema. |
| `security-best-practices` | Solo si el user pide review de seguridad. |

## Estructura de directorios

```
platform/
├── src/
│   ├── app/                  # App Router de Next.js
│   │   ├── layout.tsx        # Shell: Sidebar + TopBar + main
│   │   ├── globals.css       # @theme tokens TerraSight
│   │   ├── login/            # /login (sin sidebar)
│   │   ├── api/              # Route handlers (auth, geo, interventions, etc.)
│   │   ├── (módulos)         # /, /mapa, /predios, /intervenciones, etc.
│   │   └── not-found.tsx     # 404
│   ├── components/
│   │   ├── ui/               # Primitivos (Button, Card, Input, Badge)
│   │   ├── layout/           # Sidebar, TopBar, ModulePlaceholder
│   │   ├── map/              # MapClient, MapLayersPanel, MapTools, etc.
│   │   ├── dashboard/        # RightPanel, BottomSections, ComponentRibbon, charts
│   │   └── providers/        # AuthSessionProvider
│   ├── lib/
│   │   ├── auth.ts           # NextAuth v5 config
│   │   ├── auth-guard.ts     # requireUser, requireRole, requireAdmin
│   │   ├── db.ts             # cliente postgres
│   │   ├── utils.ts          # cn, formatInt, formatHa, formatDate
│   │   ├── constants.ts      # COMPONENTES_VALIDOS, ACCIONES_VALIDAS, etc.
│   │   ├── types.ts          # tipos client-safe
│   │   └── repos/            # 9 archivos de queries (predios, quebradas, etc.)
│   └── types/                # tipos auxiliares
├── tests/
│   ├── e2e/                  # Playwright (smoke-routes cubre 14 rutas)
│   ├── components/           # Vitest + RTL
│   └── unit/                 # Vitest unit
├── docs/
│   ├── TECH-DEBT.md          # bugs cerrados y lessons learned
│   ├── ui-ux-audit-2026-07-24.md   # ← audit vivo (P0–P3)
│   └── ui-ux-screenshots/    # capturas Playwright (12 páginas)
├── scripts/                  # PowerShell + Node helpers
└── public/                   # assets (logos aliados, etc.)
```

## Comandos frecuentes

```bash
npm run dev                # dev server en :3000 (o :3001 si 3000 ocupado)
npm run build              # build de producción
npm run lint               # ESLint (next config)
npm test                   # Vitest (156+ unit + component tests)
npm run test:e2e           # Playwright (smoke + flujos)
npm run db:up              # docker compose up -d db
npm run db:reset           # wipe + re-seed
npm run db:seed            # scripts/seed.ps1
npm run auth:create-admin  # crear/actualizar admin
node scripts/audit-screenshot.mjs  # regenerar screenshots
```

## Convenciones de commits

- Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- Referenciar el ID del audit cuando se cierra un item:
  `fix(ui): UX-40 — formatHa(0) returns "0" not "0,0"`.
- PRs chicos (1-3 files), tests E2E cuando tocan rutas.
- Antes de push: `npm test && npx tsc --noEmit && npm run lint`.

## Estado del proyecto (2026-07-24)

- **MVP-1 cerrado** (último commit `0144a58` pre-audit).
- **Deuda técnica conocida**: 9 issues (DEBT-1 a DEBT-3.9) cerrados.
  Ver `docs/TECH-DEBT.md` para detalles.
- **Audit UI/UX**: 80 issues identificados (6 P0, 18 P1, 15 P2, 8 P3).
  Ver `docs/ui-ux-audit-2026-07-24.md`.
- **OneDrive Files On-Demand**: recordar que rompe `.git/` y `next-swc`
  (ver memoria del agente).

## Anti-patrones explícitos (NO hacer)

- ❌ Redefinir `--spacing-{sm,md,lg,...}` (rompe `max-w-{sm,md,lg,...}`).
- ❌ `transition-all` en buttons (re-paint de shadows).
- ❌ `overflow: hidden` en `<body>` sin media query mobile.
- ❌ Hardcodear fechas o datos de ejemplo en producción.
- ❌ Botones placebo ("Aplicar Filtros" que no filtra nada).
- ❌ Usar emojis como iconos (UI rules).
- ❌ Z-index random (999, 9999) — usar escala: 10, 20, 30, 50.
- ❌ Animaciones > 500ms o que cambien layout.
- ❌ Imports cruzados `repository.ts` → `db.ts` en client (debt viejo).

## Contacto

- **User (Pedro)**: dev full-stack + ops + data + producto, single
  contributor, habla español, recomienda con confianza.
- **Cliente cañero**: Valle del Cauca, Colombia.
- **Cliente institucional**: CAR Cundinamarca (convenio).
