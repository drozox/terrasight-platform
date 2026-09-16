// =============================================================================
// Reportes (HU-CO-04)
//
// Implementa los reportes vivos: R1, R2, R4, R6, R7, R10.
//   - R3 (propuestas por componente/acción), R5 (beneficiarios), R8 (resumen) y
//     R9 (quebradas) se ELIMINARON a pedido del cliente (sin valor / sin datos).
//   - R1, R2, R4, R6 aceptan filtro por componente y acción (vía las propuestas
//     del predio; sgs_pre_predio no guarda componente/acción).
//
// Reglas del split:
//   - Solo importa de `./_helpers`, `./types`, `../db` y `../acciones`.
// =============================================================================

import { sql, pgInt, pgNum, pgText } from "../db";
import { accionDef, type AccionCode } from "../acciones";
import type {
  ReporteR1Fila,
  ReporteR2Fila,
  ReporteR4Fila,
  ReporteR4Intervencion,
  ReporteR6Fila,
  ReporteR7Fila,
  ReporteR10Fila,
} from "../types";

export type ReporteFiltros = {
  componente?: string | null;
  accion?: AccionCode | null;
};

/**
 * Fragmento SQL `AND EXISTS (...)` que filtra predios (alias `p`) por
 * componente/acción a través de sus propuestas. Devuelve `sql`` `` si no hay
 * filtro. Requiere que la query externa use `sgs_pre_predio p`.
 */
function filtroPredio(f: ReporteFiltros = {}) {
  const conds = [];
  if (f.componente) conds.push(sql`c.nombre = ${f.componente}`);
  if (f.accion) {
    const def = accionDef(f.accion);
    conds.push(sql`c.nombre = ${def.componente}`);
    conds.push(sql`a.nombre IN ${sql(def.nombres)}`);
  }
  if (conds.length === 0) return sql``;
  const where = conds.reduce((acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`), sql``);
  return sql`AND EXISTS (
    SELECT 1
    FROM   sgs_pro_propuesta pp
    JOIN   sgs_com_accion     a ON a.id_accion     = pp.id_accion
    JOIN   sgs_com_componente c ON c.id_componente = a.id_componente
    WHERE  pp.id_predio = p.id_predio AND ${where}
  )`;
}

// -----------------------------------------------------------------------------
// R1 — Listado completo de predios
// -----------------------------------------------------------------------------
export async function getReporteR1(f: ReporteFiltros = {}): Promise<ReporteR1Fila[]> {
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
    LEFT JOIN sgs_pre_propietario pr ON p.id_propietario = pr.id_propietario
    LEFT JOIN bcs_lpa_vereda       v ON p.id_vereda      = v.id_vereda
    LEFT JOIN bcs_lpa_municipio    m ON v.id_municipio   = m.id_municipio
    WHERE  TRUE ${filtroPredio(f)}
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
export async function getReporteR2(f: ReporteFiltros = {}): Promise<ReporteR2Fila[]> {
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
    WHERE  TRUE ${filtroPredio(f)}
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
// R4 — Predios (lista completa). El detalle de intervenciones se carga aparte.
// -----------------------------------------------------------------------------
export async function getReporteR4(f: ReporteFiltros = {}): Promise<ReporteR4Fila[]> {
  const rows = await sql<{
    id_predio: number | string;
    codigo: string;
    nombre_predio: string;
    propietario: string | null;
  }[]>`
    SELECT p.id_predio,
           ('PR-' || LPAD(p.id_predio::text, GREATEST(5, length(p.id_predio::text)), '0')) AS codigo,
           p.nombre_predio,
           pr.nombre_razon_social AS propietario
    FROM   sgs_pre_predio p
    LEFT JOIN sgs_pre_propietario pr ON p.id_propietario = pr.id_propietario
    WHERE  TRUE ${filtroPredio(f)}
    ORDER  BY p.nombre_predio;
  `;
  return rows.map((r) => ({
    idPredio: pgInt(r.id_predio),
    codigo: pgText(r.codigo),
    nombrePredio: pgText(r.nombre_predio),
    propietario: pgText(r.propietario ?? ""),
  }));
}

// -----------------------------------------------------------------------------
// R4 — Intervenciones de un predio (subpestaña "Ver intervenciones").
// -----------------------------------------------------------------------------
export async function getIntervencionesDePredio(
  idPredio: number,
): Promise<ReporteR4Intervencion[]> {
  const rows = await sql<{
    id_propuesta: number | string;
    tipo: string;
    actividad: string;
    estado: string;
    componente: string | null;
    accion: string | null;
    medida: string | null;
  }[]>`
    SELECT prop.id_propuesta, prop.tipo, prop.actividad, prop.estado,
           c.nombre AS componente,
           a.nombre AS accion,
           CASE
             WHEN prop.tipo = 'linea'
               THEN (SELECT ROUND(pl.longitud_m::numeric, 0)::text || ' m'
                     FROM sgs_pro_propuesta_linea pl WHERE pl.id_propuesta = prop.id_propuesta)
             WHEN prop.tipo = 'poligono'
               THEN (SELECT ROUND(pq.area_ha::numeric, 2)::text || ' ha'
                     FROM sgs_pro_propuesta_poligono pq WHERE pq.id_propuesta = prop.id_propuesta)
             WHEN prop.tipo = 'punto' THEN 'punto'
             ELSE '—'
           END AS medida
    FROM   sgs_pro_propuesta prop
    LEFT JOIN sgs_com_accion     a ON prop.id_accion     = a.id_accion
    LEFT JOIN sgs_com_componente c ON a.id_componente    = c.id_componente
    WHERE  prop.id_predio = ${idPredio}
    ORDER  BY prop.id_propuesta;
  `;
  return rows.map((r) => ({
    idPropuesta: pgInt(r.id_propuesta),
    tipo: pgText(r.tipo),
    actividad: pgText(r.actividad),
    estado: pgText(r.estado),
    medida: pgText(r.medida ?? "—"),
    componente: pgText(r.componente ?? ""),
    accion: pgText(r.accion ?? ""),
  }));
}

// -----------------------------------------------------------------------------
// R6 — Zonificaciones por predio (+ vereda y núcleo predial)
//   POMCA: se muestra el NOMBRE (descripcion), no el código ("01"/"02").
// -----------------------------------------------------------------------------
export async function getReporteR6(f: ReporteFiltros = {}): Promise<ReporteR6Fila[]> {
  const rows = await sql<{
    id_predio: number | string;
    nombre_predio: string;
    nombre_vereda: string | null;
    nucleo_predial: string | null;
    zonificacion_pomca: string | null;
    zonificacion_rfp:   string | null;
    paramos:            string | null;
  }[]>`
    SELECT p.id_predio, p.nombre_predio,
           p.nucleo_predial,
           v.nombre_vereda,
           STRING_AGG(DISTINCT NULLIF(BTRIM(COALESCE(zp.descripcion, zp.nomenclatura)), ''), ', ' ORDER BY NULLIF(BTRIM(COALESCE(zp.descripcion, zp.nomenclatura)), '')) AS zonificacion_pomca,
           STRING_AGG(DISTINCT zr.categoria_zonificacion, ', ' ORDER BY zr.categoria_zonificacion) AS zonificacion_rfp,
           STRING_AGG(DISTINCT pa.nombre_paramo,          ', ' ORDER BY pa.nombre_paramo)          AS paramos
    FROM   sgs_pre_predio p
    LEFT JOIN bcs_lpa_vereda                      v    ON p.id_vereda = v.id_vereda
    LEFT JOIN sgs_rel_predio_zonificacion_pomca   rpzp ON p.id_predio = rpzp.id_predio
    LEFT JOIN sgs_amb_zonificacion_pomca          zp   ON rpzp.id_zonificacion_pomca = zp.id_zonificacion_pomca
    LEFT JOIN sgs_rel_predio_zonificacion_rfp     rpzr ON p.id_predio = rpzr.id_predio
    LEFT JOIN sgs_amb_zonificacion_rfp            zr   ON rpzr.id_zonificacion_rfp    = zr.id_zonificacion_rfp
    LEFT JOIN sgs_rel_predio_paramos              rpp  ON p.id_predio = rpp.id_predio
    LEFT JOIN sgs_amb_paramos                     pa   ON rpp.id_paramos      = pa.id_paramos
    WHERE  TRUE ${filtroPredio(f)}
    GROUP  BY p.id_predio, p.nombre_predio, p.nucleo_predial, v.nombre_vereda
    ORDER  BY p.nombre_predio;
  `;
  return rows.map((r) => ({
    idPredio: pgInt(r.id_predio),
    nombrePredio: pgText(r.nombre_predio),
    nombreVereda: pgText(r.nombre_vereda ?? ""),
    nucleoPredial: pgText(r.nucleo_predial ?? ""),
    zonificacionPomca: r.zonificacion_pomca ?? "",
    zonificacionRfp:   r.zonificacion_rfp   ?? "",
    paramos:           r.paramos            ?? "",
  }));
}

// -----------------------------------------------------------------------------
// R7 — Infraestructura vial por municipio
// -----------------------------------------------------------------------------
export async function getReporteR7(): Promise<ReporteR7Fila[]> {
  const rows = await sql<{
    nombre_municipio: string;
    departamento:     string;
    total_vias:       number | string | null;
    tipos_via:        string | null;
  }[]>`
    SELECT m.nombre_municipio, m.departamento,
           COALESCE(v.total_vias, 0) AS total_vias,
           v.tipos_via
    FROM   bcs_lpa_municipio m
    LEFT JOIN (
      SELECT id_municipio,
             COUNT(*)::int                       AS total_vias,
             STRING_AGG(DISTINCT tipo_via, ', ') AS tipos_via
      FROM   sgs_inf_via
      GROUP  BY id_municipio
    ) v ON m.id_municipio = v.id_municipio
    ORDER  BY m.nombre_municipio;
  `;
  return rows.map((r) => ({
    nombreMunicipio: pgText(r.nombre_municipio),
    departamento:    pgText(r.departamento),
    totalVias:       pgInt(r.total_vias ?? 0),
    tiposVia:        r.tipos_via ?? "",
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
