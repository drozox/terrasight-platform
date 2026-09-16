# HANDOFF — SIG Territorio (TerraSight)

Documento de continuidad. Última sesión: rediseño dashboard + login + mapa + filtro por acción.
**Main HEAD:** `c3a587a` (rama `main`).

---

## 1. Entorno

| Qué | Valor |
|---|---|
| Repo | `C:\Users\agFab\OneDrive\Documents\GitHub\TG-Nikoll` (remote `drozox/terrasight-platform`) |
| Worktree T0 | `C:\dev\tg-t0` — rama **`main`** (`c3a587a`) ← se trabaja acá |
| Worktree T1 | `C:\dev\tg-minimax` — rama **`t1/filtro-accion`** (`d4cfbc2`) |
| Ramas | `main`, `t1/filtro-accion`, `feature/predios-f3`, `origin/*` |
| App | `https://terrasight-platform.vercel.app` (deploy final = owner) |
| Gate | `npm run release:gate` → debe dar **`GOAL_COMPLETED = TRUE`** |
| BD | Supabase (Postgres+PostGIS). Credenciales en `platform/.env.local` (`DIRECT_URL` 5432 para migrar; `DATABASE_URL` pooler 6543). **Rotar password pendiente.** |

**Regla:** no commitear secretos. Un commit por tema (español, prefijo feat/fix/docs). Gate verde antes de pushear.

---

## 2. ⚠️ Trabajo paralelo a integrar (divergencias)

| Rama | vs `main` | Contenido |
|---|---|---|
| `feature/predios-f3` | main 15 adelante / **1 atrás** | `353dfc2` **migración 43** (alarmas extendidas) |
| `t1/filtro-accion` | main 8 adelante / **9 atrás** | `/intervenciones`: chips con conteos por acción, mapa contextual en detalle, nueva intervención con dibujo, alarmas extendidas (AJUSTES 2–5) |

→ **Pendiente integrar** ambas a `main` (revisar conflictos; `main` ya incluye el filtro por acción del dashboard).

---

## 3. Estado funcional (hecho)

### Dashboard componente-céntrico
- Motor único `getResumenComponente(componente, accion)` (`src/lib/repos/resumen-componente.ts`): indicadores + conteos + por acción + top municipios/veredas, para **Todos/C1/C2/C3**.
- **Filtro por ACCIÓN** (`src/lib/acciones.ts`): `Todas → C1→{C1A1,C1A2} · C2→{C2A1,C2A2} · C3→C3AU`. URL `?componente=Cx&accion=CxAy`.
- KPIs, metas, tabla y mapa reaccionan a componente+acción.
- Semáforo RAG único (`src/lib/estado-indicador.ts`): ≥100% cumplida · 50–99% en curso · <50% atrasada.
- Secciones: **Metas** (columna derecha), **Requiere atención**, **Comparativa C1/C2/C3**, panel derecho (avance + KPIs + donut + tendencia), SummaryBar.
- Marca/UX: **logo frailejón en SVG inline** (`SigTerritorioLogo` en `components/icons.tsx`), "SIG Territorio / Gestión Territorial" en sidebar, **drawer móvil**, sin búsqueda en el header, sin pestaña Mapa.

### Mapa
- **Zoom/fitBounds a la huella del componente/acción** (`MapComponenteFocusLayer`, `/api/geo?layer=componente&componente=Cx&accion=CxAy`).
- Panel de capas con **simbología inline**, hint de zoom reubicado (no tapa la escala). ScaleControl abajo-derecha.
- Nueva capa **Intervenciones (líneas)**.
- **A9 Imprimir layout**: botón → modal (título/descripción/solicitado por/fecha) → captura del mapa (`html2canvas`) + leyenda + tabla de medidas (líneas km/m, áreas ha, puntos) + **Norte**; export **PNG** y **PDF/imprimir**.

### Login
- Rediseñado 2 columnas (hero + tarjeta con alianza del convenio), inputs con iconos y toggle de contraseña. Foto en `public/images/login-hero.jpg` (aún **no** agregada; hay degradado de respaldo).

### Datos
- 1381 propuestas · 5 acciones (C1A1=139, C1A2=145, C2A1=158, C2A2=101, C3AU=838).
- `sgs_com_accion` = 7 filas con FK; filtrar por `(c.nombre, a.nombre)`, **nunca** por `id_accion`.
- Fuente única de metas: vistas `sgs_v_indicador_propuesta/global` (migraciones 36→40→41→**42** por id_accion).

---

## 4. Pendientes (prioridad)

1. **A5 (⭐5)** — el mapa debe **restringir las capas base** (predios, vías, drenajes, propuestas) al componente/acción y **auto-activarlas** + zoom. Hoy el ribbon filtra KPIs/tabla/huella, pero no las capas base.
2. **Integrar ramas paralelas** (§2) a `main`.
3. **A2 (resto)** — **toggles de paneles** en Inicio con persistencia (localStorage). Los tabs C1/C2/C3 no se apagan.
4. **A8 (parte 2)** — menú por capa: **ver tabla completa** (modal con paginación/búsqueda/orden/exportar), **descargar** (CSV/GeoJSON/Shapefile), zoom, propiedades.
5. **Deuda UX/UI** — ver `docs/UX-UI-DEBT.md` (logo ya resuelto; quedan tipografía/contraste, a11y mapa, estados vacíos, **verificar `/dashboard`**).
6. **Deploy final + rotar password Supabase** — owner.

Planes detallados: `docs/PLAN-AJUSTES-2-9.md`, `docs/PLAN-FILTRO-ACCION.md`, `docs/PLAN-MAPA-UX.md`.

---

## 5. Archivos clave

```
src/lib/acciones.ts                      catálogo C1A1..C3AU
src/lib/estado-indicador.ts              semáforo RAG
src/lib/repos/resumen-componente.ts      motor del dashboard
src/lib/repos/analisis.ts                KPIs, intervenciones, predios (componente/acción)
src/lib/repos/geojson.ts                 capas /api/geo + huella de componente/acción
src/app/page.tsx                         lee ?componente&accion, orquesta
src/app/dashboard-suspense.tsx           secciones + slots (Metas a la derecha)
src/components/dashboard/*               ribbon, metas-strip, right-panel, bottom-sections,
                                         comparativa-componentes, alertas-metas
src/components/map/*                     map-client, map-componente-focus-layer, map-print-panel,
                                         map-layers-panel, map-legend
src/components/layout/*                  sidebar, topbar, mobile-nav, nav-items
src/app/login/*                          page.tsx + login-form.tsx
scripts/db/init/39..43-*.sql             migraciones recientes
```

---

## 6. Cómo retomar

1. `git -C C:\dev\tg-t0 status` y `git log --oneline -5` (confirmar `main`).
2. `npm run release:gate` (en `C:\dev\tg-t0\platform`) → debe dar TRUE.
3. Integrar ramas paralelas (§2) y luego seguir por **A5**.
4. Mantener un commit por tema y gate verde antes de `push origin main`.
