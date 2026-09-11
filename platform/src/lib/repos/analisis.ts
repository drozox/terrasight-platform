// =============================================================================
// Análisis espacial (HU-AA-02..04) + soporte de dashboard/home
//
//   - Análisis: buffer, matriz, cobertura, bbox
//   - Dashboard: getDashboardKpis, getComponentes, getCoberturaVegetal,
//                getIntervencionesRecientes, getPrediosGeoJSON,
//                getPrediosMini, getQuebradasMini, getAlertas, getFooterKpis,
//                getPrediosPorMunicipio, getPropuestasPorComponente, pingDb
//
// Reglas del split:
//   - Solo importa de `./_helpers`, `./types`, `../db`. Nunca de otro
//     `repos/*.ts`.
//   - `listPropuestasSimple` está en `./propuestas` (no en este archivo).
// =============================================================================

import { sql, pgInt, pgNum, pgText, pgDate } from "../db";
import { withFallback } from "./_helpers";
import { cached } from "./_cache";
import {
  DEMO_DASHBOARD_KPIS,
  DEMO_COMPONENTES,
  DEMO_COBERTURA,
  DEMO_INTERVENCIONES,
  DEMO_PREDIOS_GEOJSON,
  DEMO_PREDIOS,
  DEMO_QUEBRADAS,
  DEMO_ALERTAS,
  DEMO_FOOTER,
  DEMO_TOP_MUNICIPIOS,
  DEMO_SERIES_COMPONENTES,
} from "../demo-data";
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
  EstadoIntervencion,
  BufferResultItem,
  BufferTarget,
  MatrizFila,
  CoberturaMunicipioFila,
  BoundingBox,
  IntersectionResult,
} from "../types";

// =============================================================================
// Dashboard — KPIs principales (HU-CO-01)
// =============================================================================
const getDashboardKpisImpl = async (): Promise<DashboardKpis> => {
  return withFallback("dashboardKpis", async () => {
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
  }, DEMO_DASHBOARD_KPIS);
};
export const getDashboardKpis = cached(getDashboardKpisImpl, {
  tags: ["dashboard"],
  ttl: 60,
});

// =============================================================================
// Distribución por componente (HU-CO-01)
// =============================================================================
const getComponentesImpl = async (): Promise<ComponenteTotal[]> => {
  return withFallback("componentes", async () => {
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
  }, DEMO_COMPONENTES);
};
export const getComponentes = cached(getComponentesImpl, {
  tags: ["dashboard", "catalogos:full"],
  ttl: 300,
});

// =============================================================================
// Cobertura vegetal (datos demo — el cliente no tenía agregación,
// dejamos placeholders hasta construir la vista materializada)
// =============================================================================
const getCoberturaVegetalImpl = async (): Promise<CoberturaTotal[]> => {
  return withFallback("coberturaVegetal", async () => {
    const rows = await sql<{ nombre: string; area: number | string }[]>`
      SELECT
        c.nombre_cobertura AS nombre,
        COALESCE(SUM(pc.area_interseccion_ha), 0)::numeric AS area
      FROM sgs_rel_predio_cobertura pc
      JOIN sgs_amb_cobertura_clc c ON c.id_cobertura = pc.id_cobertura
      GROUP BY c.nombre_cobertura
      ORDER BY area DESC;
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
  }, DEMO_COBERTURA);
};
export const getCoberturaVegetal = cached(getCoberturaVegetalImpl, {
  tags: ["dashboard", "analisis"],
  ttl: 300,
});

// =============================================================================
// Intervenciones recientes (HU-CO-01, HU-TC-04)
// =============================================================================
const getIntervencionesRecientesImpl = async (
  limit = 6,
  componente: string | null = null,
): Promise<IntervencionReciente[]> => {
  return withFallback("intervencionesRecientes", async () => {
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
        estado: string;
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
        av.avance_pct                                                AS avance,
        pp.estado                                                    AS estado
      FROM sgs_pro_propuesta pp
      JOIN sgs_pre_predio pr   ON pr.id_predio = pp.id_predio
      JOIN sgs_com_accion a    ON a.id_accion  = pp.id_accion
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      LEFT JOIN bcs_lpa_vereda v     ON v.id_vereda        = pr.id_vereda
      LEFT JOIN bcs_lpa_municipio m  ON m.id_municipio     = v.id_municipio
      LEFT JOIN sgs_pro_propuesta_linea    pl  ON pl.id_propuesta = pp.id_propuesta
      LEFT JOIN sgs_pro_propuesta_poligono  pol ON pol.id_propuesta = pp.id_propuesta
      LEFT JOIN LATERAL (
        SELECT av2.avance_pct
        FROM   sgs_pro_propuesta_avance av2
        WHERE  av2.id_propuesta = pp.id_propuesta
          AND  av2.es_backfill = FALSE
        ORDER  BY av2.created_at DESC, av2.id_avance DESC
        LIMIT  1
      ) av ON true
      ${componente ? sql`WHERE c.nombre = ${componente}` : sql``}
      ORDER BY pp.id_propuesta ASC
      LIMIT ${limit};
    `;
    return rows.map((r) => {
      const avance = r.avance === null || r.avance === undefined ? null : pgInt(r.avance);
      const dbEstado = pgText(r.estado);
      // Migración 33 (Sprint 20): el CHECK constraint restringe `estado` a los
      // 6 valores del workflow. Si el valor en BD no encaja (datos viejos
      // o sync fuera de banda), caemos a EN_EJECUCION como "estado vivo".
      const estado: EstadoIntervencion =
        dbEstado === "BORRADOR" || dbEstado === "FINALIZADA" ? dbEstado : "EN_EJECUCION";
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
  }, componente ? DEMO_INTERVENCIONES.filter(i => i.componente === componente).slice(0, limit) : DEMO_INTERVENCIONES.slice(0, limit));
};
export const getIntervencionesRecientes = cached(getIntervencionesRecientesImpl, {
  tags: ["dashboard", "intervenciones"],
  ttl: 60,
});

// =============================================================================
// Predios para el mapa (HU-CO-03, HU-AA-01)
// =============================================================================
const getPrediosGeoJSONImpl = async (
  componente: string | null = null,
): Promise<MapFeatureCollection> => {
  return withFallback("prediosGeoJSON", async () => {
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
  }, componente ? {
    type: "FeatureCollection" as const,
    features: DEMO_PREDIOS_GEOJSON.features.filter(f => f.properties.componente === componente),
  } : DEMO_PREDIOS_GEOJSON);
};
export const getPrediosGeoJSON = cached(getPrediosGeoJSONImpl, {
  tags: ["dashboard", "mapa", "reportes"],
  ttl: 60,
});

const getPrediosMiniImpl = async (
  componente: string | null = null,
): Promise<PredioMini[]> => {
  return withFallback("prediosMini", async () => {
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
  }, DEMO_PREDIOS);
}
export const getPrediosMini = cached(getPrediosMiniImpl, {
  tags: ["mapa"],
  ttl: 300,
});

// =============================================================================
// Quebradas para el mapa (capa hidrografía)
// =============================================================================
const getQuebradasMiniImpl = async (): Promise<{ id: number; nombre: string; lon: number; lat: number }[]> => {
  return withFallback("quebradasMini", async () => {
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
  }, DEMO_QUEBRADAS);
}
export const getQuebradasMini = cached(getQuebradasMiniImpl, {
  tags: ["mapa", "dashboard"],
  ttl: 300,
});

// =============================================================================
// Alertas (DEBT-5: lee de sgs_amb_alerta, tabla real con FK y CHECKs).
// La migration 10 puebla la tabla con 5 alertas demo si está vacía.
// =============================================================================
export async function getAlertas(limit = 50): Promise<Alerta[]> {
  return withFallback("alertas", async () => {
    const rows = await sql<{
      id_alerta: number | string;
      tipo: string;
      titulo: string;
      descripcion: string;
      fecha: Date | string;
    }[]>`
      SELECT id_alerta, tipo, titulo, descripcion, fecha
      FROM   sgs_amb_alerta
      WHERE  estado = 'activa'
      ORDER  BY fecha DESC
      LIMIT  ${limit};
    `;
    return rows.map((r) => {
      const d = r.fecha instanceof Date ? r.fecha : new Date(pgText(r.fecha));
      const ahora = new Date();
      const diffMs = ahora.getTime() - d.getTime();
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      let fechaStr: string;
      if (diffDias === 0) fechaStr = "Hoy";
      else if (diffDias === 1) fechaStr = "Ayer";
      else if (diffDias < 7) fechaStr = `Hace ${diffDias} días`;
      else if (diffDias < 30) fechaStr = `Hace ${Math.floor(diffDias / 7)} sem`;
      else fechaStr = d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
      return {
        id: pgInt(r.id_alerta),
        tipo: pgText(r.tipo) as "error" | "warning" | "info",
        titulo: pgText(r.titulo),
        descripcion: pgText(r.descripcion),
        fecha: fechaStr,
      };
    });
  }, DEMO_ALERTAS.slice(0, limit));
}

// =============================================================================
// Footer — totales geográficos (municipios, veredas, fuentes hídricas)
// =============================================================================
const getFooterKpisImpl = async (): Promise<FooterKpis> => {
  return withFallback("footerKpis", async () => {
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
  }, DEMO_FOOTER);
};
export const getFooterKpis = cached(getFooterKpisImpl, {
  tags: ["dashboard"],
  ttl: 60,
});

// =============================================================================
// Top municipios por número de predios (para gráficos de series)
// =============================================================================
const getPrediosPorMunicipioImpl = async (
  limit = 6,
): Promise<PredioPorMunicipio[]> => {
  return withFallback("prediosPorMunicipio", async () => {
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
  }, DEMO_TOP_MUNICIPIOS.slice(0, limit));
};
export const getPrediosPorMunicipio = cached(getPrediosPorMunicipioImpl, {
  tags: ["dashboard"],
  ttl: 60,
});

// =============================================================================
// Serie temporal de propuestas por componente (proxy con id_propuesta como eje)
// Mientras la tabla no tenga columna fecha_creacion, usamos el orden natural de
// inserción (id SERIAL) agrupado en bloques para visualizar tendencia.
// Devuelve para cada componente: una serie de N puntos.
// =============================================================================
const getPropuestasPorComponenteImpl = async (): Promise<
  Record<"C1" | "C2" | "C3", SerieTemporal[]>
> => {
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
};
export const getPropuestasPorComponente = cached(getPropuestasPorComponenteImpl, {
  tags: ["dashboard"],
  ttl: 60,
});

// =============================================================================
// Health check (HU-CO-01)
// =============================================================================
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

// =============================================================================
// Análisis espacial (HU-AA-02..04)
// =============================================================================

/**
 * Análisis buffer (HU-AA-02).
 *
 *   - target="quebrada",  id=ID  → devuelve predios dentro de distanciaM.
 *   - target="propuesta", id=ID  → devuelve quebradas dentro de distanciaM.
 *
 * PostGIS: usamos cast ::geography para que las distancias queden en metros
 * independientemente del SRID (4686 para predios, 4326 para intervenciones).
 * Si PostGIS no está disponible, retorna [].
 */
export async function getAnalisisBuffer(args: {
  target: BufferTarget;
  id: number;
  distanciaM: number;
}): Promise<BufferResultItem[]> {
  if (args.distanciaM <= 0 || args.distanciaM > 50000) {
    // Tope de seguridad: 50 km. Más que eso es operacionalmente raro y
    // tarda demasiado en correr.
    throw new Error("Distancia debe estar entre 1 y 50000 metros.");
  }
  const dist = args.distanciaM;

  if (args.target === "quebrada") {
    // Centroid de la quebrada + lista de predios a <= dist metros
    const targetRows = await sql<{ geom_exists: boolean }[]>`
      SELECT (geom IS NOT NULL) AS geom_exists
      FROM   bcs_dh_quebrada
      WHERE  id_quebrada = ${args.id}
      LIMIT  1;
    `;
    if (!targetRows[0]?.geom_exists) {
      throw new Error("Quebrada sin geometría. Asignale lat/lon primero.");
    }
    const rows = await sql<{
      id_predio: number | string;
      nombre_predio: string;
      distancia_m: number | string;
      area_ha: number | string;
      centroid_lat: number | string;
      centroid_lon: number | string;
    }[]>`
      SELECT p.id_predio, p.nombre_predio,
             ST_Distance(p.geom::geography, q.geom::geography)::numeric(12,2) AS distancia_m,
             p.area_ha,
             p.latitud_centroide AS centroid_lat,
             p.longitud_centroide AS centroid_lon
      FROM   sgs_pre_predio p,
             bcs_dh_quebrada  q
      WHERE  q.id_quebrada = ${args.id}
        AND  p.geom IS NOT NULL
        AND  ST_DWithin(p.geom::geography, q.geom::geography, ${dist})
      ORDER  BY distancia_m ASC
      LIMIT  500;
    `;
    return rows.map((r) => ({
      tipo: "predio",
      id: pgInt(r.id_predio),
      nombre: pgText(r.nombre_predio),
      distanciaM: pgNum(r.distancia_m),
      areaHa: pgNum(r.area_ha),
      longitudM: null,
      centroidLat: pgNum(r.centroid_lat),
      centroidLon: pgNum(r.centroid_lon),
    }));
  }

  // target === "propuesta": para no acoplarnos al tipo (punto/linea/poligono),
  // usamos la sub-tabla sgs_pro_propuesta_{punto|linea|poligono} con UNION,
  // y devolvemos quebradas cercanas.
  const rows = await sql<{
    id_quebrada: number | string;
    nombre_quebrada: string;
    distancia_m: number | string;
    centroid_lat: number | string;
    centroid_lon: number | string;
  }[]>`
    SELECT q.id_quebrada, q.nombre_quebrada,
           ST_Distance(q.geom::geography, pp_geom.geom::geography)::numeric(12,2) AS distancia_m,
           q.latitud AS centroid_lat,
           q.longitud AS centroid_lon
    FROM   bcs_dh_quebrada q,
           (
             SELECT geom FROM sgs_pro_propuesta_punto    WHERE id_propuesta = ${args.id} AND geom IS NOT NULL
             UNION ALL
             SELECT geom FROM sgs_pro_propuesta_linea    WHERE id_propuesta = ${args.id} AND geom IS NOT NULL
             UNION ALL
             SELECT geom FROM sgs_pro_propuesta_poligono  WHERE id_propuesta = ${args.id} AND geom IS NOT NULL
           ) pp_geom
    WHERE  q.geom IS NOT NULL
      AND  ST_DWithin(q.geom::geography, pp_geom.geom::geography, ${dist})
    ORDER  BY distancia_m ASC
    LIMIT  500;
  `;
  return rows.map((r) => ({
    tipo: "quebrada",
    id: pgInt(r.id_quebrada),
    nombre: pgText(r.nombre_quebrada),
    distanciaM: pgNum(r.distancia_m),
    areaHa: null,
    longitudM: null,
    centroidLat: pgNum(r.centroid_lat),
    centroidLon: pgNum(r.centroid_lon),
  }));
}

// =============================================================================
// Matriz componente × municipio (HU-AA-04)
// =============================================================================
const getMatrizComponenteMunicipioImpl = async (): Promise<MatrizFila[]> => {
  const rows = await sql<{
    municipio: string;
    nombre_componente: string;
    num_propuestas: number | string;
    hectareas: number | string;
  }[]>`
    SELECT m.nombre_municipio                          AS municipio,
           c.nombre                                    AS nombre_componente,
           COUNT(DISTINCT pp.id_propuesta)::int        AS num_propuestas,
           COALESCE(SUM((
             SELECT pol.area_ha
             FROM   sgs_pro_propuesta_poligono pol
             WHERE  pol.id_propuesta = pp.id_propuesta
             LIMIT  1
           )), 0)::numeric                             AS hectareas
    FROM   bcs_lpa_municipio m
    LEFT JOIN bcs_lpa_vereda    v ON v.id_municipio  = m.id_municipio
    LEFT JOIN sgs_pre_predio    pr ON pr.id_vereda    = v.id_vereda
    LEFT JOIN sgs_pro_propuesta pp ON pp.id_predio    = pr.id_predio
    LEFT JOIN sgs_com_accion    a ON a.id_accion     = pp.id_accion
    LEFT JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    GROUP BY m.nombre_municipio, c.nombre
    ORDER BY m.nombre_municipio, c.nombre;
  `;
  // Pivotar a filas por municipio
  const porMunicipio = new Map<string, MatrizFila>();
  for (const r of rows) {
    const mun = pgText(r.municipio);
    let fila = porMunicipio.get(mun);
    if (!fila) {
      fila = {
        municipio: mun,
        C1: { numPropuestas: 0, hectareas: 0 },
        C2: { numPropuestas: 0, hectareas: 0 },
        C3: { numPropuestas: 0, hectareas: 0 },
        totalNumPropuestas: 0,
        totalHectareas: 0,
      };
      porMunicipio.set(mun, fila);
    }
    const c = pgText(r.nombre_componente);
    if (c === "C1" || c === "C2" || c === "C3") {
      const num = pgInt(r.num_propuestas);
      const ha  = pgNum(r.hectareas);
      fila[c].numPropuestas += num;
      fila[c].hectareas     += ha;
      fila.totalNumPropuestas += num;
      fila.totalHectareas     += ha;
    }
  }
  return Array.from(porMunicipio.values()).sort((a, b) =>
    a.municipio.localeCompare(b.municipio, "es"),
  );
}
export const getMatrizComponenteMunicipio = cached(getMatrizComponenteMunicipioImpl, {
  tags: ["analisis"],
  ttl: 300,
});

// =============================================================================
// Cobertura CLC × municipio (HU-AA-03)
// =============================================================================
const getCoberturaPorMunicipioImpl = async (): Promise<CoberturaMunicipioFila[]> => {
  const rows = await sql<{
    municipio: string;
    nombre_cobertura: string;
    ha: number | string;
    num_predios: number | string;
  }[]>`
    SELECT m.nombre_municipio    AS municipio,
           c.nombre_cobertura     AS nombre_cobertura,
           COALESCE(SUM(pc.area_ha_parcial), 0)::numeric AS ha,
           COUNT(DISTINCT pc.id_predio)::int              AS num_predios
    FROM   bcs_lpa_municipio        m
    LEFT JOIN bcs_lpa_vereda                v  ON v.id_municipio  = m.id_municipio
    LEFT JOIN sgs_pre_predio                p  ON p.id_vereda     = v.id_vereda
    LEFT JOIN sgs_rel_predio_cobertura     pc ON pc.id_predio    = p.id_predio
    LEFT JOIN sgs_amb_cobertura_clc        c  ON c.id_cobertura  = pc.id_cobertura
    GROUP  BY m.nombre_municipio, c.nombre_cobertura
    ORDER  BY m.nombre_municipio;
  `;
  const porMin = new Map<string, CoberturaMunicipioFila>();
  for (const r of rows) {
    const mun = pgText(r.municipio);
    let fila = porMin.get(mun);
    if (!fila) {
      fila = { municipio: mun, totalHa: 0, totalPredios: 0, porCobertura: [] };
      porMin.set(mun, fila);
    }
    const cobertura = pgText(r.nombre_cobertura);
    if (!cobertura) continue;
    const ha = pgNum(r.ha);
    const predios = pgInt(r.num_predios);
    fila.porCobertura.push({ nombre: cobertura, ha, predios, porcentaje: 0 });
    fila.totalHa += ha;
    fila.totalPredios = Math.max(fila.totalPredios, predios);
  }
  // Calcular porcentaje dentro de cada municipio
  const list = Array.from(porMin.values());
  for (const fila of list) {
    if (fila.totalHa > 0) {
      for (const c of fila.porCobertura) {
        c.porcentaje = Math.round((c.ha / fila.totalHa) * 100);
      }
      fila.porCobertura.sort((a, b) => b.ha - a.ha);
    }
  }
  return list.sort((a, b) => a.municipio.localeCompare(b.municipio, "es"));
}
export const getCoberturaPorMunicipio = cached(getCoberturaPorMunicipioImpl, {
  tags: ["analisis"],
  ttl: 300,
});

// =============================================================================
// Intersección por bounding box (HU-AA-03) — NO cacheada (query espacial pesada)
// =============================================================================
export async function getIntersectPorBoundingBox(
  bbox: BoundingBox,
): Promise<IntersectionResult> {
  // Validaciones livianas — el SRID se mantiene 4326 (lon/lat WGS84),
  // consistente con el convenio.
  if (
    !Number.isFinite(bbox.minLon) ||
    !Number.isFinite(bbox.minLat) ||
    !Number.isFinite(bbox.maxLon) ||
    !Number.isFinite(bbox.maxLat)
  ) {
    throw new Error("bbox inválido");
  }
  if (bbox.minLon >= bbox.maxLon || bbox.minLat >= bbox.maxLat) {
    throw new Error("bbox debe tener min < max en cada eje");
  }

  // 1) Predios dentro
  const predios = await sql<{
    id_predio: number | string;
    nombre_predio: string;
    area_ha: number | string;
    centroid_lat: number | string;
    centroid_lon: number | string;
    componente: string | null;
  }[]>`
    SELECT p.id_predio, p.nombre_predio, p.area_ha,
           p.latitud_centroide AS centroid_lat,
           p.longitud_centroide AS centroid_lon,
           (
             SELECT c.nombre
             FROM   sgs_pro_propuesta pp
             JOIN   sgs_com_accion    a ON a.id_accion     = pp.id_accion
             JOIN   sgs_com_componente c ON c.id_componente = a.id_componente
             WHERE  pp.id_predio = p.id_predio
             LIMIT  1
           ) AS componente
    FROM   sgs_pre_predio p
    WHERE  p.geom IS NOT NULL
      AND  ST_Intersects(
              p.geom,
              ST_MakeEnvelope(${bbox.minLon}, ${bbox.minLat}, ${bbox.maxLon}, ${bbox.maxLat}, 4326)
            )
    LIMIT  500;
  `;
  const prediosFmt = predios.map((r) => ({
    idPredio: pgInt(r.id_predio),
    nombre: pgText(r.nombre_predio),
    areaHaBdr: pgNum(r.area_ha),
    centroideLat: pgNum(r.centroid_lat),
    centroideLon: pgNum(r.centroid_lon),
    componente: r.componente ?? null,
  }));

  // 2) Propuestas dentro (UNION ALL en las 3 sub-tablas)
  const propuestas = await sql<{
    id_propuesta: number | string;
    tipo: "punto" | "linea" | "poligono";
    actividad: string;
    estado: string;
    hectareas: number | string | null;
    longitud_m: number | string | null;
  }[]>`
    WITH resultados AS (
      SELECT pp.id_propuesta, pp.tipo, pp.actividad, pp.estado,
             pol.area_ha AS hectareas, NULL::numeric AS longitud_m,
             pp_geom.geom
      FROM sgs_pro_propuesta pp
      JOIN sgs_pro_propuesta_poligono  pp_geom ON pp_geom.id_propuesta = pp.id_propuesta
      LEFT JOIN sgs_pro_propuesta_poligono pol ON pol.id_propuesta = pp.id_propuesta
      WHERE pp_geom.geom IS NOT NULL
        AND ST_Intersects(pp_geom.geom, ST_MakeEnvelope(${bbox.minLon}, ${bbox.minLat}, ${bbox.maxLon}, ${bbox.maxLat}, 4326))

      UNION ALL

      SELECT pp.id_propuesta, pp.tipo, pp.actividad, pp.estado,
             NULL::numeric AS hectareas, pl.longitud_m,
             pp_geom.geom
      FROM sgs_pro_propuesta pp
      JOIN sgs_pro_propuesta_linea     pp_geom ON pp_geom.id_propuesta = pp.id_propuesta
      LEFT JOIN sgs_pro_propuesta_linea pl ON pl.id_propuesta = pp.id_propuesta
      WHERE pp_geom.geom IS NOT NULL
        AND ST_Intersects(pp_geom.geom, ST_MakeEnvelope(${bbox.minLon}, ${bbox.minLat}, ${bbox.maxLon}, ${bbox.maxLat}, 4326))

      UNION ALL

      SELECT pp.id_propuesta, pp.tipo, pp.actividad, pp.estado,
             NULL::numeric, NULL::numeric, pp_geom.geom
      FROM sgs_pro_propuesta pp
      JOIN sgs_pro_propuesta_punto     pp_geom ON pp_geom.id_propuesta = pp.id_propuesta
      WHERE pp_geom.geom IS NOT NULL
        AND ST_Intersects(pp_geom.geom, ST_MakeEnvelope(${bbox.minLon}, ${bbox.minLat}, ${bbox.maxLon}, ${bbox.maxLat}, 4326))
    )
    SELECT DISTINCT ON (id_propuesta) id_propuesta, tipo, actividad, estado, hectareas, longitud_m
    FROM resultados
    ORDER BY id_propuesta ASC
    LIMIT 500;
  `;
  const propuestasFmt = propuestas.map((r) => ({
    idPropuesta: pgInt(r.id_propuesta),
    tipo: r.tipo,
    actividad: pgText(r.actividad),
    estado: pgText(r.estado),
    hectareas: r.hectareas == null ? null : pgNum(r.hectareas),
    longitudM: r.longitud_m == null ? null : pgNum(r.longitud_m),
  }));

  // 3) Área del bbox (en ha, geodésico)
  const areaRows = await sql<{ ha: number | string }[]>`
    SELECT ST_Area(
             ST_MakeEnvelope(${bbox.minLon}, ${bbox.minLat}, ${bbox.maxLon}, ${bbox.maxLat}, 4326)::geography
           ) / 10000 AS ha;
  `;
  const areaHaBbox = areaRows[0] ? pgNum(areaRows[0].ha) : null;

  return {
    bbox,
    areaHaBbox,
    numPredios: prediosFmt.length,
    totalAreaPrediosHa: prediosFmt.reduce((acc, p) => acc + p.areaHaBdr, 0),
    numPropuestas: propuestasFmt.length,
    predios: prediosFmt,
    propuestas: propuestasFmt,
  };
}
