# SIG del Convenio 3038-2024 — Resumen de entrega

**Convenio de Asociación 3038-2024 CAR – WWF Colombia, en alianza con Fundación Natura**
19 municipios priorizados + localidad de Usme (cubierta por Bogotá).

**Estado:** ✅ **COMPLETADO** · Tag `v1.0.0` · Release gate con datos reales: `GOAL_COMPLETED = TRUE`.

---

## 1. Qué se entrega

Un **Sistema de Información Geográfica web** que integra, sistematiza y gestiona la
información ambiental del convenio, con:

- **Base de datos geográfica (PostGIS)** con las variables ambientales, territoriales
  y prediales del convenio, en SRID 4686 (MAGNA-SIRGAS).
- **Visor geográfico web** para visualizar, analizar y hacer seguimiento a las
  intervenciones en los predios concertados.

---

## 2. Objetivos → entregable → evidencia

| Objetivo | Entregable | Evidencia / cómo verificarlo |
|---|---|---|
| **General:** SIG para integrar, sistematizar y gestionar la información ambiental | Base geográfica (PostGIS) + aplicación web | `prod_smoke` sin fallos; indicadores auditados |
| **OE1:** Identificar variables ambientales/territoriales/prediales | **44 tablas** organizadas por dominio (predios, propuestas, ambiental, hidrografía, infraestructura…) | `docs/MODELO-DATOS.md` (diccionario generado de la BD) |
| **OE2:** Consolidar la información en una BD geográfica | GDB del cliente importada a PostGIS | **1.381 propuestas · 140 predios · 20 municipios · 560 veredas**; integridad referencial y espacial verificada |
| **OE3:** Visor web para visualización, análisis y seguimiento | Módulos: Mapa, Predios, Intervenciones, Metas del convenio, Análisis Espacial, Reportes | los 10 indicadores reconcilian (global = detalle); 20/20 PASS |

---

## 3. Indicadores del convenio (datos reales)

| Meta | Indicador | Avance | Meta | Cumplimiento |
|---|---|---|---|---|
| C1A1 | Cercos vivos | 11.10 km | 12 km | 92% |
| C1A1 | Aislamientos (alambre) | 8.89 km | 12 km | 74% |
| C1A2 | Franjas de conectividad | 5.20 km | 15 km | 35% |
| C1A2 | Sistemas silvopastoriles | 6.46 ha | 15 ha | 43% |
| C1A2 | Sistemas agroforestales | 4.44 ha | 15 ha | 30% |
| C2A1 | Cosecha de agua | 79 | 79 | 100% ✅ |
| C2A1 | Kit de compostaje | 79 | 79 | 100% ✅ |
| C2A2 | Estaciones limnimétricas | 7 | 7 | 100% ✅ |
| C2A2 | Obras de captación | 96 | 48 | 200% ✅ |
| C3 | Predios en áreas protegidas | 39 | 35 | 111% ✅ |

**5 de 10 metas cumplidas.** Fuente única y auditable: vistas `sgs_v_indicador_*`
(la misma cifra en el tablero, el drill-down por municipio y el detalle).

---

## 4. Acceso y uso

- **Ingreso:** login con usuario y roles (**ADMIN · ANALISTA · GESTOR**).
- **Flujo de trabajo:** Inicio (KPIs) → Mapa (capas + medir/identificar/buffer/selección)
  → Predios → Intervenciones (workflow + avance) → Metas del convenio → Reportes (CSV/PDF).

---

## 5. Calidad y garantía

- **Reconciliación de indicadores:** 10/10 (global = detalle = municipio).
- **Integridad:** sin FKs huérfanas; geometrías en SRID 4686.
- **Pruebas:** unitarias + integración (contra la BD real) + E2E.
- **Gate de release:** `npm run release:gate` → `GOAL_COMPLETED = TRUE`.

> Documentos de soporte: `docs/MODELO-DATOS.md` (variables), `docs/ENTREGABLE-OBJETIVOS.md`
> (trazabilidad), `docs/ALCANCE.md` (alcance), `RUNBOOK.md` (operación) y `DEPLOY.md` (despliegue).
