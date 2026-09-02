// =============================================================================
// Metas por Componente/Acción (S5.M)
//
// Lee de las 3 vistas materializadas en 12-metas.sql:
//   - sgs_v_metas_resumen          (9 metas con current vs meta)
//   - sgs_v_metas_resumen_global   (agregación para el hero)
//   - sgs_v_municipios_intervenidos (municipios con propuestas)
//
// Reglas del split:
//   - Solo importa de `../db`. Nunca de otros `repos/*.ts`.
//   - Devuelve tipos puros de `../types` (snake_case de SQL → camelCase).
// =============================================================================

import { sql, pgInt, pgNum, pgText } from "../db";
import type { MetaResumen, MetasGlobal, MunicipioIntervenido } from "../types";

// -----------------------------------------------------------------------------
// getMetasResumen — lee sgs_v_metas_resumen y computa pct por fila.
// pct = (current / meta) * 100, cap a 100 para la barra de progreso.
// (Para UI de "超额" / over-achievement usar `currentValue` directo, sin cap.)
// -----------------------------------------------------------------------------
export async function getMetasResumen(): Promise<MetaResumen[]> {
  const rows = await sql<{
    componente: string;
    accion: string;
    meta_key: string;
    meta_label: string;
    meta_value: number | string;
    meta_unit: string;
    current_value: number | string;
    current_unit: string;
    count_propuestas: number | string;
  }[]>`SELECT * FROM sgs_v_metas_resumen ORDER BY componente, accion, meta_key;`;

  return rows.map((r) => {
    const metaValue = pgNum(r.meta_value);
    const currentValue = pgNum(r.current_value);
    const pct = metaValue > 0
      ? Math.min(100, Math.round((currentValue / metaValue) * 1000) / 10) // 1 decimal
      : 0;
    return {
      componente: pgText(r.componente),
      accion: pgText(r.accion),
      metaKey: pgText(r.meta_key),
      metaLabel: pgText(r.meta_label),
      metaValue,
      metaUnit: pgText(r.meta_unit),
      currentValue,
      currentUnit: pgText(r.current_unit),
      countPropuestas: pgInt(r.count_propuestas),
      pct,
    };
  });
}

// -----------------------------------------------------------------------------
// getMetasGlobal — para el hero "X de Y metas cumplidas, Z% avance global".
// -----------------------------------------------------------------------------
export async function getMetasGlobal(): Promise<MetasGlobal> {
  const rows = await sql<{
    total_metas: number | string;
    metas_cumplidas: number | string;
    sum_current: number | string;
    sum_meta: number | string;
  }[]>`SELECT * FROM sgs_v_metas_resumen_global;`;

  const fallback = { total_metas: 0, metas_cumplidas: 0, sum_current: 0, sum_meta: 0 };
  const r = rows[0] ?? fallback;
  const sumMeta = pgNum(r.sum_meta);
  const sumCurrent = pgNum(r.sum_current);
  const pct = sumMeta > 0
    ? Math.min(100, Math.round((sumCurrent / sumMeta) * 1000) / 10)
    : 0;

  return {
    totalMetas: pgInt(r.total_metas),
    metasCumplidas: pgInt(r.metas_cumplidas),
    sumCurrent,
    sumMeta,
    pct,
  };
}

// -----------------------------------------------------------------------------
// getMunicipiosIntervenidos — para "¿cuántos y cuáles municipios intervenidos?".
//   Devuelve TODOS los municipios con al menos 1 propuesta, ordenados por
//   num_propuestas DESC. La página decide si los muestra en cards o tabla.
// -----------------------------------------------------------------------------
export async function getMunicipiosIntervenidos(): Promise<MunicipioIntervenido[]> {
  const rows = await sql<{
    id_municipio: number | string;
    nombre_municipio: string;
    departamento: string;
    num_propuestas: number | string;
    num_predios: number | string;
    num_veredas: number | string;
  }[]>`SELECT * FROM sgs_v_municipios_intervenidos;`;

  return rows.map((r) => ({
    idMunicipio: pgInt(r.id_municipio),
    nombreMunicipio: pgText(r.nombre_municipio),
    departamento: pgText(r.departamento),
    numPropuestas: pgInt(r.num_propuestas),
    numPredios: pgInt(r.num_predios),
    numVeredas: pgInt(r.num_veredas),
  }));
}
