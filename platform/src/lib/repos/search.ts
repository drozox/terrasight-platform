// =============================================================================
// search — búsqueda transversal con pg_trgm + unaccent
//
// Sprint 19 — UX-61 (audit 2026-07-24) hotfix: los usuarios querían una
// búsqueda única en el topbar que cruce predios, propuestas, municipios,
// veredas y propietarios. Antes había que ir a cada página y filtrar ahí.
//
// Estrategia:
//   - Búsqueda con ILIKE + unaccent (maneja tildes: "obras" ↔ "Obras")
//   - Score por similitud (similarity) de pg_trgm cuando hay índice
//     (lo agregamos en la migration)
//   - Cada tabla aporta hasta 5 resultados, con UNION ALL + LIMIT
//   - Devuelve tipo, id, label, href para navegación directa
//
// Tablas indexadas (creadas en migration 32-search-indexes.sql):
//   - sgs_pre_predio.nombre_predio
//   - sgs_pro_propuesta.actividad (la propuesta "madre")
//   - sgs_pro_propuesta_punto.actividad
//   - bcs_lpa_municipio.nombre_municipio
//   - bcs_lpa_vereda.nombre_vereda
//   - bcs_lpa_propietario.nombre
// =============================================================================

import { sql, pgInt } from "../db";

export interface SearchResult {
  tipo: "predio" | "propuesta" | "municipio" | "vereda" | "propietario";
  id: number;
  label: string;
  sublabel?: string;
  href: string;
  score: number;
}

const PER_TABLE_LIMIT = 5;

export async function searchAll(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // LIKE pattern — escapamos % y _ para que no haya inyecciones de wildcard
  const likePattern = `%${q.replace(/[%_\\]/g, (c) => "\\" + c)}%`;

  // Cada bloque devuelve hasta 5 resultados con score de similitud.
  // Si pg_trgm no está instalado, similarity() retorna 0 y ordenamos por
  // longitud del label (matches más cortos primero).
  const rows = await sql<
    Array<{
      tipo: string;
      id: number;
      label: string;
      sublabel: string | null;
      href: string;
      score: number;
    }>
  >`
    WITH q AS (SELECT ${q}::text AS term, ${likePattern}::text AS pattern),
    matches AS (
      -- 1. Predios
      (SELECT
        'predio'::text AS tipo,
        id_predio::int AS id,
        nombre_predio AS label,
        NULL::text AS sublabel,
        '/predios/' || id_predio::text AS href,
        similarity(unaccent(lower(nombre_predio)), unaccent(lower((SELECT term FROM q)))) AS score
      FROM sgs_pre_predio, q
      WHERE unaccent(lower(nombre_predio)) ILIKE unaccent(lower((SELECT pattern FROM q)))
      ORDER BY score DESC NULLS LAST, length(nombre_predio)
      LIMIT ${PER_TABLE_LIMIT})

      UNION ALL

      -- 2. Propuestas (la tabla madre)
      (SELECT
        'propuesta'::text AS tipo,
        id_propuesta::int AS id,
        actividad AS label,
        tipo AS sublabel,
        '/intervenciones/' || id_propuesta::text AS href,
        similarity(unaccent(lower(actividad)), unaccent(lower((SELECT term FROM q)))) AS score
      FROM sgs_pro_propuesta, q
      WHERE unaccent(lower(actividad)) ILIKE unaccent(lower((SELECT pattern FROM q)))
      ORDER BY score DESC NULLS LAST, length(actividad)
      LIMIT ${PER_TABLE_LIMIT})

      UNION ALL

      -- 3. Municipios
      (SELECT
        'municipio'::text AS tipo,
        id_municipio::int AS id,
        nombre_municipio AS label,
        departamento AS sublabel,
        '/catalogos/municipios/' || id_municipio::text AS href,
        similarity(unaccent(lower(nombre_municipio)), unaccent(lower((SELECT term FROM q)))) AS score
      FROM bcs_lpa_municipio, q
      WHERE unaccent(lower(nombre_municipio)) ILIKE unaccent(lower((SELECT pattern FROM q)))
      ORDER BY score DESC NULLS LAST, length(nombre_municipio)
      LIMIT ${PER_TABLE_LIMIT})

      UNION ALL

      -- 4. Veredas
      (SELECT
        'vereda'::text AS tipo,
        id_vereda::int AS id,
        nombre_vereda AS label,
        NULL::text AS sublabel,
        '/catalogos/veredas/' || id_vereda::text AS href,
        similarity(unaccent(lower(nombre_vereda)), unaccent(lower((SELECT term FROM q)))) AS score
      FROM bcs_lpa_vereda, q
      WHERE unaccent(lower(nombre_vereda)) ILIKE unaccent(lower((SELECT pattern FROM q)))
      ORDER BY score DESC NULLS LAST, length(nombre_vereda)
      LIMIT ${PER_TABLE_LIMIT})

      UNION ALL

      -- 5. Propietarios (sgs_pre_propietario)
      (SELECT
        'propietario'::text AS tipo,
        id_propietario::int AS id,
        nombre_razon_social AS label,
        telefono AS sublabel,
        '/catalogos/propietarios/' || id_propietario::text AS href,
        similarity(unaccent(lower(nombre_razon_social)), unaccent(lower((SELECT term FROM q)))) AS score
      FROM sgs_pre_propietario, q
      WHERE unaccent(lower(nombre_razon_social)) ILIKE unaccent(lower((SELECT pattern FROM q)))
      ORDER BY score DESC NULLS LAST, length(nombre_razon_social)
      LIMIT ${PER_TABLE_LIMIT})
    )
    SELECT * FROM matches
    ORDER BY score DESC NULLS LAST, length(label)
    LIMIT 25
  `;

  return rows.map((r) => ({
    tipo: r.tipo as SearchResult["tipo"],
    id: pgInt(r.id),
    label: r.label,
    sublabel: r.sublabel ?? undefined,
    href: r.href,
    score: r.score,
  }));
}
