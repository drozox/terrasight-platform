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
| `/analisis` | Análisis espacial | OE3 | buffer/bbox/matriz/cobertura |
| `/reportes` | Reportes R1–R10 | OG | insumo para la toma de decisiones + export CSV/PDF |

## 3. FUERA DE ALCANCE (ocultar del nav; rutas quedan por URL)

| Ruta | Por qué queda fuera |
|------|---------------------|
| `/quebradas` | La información de quebradas ya está en el visor (capa) y en las metas; el CRUD no es un objetivo |
| `/monitoreo` | Estaciones/obras ya se cuentan en la meta C2A2 y se ven en el mapa |
| `/catalogos` (+subpáginas) | Configuración administrativa de catálogos; no es un objetivo |
| `/alertas` | No contemplado en los objetivos |
| `/admin/calidad` | QA interno; no es entregable |
| `/admin/importaciones` | Operación de carga; no es entregable |
| `/dashboard` | Redundante (redirige a `/`) |
| `/configuracion` | Placeholder |

## 4. Placeholders a ELIMINAR del visor
- Botón **"3D · pronto"** y su dialogo (`view-3d-dialog.tsx`).
- Botón **Marcadores** y su dialogo (`bookmarks-dialog.tsx`).
Ambos son UI de "próxima fase" que no corresponde al entregable.

## 5. Fuera de alcance técnico (no se toca)
Auth/roles, workflow de estados, auditoría, migraciones, fuente única de
indicadores. Son soporte del alcance, no módulos a recortar.

## 6. Criterio de conformidad
La app **cumple** si un usuario puede, de punta a punta: loguearse → ver el mapa
con las capas y herramientas → consultar predios concertados → ver/registrar
intervenciones y su avance → ver el cumplimiento de las metas → generar
reportes. Todo lo demás es opcional y no debe figurar en el nav.
