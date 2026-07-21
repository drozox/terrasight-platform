// =============================================================================
// Reportes (HU-CO-04)
//
// Implementamos los reportes que están escritos en
// `DOCS/7. Consultas y Vistas/Consultas_Reportes.sql`. Cada uno devuelve
// filas planas con tipos primitivos — el componente cliente (page o API
// CSV) se encarga del formato.
//
// Reglas del split:
//   - Solo importa de `./_helpers`, `./types`, `../db`. Nunca de otro
//     `repos/*.ts`.
//   - `REPORTE_LABELS` y `REPORTE_DESCRIPCIONES` viven en `lib/constants.ts`.
// =============================================================================

import { sql, pgInt, pgNum, pgText } from "../db";
import type {
  ReporteR1Fila,
  ReporteR2Fila,
  ReporteR3Fila,
  ReporteR4Fila,
  ReporteR5Fila,
  ReporteR6Fila,
  ReporteR7Fila,
  ReporteR8Fila,
  ReporteR9Fila,
  ReporteR10Fila,
} from "../types";

// -----------------------------------------------------------------------------
// R1 — Listado completo de predios
// -----------------------------------------------------------------------------
export async function getReporteR1(): Promise<ReporteR1Fila[]> {
  const rows = await sql<{
    id_predio: number | string;
    nombre_predio: string;
    area_ha: number | string;
    propietario: string;
    telefono_propietario: string;
    nombre_vereda: string;
    nombre_municipio: string;
    departamento: string;
    cedula_catastral: string;
    observaciones: string;
  }[]>`
    SELECT p.id_predio, p.nombre_predio, p.area_ha,
           pr.nombre_razon_social AS propietario,
           pr.telefono             AS telefono_propietario,
           v.nombre_vereda, m.nombre_municipio,
           m.departamento,
           p.cedula_catastral, p.observaciones
    FROM   sgs_pre_predio p
    JOIN   sgs_pre_propietario pr ON p.id_propietario = pr.id_propietario
    JOIN   bcs_lpa_vereda       v ON p.id_vereda      = v.id_vereda
    JOIN   bcs_lpa_municipio    m ON v.id_municipio   = m.id_municipio
    ORDER  BY m.nombre_municipio, v.nombre_vereda, p.nombre_predio;
  `;
  return rows.map((r) => ({
    idPredio: pgInt(r.id_predio),
    nombrePredio: pgText(r.nombre_predio),
    areaHa: pgNum(r.area_ha),
    propietario: pgText(r.propietario),
    telefonoPropietario: pgText(r.telefono_propietario),
    nombreVereda: pgText(r.nombre_vereda),
    nombreMunicipio: pgText(r.nombre_municipio),
    departamento: pgText(r.departamento),
    cedulaCatastral: pgText(r.cedula_catastral),
    observaciones: pgText(r.observaciones),
  }));
}

// -----------------------------------------------------------------------------
// R2 — Predios con coberturas y biomas
// -----------------------------------------------------------------------------
export async function getReporteR2(): Promise<ReporteR2Fila[]> {
  const rows = await sql<{
    id_predio: number | string;
    nombre_predio: string;
    area_ha: number | string;
    coberturas: string | null;
    biomas: string | null;
    total_coberturas: number | string | null;
    total_biomas: number | string | null;
  }[]>`
    SELECT p.id_predio, p.nombre_predio, p.area_ha,
           STRING_AGG(DISTINCT c.nombre_cobertura, ', ' ORDER BY c.nombre_cobertura) AS coberturas,
           STRING_AGG(DISTINCT b.bioma_iavh, ', ' ORDER BY b.bioma_iavh)         AS biomas,
           COUNT(DISTINCT c.id_cobertura)::int                                  AS total_coberturas,
           COUNT(DISTINCT b.id_bioma)::int                                      AS total_biomas
    FROM   sgs_pre_predio p
    LEFT JOIN sgs_rel_predio_cobertura pc ON p.id_predio = pc.id_predio
    LEFT JOIN sgs_amb_cobertura_clc   c  ON pc.id_cobertura = c.id_cobertura
    LEFT JOIN sgs_rel_predio_bioma    pb ON p.id_predio    = pb.id_predio
    LEFT JOIN sgs_amb_bioma           b  ON pb.id_bioma    = b.id_bioma
    GROUP  BY p.id_predio, p.nombre_predio, p.area_ha
    ORDER  BY p.nombre_predio;
  `;
  return rows.map((r) => ({
    idPredio: pgInt(r.id_predio),
    nombrePredio: pgText(r.nombre_predio),
    areaHa: pgNum(r.area_ha),
    coberturas: r.coberturas ?? "",
    biomas: r.biomas ?? "",
    totalCoberturas: pgInt(r.total_coberturas ?? 0),
    totalBiomas: pgInt(r.total_biomas ?? 0),
  }));
}

// -----------------------------------------------------------------------------
// R3 — Propuestas por componente y acción
// -----------------------------------------------------------------------------
export async function getReporteR3(): Promise<ReporteR3Fila[]> {
  const rows = await sql<{
    componente: string;
    accion: string;
    total_propuestas: number | string;
    propuestas_linea: number | string;
    propuestas_poligono: number | string;
    propuestas_punto: number | string;
    tipos_presentes: string;
  }[]>`
    SELECT comp.nombre AS componente,
           acc.nombre AS accion,
           COUNT(prop.id_propuesta)::int AS total_propuestas,
           COUNT(*) FILTER (WHERE prop.tipo = 'linea')::int    AS propuestas_linea,
           COUNT(*) FILTER (WHERE prop.tipo = 'poligono')::int AS propuestas_poligono,
           COUNT(*) FILTER (WHERE prop.tipo = 'punto')::int    AS propuestas_punto,
           STRING_AGG(DISTINCT prop.tipo, ', ')               AS tipos_presentes
    FROM   sgs_pro_propuesta prop
    JOIN   sgs_com_accion     acc ON prop.id_accion     = acc.id_accion
    JOIN   sgs_com_componente comp ON acc.id_componente = comp.id_componente
    GROUP  BY comp.nombre, acc.nombre
    ORDER  BY comp.nombre, acc.nombre;
  `;
  return rows.map((r) => ({
    componente: pgText(r.componente),
    accion: pgText(r.accion),
    totalPropuestas: pgInt(r.total_propuestas),
    propuestasLinea: pgInt(r.propuestas_linea),
    propuestasPoligono: pgInt(r.propuestas_poligono),
    propuestasPunto: pgInt(r.propuestas_punto),
    tiposPresentes: pgText(r.tipos_presentes),
  }));
}

// -----------------------------------------------------------------------------
// R4 — Propuestas por predio
// -----------------------------------------------------------------------------
export async function getReporteR4(): Promise<ReporteR4Fila[]> {
  const rows = await sql<{
    id_predio: number | string;
    nombre_predio: string;
    id_propuesta: number | string;
    tipo: string;
    actividad: string;
    componente: string;
    accion: string;
    nombre_quebrada: string | null;
    detalle_especifico: string | null;
    avance_pct: number | string | null;
  }[]>`
    SELECT p.id_predio, p.nombre_predio,
           prop.id_propuesta, prop.tipo, prop.actividad,
           comp.nombre AS componente,
           acc.nombre  AS accion,
           q.nombre_quebrada,
           CASE
             WHEN prop.tipo = 'linea'    THEN (SELECT (longitud_m)::TEXT FROM sgs_pro_propuesta_linea   WHERE id_propuesta = prop.id_propuesta) || ' m'
             WHEN prop.tipo = 'poligono' THEN (SELECT (area_ha)::TEXT     FROM sgs_pro_propuesta_poligono WHERE id_propuesta = prop.id_propuesta) || ' ha'
             WHEN prop.tipo = 'punto'    THEN (SELECT tipo_punto             FROM sgs_pro_propuesta_punto    WHERE id_propuesta = prop.id_propuesta)
             ELSE 'N/A'
           END AS detalle_especifico,
           av.avance_pct
    FROM   sgs_pre_predio p
    JOIN   sgs_pro_propuesta prop ON p.id_predio = prop.id_predio
    JOIN   sgs_com_accion     acc  ON prop.id_accion     = acc.id_accion
    JOIN   sgs_com_componente comp ON acc.id_componente = comp.id_componente
    LEFT JOIN bcs_dh_quebrada q   ON prop.id_quebrada   = q.id_quebrada
    LEFT JOIN LATERAL (
      SELECT av2.avance_pct
      FROM   sgs_pro_propuesta_avance av2
      WHERE  av2.id_propuesta = prop.id_propuesta
        AND  av2.es_backfill = FALSE
      ORDER  BY av2.created_at DESC, av2.id_avance DESC
      LIMIT  1
    ) av ON true
    ORDER  BY p.nombre_predio, prop.id_propuesta;
  `;
  return rows.map((r) => ({
    idPredio: pgInt(r.id_predio),
    nombrePredio: pgText(r.nombre_predio),
    idPropuesta: pgInt(r.id_propuesta),
    tipo: pgText(r.tipo),
    actividad: pgText(r.actividad),
    componente: pgText(r.componente),
    accion: pgText(r.accion),
    nombreQuebrada: r.nombre_quebrada ?? "",
    detalleEspecifico: r.detalle_especifico ?? "N/A",
    avancePct: r.avance_pct == null ? null : pgInt(r.avance_pct),
  }));
}

// -----------------------------------------------------------------------------
// R5 — Propuestas punto con beneficiarios
// -----------------------------------------------------------------------------
export async function getReporteR5(): Promise<ReporteR5Fila[]> {
  const rows = await sql<{
    id_prop_punto: number | string;
    actividad: string;
    tipo_punto: string;
    este: number | string | null;
    norte: number | string | null;
    nombre_quebrada: string | null;
    usuarios_beneficiarios: string | null;
    total_usuarios: number | string | null;
    avance_pct: number | string | null;
  }[]>`
    SELECT pp.id_prop_punto, pp.actividad, pp.tipo_punto,
           pp.este, pp.norte,
           q.nombre_quebrada,
           STRING_AGG(u.nombre, ', ' ORDER BY u.nombre) AS usuarios_beneficiarios,
           COUNT(u.id_usuario)::int                     AS total_usuarios,
           av.avance_pct
    FROM   sgs_pro_propuesta_punto pp
    JOIN   sgs_pro_propuesta           prop ON pp.id_propuesta = prop.id_propuesta
    LEFT JOIN bcs_dh_quebrada          q    ON pp.id_quebrada   = q.id_quebrada
    LEFT JOIN sgs_rel_propuesta_punto_usuario rpu ON pp.id_prop_punto = rpu.id_prop_punto
    LEFT JOIN sgs_pre_usuario          u    ON rpu.id_usuario   = u.id_usuario
    LEFT JOIN LATERAL (
      SELECT av2.avance_pct
      FROM   sgs_pro_propuesta_avance av2
      WHERE  av2.id_propuesta = prop.id_propuesta
        AND  av2.es_backfill = FALSE
      ORDER  BY av2.created_at DESC, av2.id_avance DESC
      LIMIT  1
    ) av ON true
    GROUP  BY pp.id_prop_punto, pp.actividad, pp.tipo_punto, pp.este, pp.norte, q.nombre_quebrada, av.avance_pct
    ORDER  BY pp.tipo_punto, pp.actividad;
  `;
  return rows.map((r) => ({
    idPropPunto: pgInt(r.id_prop_punto),
    actividad: pgText(r.actividad),
    tipoPunto: pgText(r.tipo_punto),
    este:    r.este    == null ? null : pgNum(r.este),
    norte:   r.norte   == null ? null : pgNum(r.norte),
    nombreQuebrada: r.nombre_quebrada ?? "",
    usuariosBeneficiarios: r.usuarios_beneficiarios ?? "",
    totalUsuarios: pgInt(r.total_usuarios ?? 0),
    avancePct: r.avance_pct == null ? null : pgInt(r.avance_pct),
  }));
}

// -----------------------------------------------------------------------------
// R6 — Zonificaciones por predio
// -----------------------------------------------------------------------------
export async function getReporteR6(): Promise<ReporteR6Fila[]> {
  const rows = await sql<{
    id_predio: number | string;
    nombre_predio: string;
    zonificacion_pomca: string | null;
    zonificacion_rfp:   string | null;
    paramos:            string | null;
  }[]>`
    SELECT p.id_predio, p.nombre_predio,
           STRING_AGG(DISTINCT zp.categoria_zonificacion, ', ' ORDER BY zp.categoria_zonificacion) AS zonificacion_pomca,
           STRING_AGG(DISTINCT zr.categoria_zonificacion, ', ' ORDER BY zr.categoria_zonificacion) AS zonificacion_rfp,
           STRING_AGG(DISTINCT pa.nombre_paramo,          ', ' ORDER BY pa.nombre_paramo)          AS paramos
    FROM   sgs_pre_predio p
    LEFT JOIN sgs_rel_predio_zonificacion_pomca rpzp ON p.id_predio         = rpzp.id_predio
    LEFT JOIN sgs_amb_zonificacion_pomca        zp   ON rpzp.id_zonificacion_pomca = zp.id_zonificacion_pomca
    LEFT JOIN sgs_rel_predio_zonificacion_rfp   rpzr ON p.id_predio         = rpzr.id_predio
    LEFT JOIN sgs_amb_zonificacion_rfp          zr   ON rpzr.id_zonificacion_rfp    = zr.id_zonificacion_rfp
    LEFT JOIN sgs_rel_predio_paramos            rpp  ON p.id_predio         = rpp.id_predio
    LEFT JOIN sgs_amb_paramos                   pa   ON rpp.id_paramos      = pa.id_paramos
    GROUP  BY p.id_predio, p.nombre_predio
    ORDER  BY p.nombre_predio;
  `;
  return rows.map((r) => ({
    idPredio: pgInt(r.id_predio),
    nombrePredio: pgText(r.nombre_predio),
    zonificacionPomca: r.zonificacion_pomca ?? "",
    zonificacionRfp:   r.zonificacion_rfp   ?? "",
    paramos:           r.paramos            ?? "",
  }));
}

// -----------------------------------------------------------------------------
// R7 — Infraestructura por municipio
// -----------------------------------------------------------------------------
export async function getReporteR7(): Promise<ReporteR7Fila[]> {
  // Optimización: pre-agregar vías/drenajes por municipio en subqueries antes
  // del JOIN con municipios. Sin esto, los 3 LEFT JOIN × 2303/2993/33 filas
  // de infra producen un CROSS JOIN implícito de ~228M filas que cuelga la
  // query (>120s). Con subqueries el plan va a Merge Left Join sobre 10 filas
  // y termina en <20ms. Misma semántica (los conteos DISTINCT sobre el
  // conjunto total coinciden con COUNT(*) sobre el grupo por municipio).
  const rows = await sql<{
    nombre_municipio: string;
    departamento:     string;
    total_vias:               number | string | null;
    total_drenajes_simples:   number | string | null;
    total_drenajes_dobles:    number | string | null;
    tipos_via:                string | null;
    estados_drenaje_simple:   string | null;
    tipos_drenaje_doble:      string | null;
  }[]>`
    SELECT m.nombre_municipio, m.departamento,
           COALESCE(v.total_vias,            0) AS total_vias,
           COALESCE(ds.total_drenajes_simples, 0) AS total_drenajes_simples,
           COALESCE(dd.total_drenajes_dobles,  0) AS total_drenajes_dobles,
           v.tipos_via,
           ds.estados_drenaje_simple,
           dd.tipos_drenaje_doble
    FROM   bcs_lpa_municipio m
    LEFT JOIN (
      SELECT id_municipio,
             COUNT(*)::int                            AS total_vias,
             STRING_AGG(DISTINCT tipo_via, ', ')      AS tipos_via
      FROM   sgs_inf_via
      GROUP  BY id_municipio
    ) v  ON m.id_municipio = v.id_municipio
    LEFT JOIN (
      SELECT id_municipio,
             COUNT(*)::int                                 AS total_drenajes_simples,
             STRING_AGG(DISTINCT estado_drenaje, ', ')     AS estados_drenaje_simple
      FROM   sgs_inf_drenaje_simple
      GROUP  BY id_municipio
    ) ds ON m.id_municipio = ds.id_municipio
    LEFT JOIN (
      SELECT id_municipio,
             COUNT(*)::int                            AS total_drenajes_dobles,
             STRING_AGG(DISTINCT tipo, ', ')          AS tipos_drenaje_doble
      FROM   sgs_inf_drenaje_doble
      GROUP  BY id_municipio
    ) dd ON m.id_municipio = dd.id_municipio
    ORDER  BY m.nombre_municipio;
  `;
  return rows.map((r) => ({
    nombreMunicipio:        pgText(r.nombre_municipio),
    departamento:           pgText(r.departamento),
    totalVias:              pgInt(r.total_vias            ?? 0),
    totalDrenajesSimples:   pgInt(r.total_drenajes_simples ?? 0),
    totalDrenajesDobles:    pgInt(r.total_drenajes_dobles  ?? 0),
    tiposVia:               r.tipos_via              ?? "",
    estadosDrenajeSimple:   r.estados_drenaje_simple ?? "",
    tiposDrenajeDoble:      r.tipos_drenaje_doble    ?? "",
  }));
}

// -----------------------------------------------------------------------------
// R8 — Resumen de predios por componente
// -----------------------------------------------------------------------------
export async function getReporteR8(): Promise<ReporteR8Fila[]> {
  const rows = await sql<{
    componente: string;
    predios_con_propuestas: number | string;
    total_propuestas: number | string;
    linea: number | string;
    poligono: number | string;
    punto: number | string;
  }[]>`
    SELECT comp.nombre AS componente,
           COUNT(DISTINCT prop.id_predio)::int AS predios_con_propuestas,
           COUNT(prop.id_propuesta)::int      AS total_propuestas,
           COUNT(*) FILTER (WHERE prop.tipo = 'linea')::int    AS linea,
           COUNT(*) FILTER (WHERE prop.tipo = 'poligono')::int AS poligono,
           COUNT(*) FILTER (WHERE prop.tipo = 'punto')::int    AS punto
    FROM   sgs_com_componente comp
    LEFT JOIN sgs_com_accion     acc  ON comp.id_componente = acc.id_componente
    LEFT JOIN sgs_pro_propuesta prop  ON acc.id_accion      = prop.id_accion
    GROUP  BY comp.id_componente, comp.nombre
    ORDER  BY comp.nombre;
  `;
  return rows.map((r) => ({
    componente: pgText(r.componente),
    prediosConPropuestas: pgInt(r.predios_con_propuestas),
    totalPropuestas: pgInt(r.total_propuestas),
    linea: pgInt(r.linea),
    poligono: pgInt(r.poligono),
    punto: pgInt(r.punto),
  }));
}

// -----------------------------------------------------------------------------
// R9 — Quebradas con más propuestas
// -----------------------------------------------------------------------------
export async function getReporteR9(): Promise<ReporteR9Fila[]> {
  const rows = await sql<{
    id_quebrada: number | string;
    nombre_quebrada: string;
    area: number | string | null;
    nombre_municipio: string;
    total_propuestas: number | string;
    propuestas_linea: number | string;
    propuestas_poligono: number | string;
    propuestas_punto: number | string;
  }[]>`
    SELECT q.id_quebrada, q.nombre_quebrada, q.area,
           m.nombre_municipio,
           COUNT(prop.id_propuesta)::int                       AS total_propuestas,
           COUNT(*) FILTER (WHERE prop.tipo = 'linea')::int    AS propuestas_linea,
           COUNT(*) FILTER (WHERE prop.tipo = 'poligono')::int AS propuestas_poligono,
           COUNT(*) FILTER (WHERE prop.tipo = 'punto')::int    AS propuestas_punto
    FROM   bcs_dh_quebrada q
    JOIN   bcs_lpa_municipio m ON q.id_municipio = m.id_municipio
    LEFT JOIN sgs_pro_propuesta prop ON q.id_quebrada = prop.id_quebrada
    GROUP  BY q.id_quebrada, q.nombre_quebrada, q.area, m.nombre_municipio
    HAVING  COUNT(prop.id_propuesta) > 0
    ORDER  BY total_propuestas DESC, q.nombre_quebrada;
  `;
  return rows.map((r) => ({
    idQuebrada: pgInt(r.id_quebrada),
    nombreQuebrada: pgText(r.nombre_quebrada),
    area: r.area == null ? null : pgNum(r.area),
    nombreMunicipio: pgText(r.nombre_municipio),
    totalPropuestas: pgInt(r.total_propuestas),
    propuestasLinea: pgInt(r.propuestas_linea),
    propuestasPoligono: pgInt(r.propuestas_poligono),
    propuestasPunto: pgInt(r.propuestas_punto),
  }));
}

// -----------------------------------------------------------------------------
// R10 — Área total de conservación por bioma
// -----------------------------------------------------------------------------
export async function getReporteR10(): Promise<ReporteR10Fila[]> {
  const rows = await sql<{
    bioma_iavh:           string;
    total_predios:        number | string | null;
    area_total_ha:        number | string | null;
    area_promedio_ha:     number | string | null;
    predios:              string | null;
  }[]>`
    SELECT b.bioma_iavh,
           COUNT(DISTINCT p.id_predio)::int                    AS total_predios,
           SUM(p.area_ha)::numeric                              AS area_total_ha,
           AVG(p.area_ha)::numeric                              AS area_promedio_ha,
           STRING_AGG(DISTINCT p.nombre_predio, ', ' ORDER BY p.nombre_predio) AS predios
    FROM   sgs_amb_bioma b
    JOIN   sgs_rel_predio_bioma pb ON b.id_bioma  = pb.id_bioma
    JOIN   sgs_pre_predio      p  ON pb.id_predio = p.id_predio
    GROUP  BY b.id_bioma, b.bioma_iavh
    ORDER  BY area_total_ha DESC NULLS LAST;
  `;
  return rows.map((r) => ({
    biomaIavh:         pgText(r.bioma_iavh),
    totalPredios:      pgInt(r.total_predios ?? 0),
    areaTotalHa:       r.area_total_ha == null ? 0 : pgNum(r.area_total_ha),
    areaPromedioHa:    r.area_promedio_ha == null ? 0 : pgNum(r.area_promedio_ha),
    predios:           r.predios ?? "",
  }));
}
