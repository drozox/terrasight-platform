// =============================================================================
// calidad — métricas de salud de los datos geográficos
//
// Sprint 19 — P1 (plan v1.0): dashboard /admin/calidad con reglas catalogadas.
// Cada regla devuelve { id, label, count, total, severity, message }.
// severity: "ok" (< 1%), "warning" (1-5%), "error" (> 5%).
//
// Las reglas son queries SQL read-only que se ejecutan en paralelo.
// =============================================================================

import { sql, pgInt } from "../db";

export type Severity = "ok" | "warning" | "error";

export interface QualityRule {
  id: string;
  label: string;
  description: string;
  count: number;
  total: number;
  severity: Severity;
  message: string;
}

function severityFor(count: number, total: number): Severity {
  if (total === 0) return "ok";
  const pct = count / total;
  if (pct > 0.05) return "error";
  if (pct > 0.01) return "warning";
  return "ok";
}

export interface QualityReport {
  rules: QualityRule[];
  generatedAt: string;
  totals: {
    predios: number;
    propuestas: number;
    propuestas_punto: number;
    propuestas_linea: number;
    propuestas_poligono: number;
    vias: number;
    drenaje_simple: number;
    drenaje_doble: number;
    quebradas: number;
    municipios: number;
    veredas: number;
    propietarios: number;
  };
  indexes: { name: string; table: string; kind: string }[];
}

export async function getQualityReport(): Promise<QualityReport> {
  // 1. Conteos totales por tabla (incluye nulos para los "with geom" check)
  const counts = await sql<
    Array<{
      n_predios: number;
      n_propuestas: number;
      n_prop_puntos: number;
      n_prop_lineas: number;
      n_prop_poligonos: number;
      n_vias: number;
      n_drenaje_simple: number;
      n_drenaje_doble: number;
      n_quebradas: number;
      n_municipios: number;
      n_veredas: number;
      n_propietarios: number;
    }>
  >`
    SELECT
      (SELECT count(*)::int FROM sgs_pre_predio) AS n_predios,
      (SELECT count(*)::int FROM sgs_pro_propuesta) AS n_propuestas,
      (SELECT count(*)::int FROM sgs_pro_propuesta_punto) AS n_prop_puntos,
      (SELECT count(*)::int FROM sgs_pro_propuesta_linea) AS n_prop_lineas,
      (SELECT count(*)::int FROM sgs_pro_propuesta_poligono) AS n_prop_poligonos,
      (SELECT count(*)::int FROM sgs_inf_via) AS n_vias,
      (SELECT count(*)::int FROM sgs_inf_drenaje_simple) AS n_drenaje_simple,
      (SELECT count(*)::int FROM sgs_inf_drenaje_doble) AS n_drenaje_doble,
      (SELECT count(*)::int FROM bcs_dh_quebrada) AS n_quebradas,
      (SELECT count(*)::int FROM bcs_lpa_municipio) AS n_municipios,
      (SELECT count(*)::int FROM bcs_lpa_vereda) AS n_veredas,
      (SELECT count(*)::int FROM sgs_pre_propietario) AS n_propietarios
  `;
  const c = counts[0];

  // 2. Reglas de calidad — geoms faltantes y problemas comunes
  const qualityRows = await sql<
    Array<{
      rule_id: string;
      n_bad: number;
      n_total: number;
    }>
  >`
    -- geom NULL en tablas geográficas (deberían tener geometría siempre)
    SELECT 'predios_sin_geom' AS rule_id,
           (SELECT count(*)::int FROM sgs_pre_predio WHERE geom IS NULL) AS n_bad,
           (SELECT count(*)::int FROM sgs_pre_predio) AS n_total
    UNION ALL SELECT 'propuestas_punto_sin_geom',
           (SELECT count(*)::int FROM sgs_pro_propuesta_punto WHERE geom IS NULL),
           (SELECT count(*)::int FROM sgs_pro_propuesta_punto)
    UNION ALL SELECT 'propuestas_linea_sin_geom',
           (SELECT count(*)::int FROM sgs_pro_propuesta_linea WHERE geom IS NULL),
           (SELECT count(*)::int FROM sgs_pro_propuesta_linea)
    UNION ALL SELECT 'propuestas_poligono_sin_geom',
           (SELECT count(*)::int FROM sgs_pro_propuesta_poligono WHERE geom IS NULL),
           (SELECT count(*)::int FROM sgs_pro_propuesta_poligono)
    UNION ALL SELECT 'vias_sin_geom',
           (SELECT count(*)::int FROM sgs_inf_via WHERE geom IS NULL),
           (SELECT count(*)::int FROM sgs_inf_via)
    UNION ALL SELECT 'drenaje_simple_sin_geom',
           (SELECT count(*)::int FROM sgs_inf_drenaje_simple WHERE geom IS NULL),
           (SELECT count(*)::int FROM sgs_inf_drenaje_simple)
    UNION ALL SELECT 'quebradas_sin_geom',
           (SELECT count(*)::int FROM bcs_dh_quebrada WHERE geom IS NULL),
           (SELECT count(*)::int FROM bcs_dh_quebrada)
    UNION ALL SELECT 'municipios_sin_geom',
           (SELECT count(*)::int FROM bcs_lpa_municipio WHERE geom IS NULL),
           (SELECT count(*)::int FROM bcs_lpa_municipio)
    UNION ALL SELECT 'veredas_sin_geom',
           (SELECT count(*)::int FROM bcs_lpa_vereda WHERE geom IS NULL),
           (SELECT count(*)::int FROM bcs_lpa_vereda)
    -- propuestas sin predio asociado
    UNION ALL SELECT 'propuestas_sin_predio',
           (SELECT count(*)::int FROM sgs_pro_propuesta WHERE id_predio IS NULL),
           (SELECT count(*)::int FROM sgs_pro_propuesta)
    -- nombres vacíos
    UNION ALL SELECT 'predios_nombre_vacio',
           (SELECT count(*)::int FROM sgs_pre_predio WHERE nombre_predio IS NULL OR trim(nombre_predio) = ''),
           (SELECT count(*)::int FROM sgs_pre_predio)
    UNION ALL SELECT 'veredas_nombre_vacio',
           (SELECT count(*)::int FROM bcs_lpa_vereda WHERE nombre_vereda IS NULL OR trim(nombre_vereda) = ''),
           (SELECT count(*)::int FROM bcs_lpa_vereda)
  `;

  const RULE_META: Record<string, { label: string; description: string }> = {
    predios_sin_geom: {
      label: "Predios sin geometría",
      description: "Predios con geom NULL. Afecta visibilidad en el mapa y cálculo de áreas.",
    },
    propuestas_punto_sin_geom: {
      label: "Puntos de propuesta sin geom",
      description: "Puntos sin coordenada. No aparecen en el mapa ni en análisis espaciales.",
    },
    propuestas_linea_sin_geom: {
      label: "Líneas de propuesta sin geom",
      description: "Líneas sin trazado. Sin geom no se calcula longitud ni se renderiza.",
    },
    propuestas_poligono_sin_geom: {
      label: "Polígonos de propuesta sin geom",
      description: "Polígonos sin área. Sin geom no se calcula área ni se renderiza.",
    },
    vias_sin_geom: {
      label: "Vías sin geometría",
      description: "Vías sin trazado. No se ven en el mapa ni en análisis de conectividad.",
    },
    drenaje_simple_sin_geom: {
      label: "Drenajes simples sin geom",
      description: "Drenajes sin línea. No se ven en el mapa ni en análisis hidrológicos.",
    },
    quebradas_sin_geom: {
      label: "Quebradas sin geometría",
      description: "Quebradas sin línea. No se ven en el mapa.",
    },
    municipios_sin_geom: {
      label: "Municipios sin geom",
      description: "Municipios sin polígono. El contorno departamental no se ve en el mapa.",
    },
    veredas_sin_geom: {
      label: "Veredas sin geom",
      description: "Veredas sin polígono. La división veredal no se ve en el mapa.",
    },
    propuestas_sin_predio: {
      label: "Propuestas sin predio",
      description: "Propuestas sin id_predio. No se pueden asociar a un beneficiario ni dibujar sobre un mapa catastral.",
    },
    predios_nombre_vacio: {
      label: "Predios con nombre vacío",
      description: "Predios sin nombre. Dificultan la búsqueda y los reportes.",
    },
    veredas_nombre_vacio: {
      label: "Veredas con nombre vacío",
      description: "Veredas sin nombre. Dificultan la búsqueda.",
    },
  };

  const rules: QualityRule[] = qualityRows.map((r) => {
    const bad = pgInt(r.n_bad);
    const total = pgInt(r.n_total);
    const sev = severityFor(bad, total);
    const meta = RULE_META[r.rule_id] ?? { label: r.rule_id, description: "" };
    return {
      id: r.rule_id,
      label: meta.label,
      description: meta.description,
      count: bad,
      total,
      severity: sev,
      message:
        sev === "ok"
          ? "OK"
          : `${bad.toLocaleString("es-CO")} de ${total.toLocaleString("es-CO")} (${((bad / Math.max(total, 1)) * 100).toFixed(1)}%)`,
    };
  });

  // 3. Inventario de índices (GIST y GIN trgm)
  const indexRows = await sql<Array<{ indexname: string; tablename: string; indexdef: string }>>`
    SELECT indexname, tablename, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND (indexdef ILIKE '%gist%' OR indexdef ILIKE '%gin%trgm%')
    ORDER BY tablename, indexname
  `;
  const indexes = indexRows.map((r) => {
    const m = r.indexdef.match(/USING (\w+)/);
    return { name: r.indexname, table: r.tablename, kind: m ? m[1] : "?" };
  });

  return {
    rules,
    generatedAt: new Date().toISOString(),
    totals: {
      predios: pgInt(c.n_predios),
      propuestas: pgInt(c.n_propuestas),
      propuestas_punto: pgInt(c.n_prop_puntos),
      propuestas_linea: pgInt(c.n_prop_lineas),
      propuestas_poligono: pgInt(c.n_prop_poligonos),
      vias: pgInt(c.n_vias),
      drenaje_simple: pgInt(c.n_drenaje_simple),
      drenaje_doble: pgInt(c.n_drenaje_doble),
      quebradas: pgInt(c.n_quebradas),
      municipios: pgInt(c.n_municipios),
      veredas: pgInt(c.n_veredas),
      propietarios: pgInt(c.n_propietarios),
    },
    indexes,
  };
}
