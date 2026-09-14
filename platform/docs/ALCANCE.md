# ALCANCE DE LA APLICACIÓN — Convenio 3038-2024 CAR–WWF–Natura

> Define qué módulos/funcionalidades **cumplen los objetivos** y cuáles quedan
> **fuera de alcance**. Regla: fuera de alcance = se oculta del nav y se quitan
> los placeholders; las rutas quedan accesibles por URL (reversible), pero NO
> forman parte del entregable.

## 1. Objetivos (resumen)

- **OG**: SIG para integrar, sistematizar y gestionar la información ambiental,
  como herramienta de seguimiento, monitoreo y **toma de decisiones**.
- **OE1**: identificar variables ambientales/territoriales/prediales de las
  acciones de conservación, restauración, reconversión productiva y manejo del
  recurso hídrico en los **predios concertados**.
- **OE2**: consolidar la información en una **base de datos geográfica** (PostGIS).
- **OE3**: **visor geográfico web** para visualización y **análisis** de la
  información territorial, que permita **seguimiento y evaluación de las
  intervenciones** en los predios concertados.

**Nota geográfica:** la **localidad de Usme** (Bogotá) queda cubierta por el
límite municipal de **BOGOTÁ** (`bcs_lpa_municipio` id 4). No se agrega como
entidad separada.

## 2. EN ALCANCE (módulos que cumplen objetivos)

| Ruta | Módulo | Objetivo | Por qué |
|------|--------|----------|---------|
| `/` | Inicio (KPIs + mapa) | OG/OE3 | punto de entrada; estado del convenio |
| `/mapa` | Visor geográfico | OE3 | visualización + análisis (medir, identificar, buffer, bbox, capas) |
| `/predios` (+`/[id]`) | Predios concertados | OE1/OE2/OE3 | entidad central del convenio |
| `/intervenciones` (+`/[id]`) | Intervenciones | OE3 | seguimiento a las acciones + workflow + avance |
| `/metas/convenio` (+drill-down) | Metas del convenio | OE3 | seguimiento/evaluación de las 5 metas (10 indicadores) |
| `/reportes` | Reportes R1–R10 | OG | insumo para la toma de decisiones + export CSV/PDF |

> **Análisis espacial**: las herramientas de análisis (medir, identificar,
> buffer, selección por rectángulo, identificar capa) viven DENTRO de
> `/mapa` (toolbar + panel de datos por capa). El análisis cumple OE3 sin
> ser una ruta separada.

## 3. FUERA DE ALCANCE (ocultar del nav; rutas quedan por URL)

| Ruta | Por qué queda fuera |
|------|---------------------|
| `/quebradas` | La información de quebradas ya está en el visor (capa) y en las metas; el CRUD no es un objetivo |
| `/analisis` | El análisis espacial vive dentro de `/mapa` (herramientas del toolbar); la ruta se mantiene como redirect por compatibilidad de links externos |
| `/monitoreo` | Estaciones/obras ya se cuentan en la meta C2A2 y se ven en el mapa |
| `/catalogos` (+subpáginas) | Configuración administrativa de catálogos; no es un objetivo |
| `/alertas` | No contemplado en los objetivos |
| `/admin/calidad` | QA interno; no es entregable |
| `/admin/importaciones` | Operación de carga; no es entregable |
| `/dashboard` | Redundante (redirige a `/`) |
| `/configuracion` | Placeholder |

## 4. Placeholders y elementos UI fuera de alcance
- ~~Botón **"3D · pronto"** y su dialogo (`view-3d-dialog.tsx`)~~ — ya eliminado.
- ~~Botón **Marcadores** y su dialogo (`bookmarks-dialog.tsx`)~~ — ya eliminado.
- ~~Logos en el header (`partners` strip)~~ — ya eliminado.

El panel de **datos por capa** del mapa (`MapLayerDataPanel`) sí queda: muestra
los atributos de las features de la capa activa (municipios, predios,
intervenciones, etc.). Es lectura, no CRUD.

> Histórico: los placeholders de UI eran elementos de "próxima fase" que no
> corresponden al entregable. El header quedó minimalista (solo topbar +
> avatar del usuario).

## 5. Fuera de alcance técnico (no se toca)
Auth/roles, workflow de estados, auditoría, migraciones, fuente única de
indicadores. Son soporte del alcance, no módulos a recortar.

## 6. Criterio de conformidad
La app **cumple** si un usuario puede, de punta a punta: loguearse → ver el mapa
con las capas y herramientas → consultar predios concertados → ver/registrar
intervenciones y su avance → ver el cumplimiento de las metas → generar
reportes. Todo lo demás es opcional y no debe figurar en el nav.
