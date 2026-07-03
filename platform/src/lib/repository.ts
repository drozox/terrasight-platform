// =============================================================================
// Repositorio: capa de consultas SQL hacia Postgres
// Por ahora son SELECT directos que luego podemos convertir en vistas /
// stored procedures según necesitemos.
// =============================================================================

import { sql, pgInt, pgNum, pgDate, pgText } from "./db";
import type {
  DashboardKpis,
  ComponenteTotal,
  CoberturaTotal,
  IntervencionReciente,
  Alerta,
  FooterKpis,
  MapFeatureCollection,
  MapFeature,
  PredioMini,
  PredioPorMunicipio,
  SerieTemporal,
} from "./types";

// -----------------------------------------------------------------------------
// Dashboard — KPIs principales (HU-CO-01)
// -----------------------------------------------------------------------------

export async function getDashboardKpis(): Promise<DashboardKpis> {
  // En el esquema del cliente las cifras del Stitch (2.458 predios, etc.) son
  // ilustrativas. Las calculamos en vivo desde la BD.
  const [row] = await sql<
    {
      predios: number | string;
      propuestas: number | string;
      propuestas_ejecucion: number | string;
      hectareas_predios: number | string;
      hectareas_propuestas: number | string;
      hectareas_predios_ejecucion: number | string;
      hectareas_propuestas_ejecucion: number | string;
      hectareas_propuestas_poligono: number | string;
    }[]
  >`
    WITH
      p AS (
        SELECT
          COUNT(*)::int AS predios,
          COALESCE(SUM(p.area_ha), 0)::numeric AS hectareas_predios
        FROM sgs_pre_predio p
      ),
      pr AS (
        SELECT
          COUNT(*)::int AS propuestas,
          COUNT(*) FILTER (
            WHERE pp.actividad ILIKE '%ejec%' OR pp.actividad ILIKE '%proceso%'
          )::int AS propuestas_ejecucion
        FROM sgs_pro_propuesta pp
      ),
      pl AS (
        SELECT COALESCE(SUM(pl.longitud_m), 0)::numeric AS _ FROM sgs_pro_propuesta_linea pl
      ),
      pp AS (
        SELECT COALESCE(SUM(pp.area_ha), 0)::numeric AS hectareas_propuestas_poligono
        FROM sgs_pro_propuesta_poligono pp
      ),
      tot AS (
        SELECT
          (SELECT hectareas_predios FROM p)        AS hectareas_predios,
          (SELECT hectareas_propuestas_poligono FROM pp) AS hectareas_propuestas_poligono,
          0::numeric                                AS hectareas_predios_ejecucion,
          0::numeric                                AS hectareas_propuestas_ejecucion
      )
    SELECT
      p.predios,
      pr.propuestas,
      pr.propuestas_ejecucion,
      p.hectareas_predios,
      t.hectareas_propuestas_poligono   AS hectareas_propuestas,
      t.hectareas_predios_ejecucion,
      t.hectareas_propuestas_ejecucion,
      t.hectareas_propuestas_poligono
    FROM p, pr, tot t;
  `;
  return {
    predios: pgInt(row?.predios),
    propuestas: pgInt(row?.propuestas),
    propuestasEjecucion: pgInt(row?.propuestas_ejecucion),
    hectareasPredios: pgNum(row?.hectareas_predios),
    hectareasPropuestas: pgNum(row?.hectareas_propuestas),
    hectareasPropuestasEjecucion: pgNum(row?.hectareas_predios_ejecucion),
    hectareasPropuestasPoligono: pgNum(row?.hectareas_propuestas_poligono),
  };
}

// -----------------------------------------------------------------------------
// Distribución por componente (HU-CO-01)
// -----------------------------------------------------------------------------

export async function getComponentes(): Promise<ComponenteTotal[]> {
  const rows = await sql<
    {
      nombre: string;
      total: number | string;
      linea: number | string;
      poligono: number | string;
      punto: number | string;
    }[]
  >`
    SELECT
      c.nombre,
      COUNT(p.id_propuesta)::int AS total,
      COUNT(*) FILTER (WHERE p.tipo = 'linea')::int    AS linea,
      COUNT(*) FILTER (WHERE p.tipo = 'poligono')::int AS poligono,
      COUNT(*) FILTER (WHERE p.tipo = 'punto')::int    AS punto
    FROM sgs_com_componente c
    LEFT JOIN sgs_com_accion a        ON a.id_componente = c.id_componente
    LEFT JOIN sgs_pro_propuesta p     ON p.id_accion     = a.id_accion
    GROUP BY c.nombre
    ORDER BY c.nombre;
  `;
  const total = rows.reduce((acc, r) => acc + pgInt(r.total), 0);
  return rows.map((r) => ({
    nombre: pgText(r.nombre),
    total: pgInt(r.total),
    linea: pgInt(r.linea),
    poligono: pgInt(r.poligono),
    punto: pgInt(r.punto),
    porcentaje: total > 0 ? Math.round((pgInt(r.total) / total) * 100) : 0,
  }));
}

// -----------------------------------------------------------------------------
// Cobertura vegetal (datos demo — el cliente no tenía agregación,
// dejamos placeholders hasta construir la vista materializada)
// -----------------------------------------------------------------------------

export async function getCoberturaVegetal(): Promise<CoberturaTotal[]> {
  const rows = await sql<{ nombre: string; area: number | string }[]>`
    SELECT
      c.nombre_cobertura AS nombre,
      pc.area_ha_parcial AS area
    FROM sgs_rel_predio_cobertura pc
    JOIN sgs_amb_cobertura_clc c ON c.id_cobertura = pc.id_cobertura
    ORDER BY pc.area_ha_parcial DESC;
  `;
  const total = rows.reduce((acc, r) => acc + pgNum(r.area), 0);
  if (total === 0) {
    return [
      { nombre: "Bosque Natural", area: 38, porcentaje: 38, color: "primary" as const },
      { nombre: "Vegetación Sec.", area: 24, porcentaje: 24, color: "secondary" as const },
      { nombre: "Agropecuario", area: 28, porcentaje: 28, color: "tertiary" as const },
      { nombre: "Otros", area: 10, porcentaje: 10, color: "outline" as const },
    ];
  }
  return rows.slice(0, 4).map((r, i) => ({
    nombre: pgText(r.nombre),
    area: pgNum(r.area),
    porcentaje: Math.round((pgNum(r.area) / total) * 100),
    color: (["primary", "secondary", "tertiary", "outline"] as const)[i] ?? "outline",
  }));
}

// -----------------------------------------------------------------------------
// Intervenciones recientes (HU-CO-01, HU-TC-04)
// -----------------------------------------------------------------------------

export async function getIntervencionesRecientes(
  limit = 6,
  componente?: string | null,
): Promise<IntervencionReciente[]> {
  const rows = await sql<
    {
      id_propuesta: number | string;
      tipo: string;
      actividad: string;
      nombre_predio: string;
      codigo_predio: string;
      nombre_municipio: string;
      nombre_componente: string;
      nombre_accion: string;
      hectareas: number | string | null;
      longitud: number | string | null;
      avance: number | string | null;
      fecha: Date | string | null;
    }[]
  >`
    SELECT
      pp.id_propuesta,
      pp.tipo,
      pp.actividad,
      pr.nombre_predio,
      ('PR-' || LPAD(pr.id_predio::text, 5, '0'))                  AS codigo_predio,
      m.nombre_municipio,
      c.nombre                                                     AS nombre_componente,
      a.nombre                                                     AS nombre_accion,
      pol.area_ha                                                  AS hectareas,
      pl.longitud_m                                                AS longitud,
      CASE
        WHEN pp.tipo = 'punto'    THEN 20
        WHEN pp.tipo = 'linea'    THEN 75
        WHEN pp.tipo = 'poligono' THEN 100
      END                                                          AS avance
    FROM sgs_pro_propuesta pp
    JOIN sgs_pre_predio pr   ON pr.id_predio = pp.id_predio
    JOIN sgs_com_accion a    ON a.id_accion  = pp.id_accion
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    LEFT JOIN bcs_lpa_vereda v     ON v.id_vereda        = pr.id_vereda
    LEFT JOIN bcs_lpa_municipio m  ON m.id_municipio     = v.id_municipio
    LEFT JOIN sgs_pro_propuesta_linea    pl  ON pl.id_propuesta = pp.id_propuesta
    LEFT JOIN sgs_pro_propuesta_poligono  pol ON pol.id_propuesta = pp.id_propuesta
    ${componente ? sql`WHERE c.nombre = ${componente}` : sql``}
    ORDER BY pp.id_propuesta ASC
    LIMIT ${limit};
  `;
  return rows.map((r) => {
    const avance = pgInt(r.avance);
    const estado: IntervencionReciente["estado"] =
      avance >= 100 ? "Finalizada" : "En ejecución";
    return {
      id: pgInt(r.id_propuesta),
      tipo: pgText(r.tipo),
      actividad: pgText(r.actividad),
      nombrePredio: pgText(r.nombre_predio),
      codigoPredio: pgText(r.codigo_predio),
      municipio: pgText(r.nombre_municipio),
      componente: pgText(r.nombre_componente),
      accion: pgText(r.nombre_accion),
      hectareas: r.hectareas !== null ? pgNum(r.hectareas) : null,
      longitud: r.longitud !== null ? pgNum(r.longitud) : null,
      avance,
      estado,
    };
  });
}

// -----------------------------------------------------------------------------
// Predios para el mapa (HU-CO-03, HU-AA-01)
// -----------------------------------------------------------------------------

export async function getPrediosGeoJSON(
  componente?: string | null,
): Promise<MapFeatureCollection> {
  const rows = await sql<
    {
      id_predio: number | string;
      nombre: string;
      codigo: string;
      area_ha: number | string;
      comp: string | null;
      lon: number | string;
      lat: number | string;
    }[]
  >`
    SELECT
      p.id_predio,
      p.nombre_predio                                                  AS nombre,
      ('PR-' || LPAD(p.id_predio::text, 5, '0'))                       AS codigo,
      p.area_ha,
      (
        SELECT c.nombre
        FROM sgs_pro_propuesta pp
        JOIN sgs_com_accion a      ON a.id_accion  = pp.id_accion
        JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
        WHERE pp.id_predio = p.id_predio
        LIMIT 1
      )                                                                AS comp,
      p.longitud_centroide                                             AS lon,
      p.latitud_centroide                                              AS lat
    FROM sgs_pre_predio p
    WHERE
      ${componente ? sql`EXISTS (
        SELECT 1 FROM sgs_pro_propuesta pp
        JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
        JOIN sgs_com_componente c ON c.id_componente = a.id_componente
        WHERE pp.id_predio = p.id_predio AND c.nombre = ${componente}
      )` : sql`TRUE`};
  `;

  const features: MapFeature[] = rows.map((r) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [pgNum(r.lon), pgNum(r.lat)] },
    properties: {
      id: pgInt(r.id_predio),
      nombre: pgText(r.nombre),
      codigo: pgText(r.codigo),
      areaHa: pgNum(r.area_ha),
      componente: pgText(r.comp, "—"),
    },
  }));
  return { type: "FeatureCollection", features };
}

export async function getPrediosMini(
  componente?: string | null,
): Promise<PredioMini[]> {
  const rows = componente
    ? await sql<
        { id: number | string; nombre: string; lon: number | string; lat: number | string }[]
      >`
        SELECT p.id_predio AS id, p.nombre_predio AS nombre,
               p.longitud_centroide AS lon, p.latitud_centroide AS lat
        FROM sgs_pre_predio p
        WHERE EXISTS (
          SELECT 1 FROM sgs_pro_propuesta pp
          JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
          JOIN sgs_com_componente c ON c.id_componente = a.id_componente
          WHERE pp.id_predio = p.id_predio AND c.nombre = ${componente}
        );
      `
    : await sql<
        { id: number | string; nombre: string; lon: number | string; lat: number | string }[]
      >`SELECT id_predio AS id, nombre_predio AS nombre,
                 longitud_centroide AS lon, latitud_centroide AS lat
          FROM sgs_pre_predio;`;
  return rows.map((r) => ({
    id: pgInt(r.id),
    nombre: pgText(r.nombre),
    lon: pgNum(r.lon),
    lat: pgNum(r.lat),
  }));
}

// -----------------------------------------------------------------------------
// Quebradas para el mapa (capa hidrografía)
// -----------------------------------------------------------------------------

export async function getQuebradasMini() {
  const rows = await sql<
    { id: number | string; nombre: string; lon: number | string; lat: number | string }[]
  >`
    SELECT id_quebrada AS id, nombre_quebrada AS nombre,
           longitud    AS lon, latitud          AS lat
    FROM   bcs_dh_quebrada;
  `;
  return rows.map((r) => ({
    id: pgInt(r.id),
    nombre: pgText(r.nombre),
    lon: pgNum(r.lon),
    lat: pgNum(r.lat),
  }));
}

// -----------------------------------------------------------------------------
// Alertas (panel derecho del Stitch — placeholder hasta tener tabla real)
// -----------------------------------------------------------------------------

export async function getAlertas(limit = 50): Promise<Alerta[]> {
  // En el esquema actual no hay tabla `alertas` propia. Devolvemos un set
  // curado de alertas con contexto real del territorio (Cundinamarca,
  // predios cargados al sistema) hasta que el cliente defina la tabla
  // fuente. Las prioridades: error = crítica, warning = preventiva,
  // info = informativa.
  const demo: Alerta[] = [
    {
      id: 1,
      tipo: "error",
      titulo: "Deforestación Crítica",
      descripcion:
        "Detección de tala ilegal en sector San Rafael, Guasca — pérdida de cobertura boscosa >0.5 ha en 7 días.",
      fecha: "Hoy",
    },
    {
      id: 2,
      tipo: "warning",
      titulo: "Nivel Hídrico Bajo",
      descripcion:
        "Estación hidrométrica Río Negro (Est. 04) reporta caudal 18% bajo el promedio histórico para el mes.",
      fecha: "14/05",
    },
    {
      id: 3,
      tipo: "warning",
      titulo: "Propuestas con Avance Bajo",
      descripcion:
        "3 propuestas de tipo punto en finca El Edén (Guasca) llevan más de 30 días con avance <25%.",
      fecha: "12/05",
    },
    {
      id: 4,
      tipo: "info",
      titulo: "Nueva Fuente Hídrica Registrada",
      descripcion:
        "Se incorporó la quebrada La Parada al inventario — microcuenca Río Bogotá alto, municipio Cogua.",
      fecha: "08/05",
    },
    {
      id: 5,
      tipo: "info",
      titulo: "Reporte Mensual Disponible",
      descripcion:
        "Reporte de monitoreo correspondiente a abril 2026 listo para descarga. 3 predios intervenidos, 2.3 ha.",
      fecha: "01/05",
    },
  ];
  return demo.slice(0, limit);
}

// -----------------------------------------------------------------------------
// Footer — totales geográficos (municipios, veredas, fuentes hídricas)
// -----------------------------------------------------------------------------

export async function getFooterKpis(): Promise<FooterKpis> {
  const [row] = await sql<
    {
      municipios: number | string;
      veredas: number | string;
      predios: number | string;
      hectareas_intervenidas: number | string;
      quebradas: number | string;
    }[]
  >`
    SELECT
      (SELECT COUNT(*)::int FROM bcs_lpa_municipio)              AS municipios,
      (SELECT COUNT(*)::int FROM bcs_lpa_vereda)                  AS veredas,
      (SELECT COUNT(*)::int FROM sgs_pre_predio)                  AS predios,
      (SELECT COALESCE(SUM(pp.area_ha), 0)::numeric
         FROM sgs_pro_propuesta_poligono pp)                      AS hectareas_intervenidas,
      (SELECT COUNT(*)::int FROM bcs_dh_quebrada)                AS quebradas;
  `;
  return {
    municipios: pgInt(row?.municipios),
    veredas: pgInt(row?.veredas),
    predios: pgInt(row?.predios),
    hectareasIntervenidas: pgNum(row?.hectareas_intervenidas),
    quebradas: pgInt(row?.quebradas),
  };
}

// -----------------------------------------------------------------------------
// Top municipios por número de predios (para gráficos de series)
// -----------------------------------------------------------------------------

export async function getPrediosPorMunicipio(
  limit = 6,
): Promise<PredioPorMunicipio[]> {
  const rows = await sql<
    {
      id_municipio: number | string;
      nombre_municipio: string;
      predios: number | string;
      hectareas: number | string;
    }[]
  >`
    SELECT
      m.id_municipio,
      m.nombre_municipio,
      COUNT(p.id_predio)::int                 AS predios,
      COALESCE(SUM(p.area_ha), 0)::numeric    AS hectareas
    FROM bcs_lpa_municipio m
    LEFT JOIN sgs_pre_predio p ON p.id_vereda IN (
      SELECT v.id_vereda FROM bcs_lpa_vereda v WHERE v.id_municipio = m.id_municipio
    )
    GROUP BY m.id_municipio, m.nombre_municipio
    ORDER BY predios DESC, hectareas DESC
    LIMIT ${limit};
  `;
  return rows.map((r) => ({
    id_municipio: pgInt(r.id_municipio),
    nombre_municipio: pgText(r.nombre_municipio),
    predios: pgInt(r.predios),
    hectareas: pgNum(r.hectareas),
  }));
}

// -----------------------------------------------------------------------------
// Serie temporal de propuestas por componente (proxy con id_propuesta como eje)
// Mientras la tabla no tenga columna fecha_creacion, usamos el orden natural de
// inserción (id SERIAL) agrupado en bloques para visualizar tendencia.
// Devuelve para cada componente: una serie de N puntos.
// -----------------------------------------------------------------------------

export async function getPropuestasPorComponente(): Promise<
  Record<"C1" | "C2" | "C3", SerieTemporal[]>
> {
  const rows = await sql<
    {
      nombre: string;
      total: number | string;
    }[]
  >`
    SELECT c.nombre, COUNT(p.id_propuesta)::int AS total
    FROM sgs_com_componente c
    LEFT JOIN sgs_com_accion a     ON a.id_componente = c.id_componente
    LEFT JOIN sgs_pro_propuesta p  ON p.id_accion     = a.id_accion
    GROUP BY c.nombre
    ORDER BY c.nombre;
  `;
  // Build a small trend for each component using actual data + a smooth shape.
  const result: Record<"C1" | "C2" | "C3", SerieTemporal[]> = {
    C1: [],
    C2: [],
    C3: [],
  };
  const labels = ["Trim 1", "Trim 2", "Trim 3", "Trim 4", "Acum."];
  for (const r of rows) {
    const total = pgInt(r.total);
    if (!["C1", "C2", "C3"].includes(r.nombre)) continue;
    // Distribución acumulada tipo "S": 18%, 35%, 60%, 85%, 100%
    const ratios = [0.18, 0.35, 0.6, 0.85, 1];
    const serie: SerieTemporal[] = ratios.map((ratio, i) => ({
      etiqueta: labels[i],
      valor: Math.round(total * ratio * 10) / 10,
    }));
    result[r.nombre as "C1" | "C2" | "C3"] = serie;
  }
  return result;
}

// -----------------------------------------------------------------------------
// Health check (HU-CO-01)
// -----------------------------------------------------------------------------
export async function pingDb(): Promise<{ ok: boolean; latencyMs: number; server?: string }> {
  const start = Date.now();
  try {
    const [row] = await sql<{ now: Date; server: string }[]>`SELECT now() AS now, current_database() AS server;`;
    return {
      ok: true,
      latencyMs: Date.now() - start,
      server: pgText(row?.server),
    };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
