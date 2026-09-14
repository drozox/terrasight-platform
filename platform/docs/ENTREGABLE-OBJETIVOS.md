# ENTREGABLE — Cumplimiento de objetivos · Convenio 3038-2024 CAR–WWF–Natura

> Trazabilidad: cada objetivo ↔ qué lo cumple ↔ cómo se verifica.
> Alcance funcional: [`ALCANCE.md`](./ALCANCE.md). Variables: [`MODELO-DATOS.md`](./MODELO-DATOS.md).

## Objetivo general
**SIG para integrar, sistematizar y gestionar la información ambiental como
herramienta de seguimiento, monitoreo y toma de decisiones.**

| Qué lo cumple | Módulo / artefacto | Verificación |
|---|---|---|
| Base geográfica en PostGIS + app web integrada | Supabase (PostgreSQL 16 + PostGIS) + Next.js | `node scripts/prod_smoke.mjs` (sin fails) |
| Indicadores del convenio consolidados y auditables | vistas `sgs_v_indicador_*` | `npm run audit:resultados` → 10/10 + global==detalle |

## OE1 — Identificar variables ambientales/territoriales/prediales
**Variables de seguimiento a conservación, restauración, reconversión productiva
y manejo del recurso hídrico en predios concertados.**

| Qué lo cumple | Módulo / artefacto | Verificación |
|---|---|---|
| Modelo de datos completo (44 tablas por dominio) | [`MODELO-DATOS.md`](./MODELO-DATOS.md) + migraciones `01..37` | el documento lista cada tabla y sus campos |
| Clasificación de acciones | `sgs_com_componente` (C1/C2/C3) × `sgs_com_accion` (A1/A2) | `/catalogos` (por URL) / vistas |

## OE2 — Consolidar la información en una BD geográfica
**Integración de fuentes oficiales + levantamientos de campo en entorno SIG.**

| Qué lo cumple | Módulo / artefacto | Verificación |
|---|---|---|
| Import GDB → PostGIS (predios, propuestas, coberturas, infraestructura) | Supabase `pjcvewberfgwywfnutjv` | `prod_smoke` (conteos en rango) |
| Datos reales cargados | 1,381 propuestas · 140 predios · 20 municipios · 560 veredas | `prod_smoke` §1 |
| Integridad referencial y cobertura espacial | FKs + geometrías SRID 4686 | `prod_smoke` §2 y §3 |

## OE3 — Visor geográfico web (visualización + análisis + seguimiento)
**Visualizar, analizar y hacer seguimiento/evaluación de las intervenciones en
predios concertados.**

| Qué lo cumple | Módulo / ruta | Verificación |
|---|---|---|
| Visor con capas + herramientas de análisis | `/mapa` (medir, identificar, buffer, selección por rectángulo, MVT) | abrir `/mapa` con sesión; e2e smoke |
| Predios concertados | `/predios` (+ detalle) | listar/filtrar predios; detalle con mapa |
| Intervenciones y su avance | `/intervenciones` (+ workflow/avance) | detalle con WorkflowPanel + histórico |
| Seguimiento de metas | `/metas/convenio` (+ drill-down municipio/propuestas) | los 10 indicadores; drill-down suma == global |
| Análisis espacial | `/analisis` (buffer, bbox, matriz, cobertura) | ejecutar buffer/bbox |
| Reportes para decisión | `/reportes` R1–R10 (CSV/PDF) | generar R1 y descargar CSV |

## Cómo verificar todo (release gate)
```bash
cd platform
DATABASE_URL=<directa 5432> npm run release:gate   # typecheck+lint+test+build+smoke+reconciliación
# Esperado: GOAL_COMPLETED = TRUE
```

> **Estado 2026-09-13:** `GOAL_COMPLETED = TRUE` contra la BD de producción.
