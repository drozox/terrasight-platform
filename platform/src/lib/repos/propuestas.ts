// =============================================================================
// Propuestas / Intervenciones (HU-TC-04, HU-IC-01..04)
//
//   - listPropuestasSimple: para los <select> del buffer
//   - setIntervencionEstado: cambio de estado simple
//   - getIntervencionCompleta: ficha detallada (discriminated union por tipo)
//   - listAvancesByPropuesta / agregarAvancePropuesta: timeline (HU-IC-04)
//
// Reglas del split:
//   - Solo importa de `./_helpers`, `./types`, `../db`. Nunca de otro
//     `repos/*.ts`.
// =============================================================================

import { sql, pgInt, pgNum, pgText } from "../db";
import { withFallback } from "./_helpers";
import type {
  PropuestaSimple,
  EstadoIntervencion,
  IntervencionCompleta,
  AvancePropuesta,
  GeoJSONLineString,
  GeoJSONPolygon,
  PuntoGeom,
  LineaGeom,
  PoligonoGeom,
} from "../types";

// `IntervencionCompletaBase` no se exporta de `./types` (es un detalle
// interno del discriminated union). Lo declaramos local para construir
// el objeto base antes del cast final.
interface IntervencionCompletaBase {
  id: number;
  tipo: "punto" | "linea" | "poligono";
  actividad: string;
  estado: EstadoIntervencion;
  predio: { id: number; nombre: string; codigo: string; areaHa: number } | null;
  vereda: { id: number; nombre: string } | null;
  municipio: { id: number; nombre: string; departamento: string } | null;
  accion: { id: number; nombre: string; componente: string } | null;
  quebrada: { id: number; nombre: string } | null;
  avancePctActual: number | null;
  avances: AvancePropuesta[];
}

// =============================================================================
// Listado simple para los <select> del buffer (HU-AA-02)
// =============================================================================

export async function listPropuestasSimple(limit = 200): Promise<PropuestaSimple[]> {
  // Damos un set curado: 200 más recientes. Para el buffer select es suficiente.
  const rows = await sql<{
    id_propuesta: number | string;
    tipo: "punto" | "linea" | "poligono";
    actividad: string;
    hectareas: number | string | null;
    longitud_m: number | string | null;
  }[]>`
    SELECT pp.id_propuesta, pp.tipo, pp.actividad,
           pol.area_ha          AS hectareas,
           pl.longitud_m        AS longitud_m
    FROM   sgs_pro_propuesta pp
    LEFT JOIN sgs_pro_propuesta_poligono pol ON pol.id_propuesta = pp.id_propuesta
    LEFT JOIN sgs_pro_propuesta_linea    pl  ON pl.id_propuesta  = pp.id_propuesta
    ORDER BY pp.id_propuesta DESC
    LIMIT ${limit};
  `;
  return rows.map((r) => ({
    idPropuesta: pgInt(r.id_propuesta),
    tipo: r.tipo,
    actividad: pgText(r.actividad),
    hectareas: r.hectareas == null ? null : pgNum(r.hectareas),
    longitudM: r.longitud_m == null ? null : pgNum(r.longitud_m),
  }));
}

// =============================================================================
// Cambio de estado (HU-TC-04)
//
// TODO: la columna `estado` no existe todavía en sgs_pro_propuesta. El estado
// se calcula desde `tipo` (punto=20%, linea=75%, poligono=100% → Finalizada).
// Para que el GESTOR pueda editar el estado hace falta una migración
// `04-intervencion-estado.sql` que agregue la columna con backfill.
// Marcamos este CRUD como pendiente.
// =============================================================================

export async function setIntervencionEstado(
  idPropuesta: number,
  nuevoEstado: EstadoIntervencion,
): Promise<void> {
  // Whitelist defensiva inline (el type guard vive en `lib/constants.ts` y
  // se usa en client; acá en server validamos de nuevo).
  if (nuevoEstado !== "Pendiente" && nuevoEstado !== "En ejecución" && nuevoEstado !== "Finalizada") {
    throw new Error(`Estado inválido: ${nuevoEstado}`);
  }
  await sql`
    UPDATE sgs_pro_propuesta
    SET    estado = ${nuevoEstado}
    WHERE  id_propuesta = ${idPropuesta};
  `;
}

// =============================================================================
// Ficha de intervención (HU-IC-01..04)
//
// Una propuesta tiene UN subtipo de geometría (punto | linea | poligono).
// Devolvemos un tipo discriminado por `tipo` para que el front pueda hacer
// un switch exhaustivo sin tener que nullable-checkear cada campo.
//
// NO usamos `withFallback` para estas funciones: son single-record y la
// ficha detallada DEBE fallar duro si la BD no responde (es la página donde
// el gestor edita, no la home).
// =============================================================================

// -----------------------------------------------------------------------------
// Helpers internos
// -----------------------------------------------------------------------------
function parseGeoJSON<T>(raw: unknown, label: string): T | null {
  if (raw === null || raw === undefined) return null;
  let str: string | null = null;
  if (typeof raw === "string") str = raw;
  else if (typeof raw === "object") {
    // postgres-js a veces deserializa ::jsonb a objeto directo.
    return raw as T;
  }
  if (!str) return null;
  try {
    return JSON.parse(str) as T;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[terrasight] ST_AsGeoJSON(${label}) no parseable:`, (err as Error).message);
    }
    return null;
  }
}

// -----------------------------------------------------------------------------
// getUltimoAvanceReal — devuelve el último evento de avance **NO** marcado
// como backfill para una propuesta. Devuelve `null` si la propuesta no
// tiene ningún evento manual. Reutilizado por queries que necesitan el
// avance real (no el ficticio del backfill de la migración 06).
// -----------------------------------------------------------------------------
async function getUltimoAvanceReal(
  idPropuesta: number,
): Promise<AvancePropuesta | null> {
  const rows = await sql<{
    id_avance: number | string;
    id_propuesta: number | string;
    avance_pct: number | string;
    nota: string;
    id_usuario: number | string | null;
    autor_email: string | null;
    es_backfill: boolean | string;
    created_at: Date | string;
  }[]>`
    SELECT av.id_avance, av.id_propuesta, av.avance_pct, av.nota,
           av.id_usuario, autor.email AS autor_email,
           av.es_backfill, av.created_at
    FROM   sgs_pro_propuesta_avance av
    LEFT JOIN sgs_adm_usuario autor ON autor.id_usuario = av.id_usuario
    WHERE  av.id_propuesta = ${idPropuesta}
      AND  av.es_backfill = FALSE
    ORDER  BY av.created_at DESC, av.id_avance DESC
    LIMIT  1;
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    idAvance: pgInt(r.id_avance),
    idPropuesta: pgInt(r.id_propuesta),
    avancePct: pgInt(r.avance_pct),
    nota: pgText(r.nota),
    idUsuario: r.id_usuario == null ? null : pgInt(r.id_usuario),
    autorEmail: r.autor_email,
    esBackfill: r.es_backfill === true || r.es_backfill === "t" || r.es_backfill === "true",
    createdAt: new Date(pgText(r.created_at)),
  };
}

// -----------------------------------------------------------------------------
// getIntervencionCompleta — query principal de /intervenciones/[id].
//
// Devuelve la propuesta con todos los joins y la lista de avances ordenada
// por fecha DESC. Devuelve `null` si la propuesta no existe.
// -----------------------------------------------------------------------------
export async function getIntervencionCompleta(
  id: number,
): Promise<IntervencionCompleta | null> {
  // Query 1: propuesta + joins a catálogos.
  // NOTA: pp.estado viene de la migración 04. Si la BD no la tiene aplicada,
  // esta query falla — comportamiento consistente con getIntervencionesRecientes.
  const rows = await sql<{
    id_propuesta: number | string;
    tipo: string;
    actividad: string;
    estado: string;
    id_predio: number | string | null;
    nombre_predio: string | null;
    codigo_predio: string | null;
    area_ha_predio: number | string | null;
    id_vereda: number | string | null;
    nombre_vereda: string | null;
    id_municipio: number | string | null;
    nombre_municipio: string | null;
    departamento: string | null;
    id_accion: number | string | null;
    nombre_accion: string | null;
    nombre_componente: string | null;
    id_quebrada: number | string | null;
    nombre_quebrada: string | null;
  }[]>`
    SELECT
      pp.id_propuesta,
      pp.tipo,
      pp.actividad,
      pp.estado,
      pr.id_predio,
      pr.nombre_predio,
      ('PR-' || LPAD(pr.id_predio::text, 5, '0')) AS codigo_predio,
      pr.area_ha                                       AS area_ha_predio,
      v.id_vereda,
      v.nombre_vereda,
      m.id_municipio,
      m.nombre_municipio,
      m.departamento,
      a.id_accion,
      a.nombre      AS nombre_accion,
      c.nombre      AS nombre_componente,
      q.id_quebrada,
      q.nombre_quebrada
    FROM sgs_pro_propuesta pp
    LEFT JOIN sgs_pre_predio     pr ON pr.id_predio  = pp.id_predio
    LEFT JOIN bcs_lpa_vereda      v  ON v.id_vereda   = pr.id_vereda
    LEFT JOIN bcs_lpa_municipio  m  ON m.id_municipio = v.id_municipio
    LEFT JOIN sgs_com_accion     a  ON a.id_accion    = pp.id_accion
    LEFT JOIN sgs_com_componente c  ON c.id_componente = a.id_componente
    LEFT JOIN bcs_dh_quebrada    q  ON q.id_quebrada  = pp.id_quebrada
    WHERE pp.id_propuesta = ${id}
    LIMIT 1;
  `;
  const row = rows[0];
  if (!row) return null;

  const tipo = pgText(row.tipo) as "punto" | "linea" | "poligono";
  const dbEstado = pgText(row.estado);
  const estado: EstadoIntervencion =
    dbEstado === "Pendiente" || dbEstado === "Finalizada" ? dbEstado : "En ejecución";

  // Lanzamos Q2 y Q3 en paralelo (Q2 sólo si aplica por tipo).
  const avancesPromise = listAvancesByPropuesta(id);
  type PuntoRow = {
    este: number | string;
    norte: number | string;
    tipo_punto: string;
    descripcion: string;
  };
  type LineaRow = {
    longitud_m: number | string;
    area_ha: number | string | null;
    geojson: string | object | null;
  };
  type PoligonoRow = {
    area_ha: number | string;
    geojson: string | object | null;
  };
  let geomPromise: Promise<PuntoRow[] | LineaRow[] | PoligonoRow[] | []> =
    Promise.resolve([] as []);
  if (tipo === "linea") {
    geomPromise = sql<LineaRow[]>`
      SELECT longitud_m,
             0::numeric       AS area_ha,
             ST_AsGeoJSON(geom) AS geojson
      FROM   sgs_pro_propuesta_linea
      WHERE  id_propuesta = ${id}
      LIMIT  1;
    `;
  } else if (tipo === "poligono") {
    geomPromise = sql<PoligonoRow[]>`
      SELECT area_ha,
             ST_AsGeoJSON(geom) AS geojson
      FROM   sgs_pro_propuesta_poligono
      WHERE  id_propuesta = ${id}
      LIMIT  1;
    `;
  } else if (tipo === "punto") {
    geomPromise = sql<PuntoRow[]>`
      SELECT este,
             norte,
             tipo_punto,
             descripcion
      FROM   sgs_pro_propuesta_punto
      WHERE  id_propuesta = ${id}
      LIMIT  1;
    `;
  }

  const [avances, geomRows] = await Promise.all([avancesPromise, geomPromise]);
  const geomRow = geomRows[0] ?? null;

  // Avance actual: el del último registro (excluyendo backfill), o `null`
  // si la propuesta no tiene ningún evento manual. Sin COALESCE: queremos
  // que la UI distinga "no registrado" de "0%".
  const avancesReales = avances.filter((a) => !a.esBackfill);
  const avancePctActual =
    avancesReales.length > 0 ? avancesReales[0]!.avancePct : null;

  // Armamos el sub-objeto `geom` según tipo.
  let geom: PuntoGeom | LineaGeom | PoligonoGeom | null = null;
  if (tipo === "punto" && geomRow && "este" in geomRow) {
    const r = geomRow as PuntoRow;
    geom = {
      lat: pgNum(r.norte),
      lon: pgNum(r.este),
      tipoPunto: pgText(r.tipo_punto),
      descripcion: pgText(r.descripcion),
    };
  } else if (tipo === "linea" && geomRow && "longitud_m" in geomRow) {
    const r = geomRow as LineaRow;
    const geojson = parseGeoJSON<GeoJSONLineString>(r.geojson, "linea");
    if (geojson) {
      geom = {
        longitudM: pgNum(r.longitud_m),
        areaHa: pgNum(r.area_ha),
        geojson,
      };
    }
  } else if (tipo === "poligono" && geomRow && "area_ha" in geomRow) {
    const r = geomRow as PoligonoRow;
    const geojson = parseGeoJSON<GeoJSONPolygon>(r.geojson, "poligono");
    if (geojson) {
      geom = { areaHa: pgNum(r.area_ha), geojson };
    }
  }

  const base: IntervencionCompletaBase = {
    id: pgInt(row.id_propuesta),
    tipo,
    actividad: pgText(row.actividad),
    estado,
    predio:
      row.id_predio != null
        ? {
            id: pgInt(row.id_predio),
            nombre: pgText(row.nombre_predio),
            codigo: pgText(row.codigo_predio),
            areaHa: pgNum(row.area_ha_predio),
          }
        : null,
    vereda:
      row.id_vereda != null
        ? { id: pgInt(row.id_vereda), nombre: pgText(row.nombre_vereda) }
        : null,
    municipio:
      row.id_municipio != null
        ? {
            id: pgInt(row.id_municipio),
            nombre: pgText(row.nombre_municipio),
            departamento: pgText(row.departamento),
          }
        : null,
    accion:
      row.id_accion != null
        ? {
            id: pgInt(row.id_accion),
            nombre: pgText(row.nombre_accion),
            componente: pgText(row.nombre_componente),
          }
        : null,
    quebrada:
      row.id_quebrada != null
        ? { id: pgInt(row.id_quebrada), nombre: pgText(row.nombre_quebrada) }
        : null,
    avancePctActual,
    avances,
  };

  return { ...base, tipo, geom } as IntervencionCompleta;
}

// -----------------------------------------------------------------------------
// listAvancesByPropuesta — histórico ordenado DESC.
// Incluye TODAS las filas (incluyendo el backfill de la migración 06). El
// Timeline las filtra con `!esBackfill` antes de renderizar; el resto del
// código puede distinguirlas si lo necesita.
// -----------------------------------------------------------------------------
export async function listAvancesByPropuesta(id: number): Promise<AvancePropuesta[]> {
  const rows = await sql<{
    id_avance: number | string;
    id_propuesta: number | string;
    avance_pct: number | string;
    nota: string;
    id_usuario: number | string | null;
    autor_email: string | null;
    es_backfill: boolean | string;
    created_at: Date | string;
  }[]>`
    SELECT av.id_avance,
           av.id_propuesta,
           av.avance_pct,
           av.nota,
           av.id_usuario,
           autor.email AS autor_email,
           av.es_backfill,
           av.created_at
    FROM   sgs_pro_propuesta_avance av
    LEFT JOIN sgs_adm_usuario autor ON autor.id_usuario = av.id_usuario
    WHERE  av.id_propuesta = ${id}
    ORDER  BY av.created_at DESC, av.id_avance DESC;
  `;
  return rows.map((r) => ({
    idAvance: pgInt(r.id_avance),
    idPropuesta: pgInt(r.id_propuesta),
    avancePct: pgInt(r.avance_pct),
    nota: pgText(r.nota),
    idUsuario: r.id_usuario == null ? null : pgInt(r.id_usuario),
    autorEmail: r.autor_email,
    esBackfill: r.es_backfill === true || r.es_backfill === "t" || r.es_backfill === "true",
    createdAt: new Date(pgText(r.created_at)),
  }));
}

// -----------------------------------------------------------------------------
// agregarAvancePropuesta — INSERT + return. Lanza con mensaje claro si viola
// CHECK (0-100) o FK a propuesta/usuario.
// -----------------------------------------------------------------------------
export async function agregarAvancePropuesta(args: {
  idPropuesta: number;
  avancePct: number;
  nota: string;
  idUsuario: number | null;
}): Promise<AvancePropuesta> {
  const rows = await sql<{
    id_avance: number | string;
    id_propuesta: number | string;
    avance_pct: number | string;
    nota: string;
    id_usuario: number | string | null;
    autor_email: string | null;
    es_backfill: boolean | string;
    created_at: Date | string;
  }[]>`
    WITH inserted AS (
      INSERT INTO sgs_pro_propuesta_avance (id_propuesta, avance_pct, nota, id_usuario)
      VALUES (${args.idPropuesta}, ${args.avancePct}, ${args.nota}, ${args.idUsuario})
      RETURNING id_avance, id_propuesta, avance_pct, nota, id_usuario, es_backfill, created_at
    )
    SELECT i.id_avance,
           i.id_propuesta,
           i.avance_pct,
           i.nota,
           i.id_usuario,
           autor.email AS autor_email,
           i.es_backfill,
           i.created_at
    FROM   inserted i
    LEFT JOIN sgs_adm_usuario autor ON autor.id_usuario = i.id_usuario;
  `;
  const r = rows[0];
  if (!r) throw new Error("Insert de avance no devolvió fila");

  // Si el backend de la propuesta está al día y el avance es 100, sincronizar
  // estado a 'Finalizada' (mejora UX sin afectar la lógica de negocio).
  if (args.avancePct === 100) {
    try {
      await sql`UPDATE sgs_pro_propuesta
                SET    estado = 'Finalizada'
                WHERE  id_propuesta = ${args.idPropuesta}
                  AND  estado <> 'Finalizada';`;
    } catch {
      // Si la columna estado no existe (migración 04 no aplicada), ignorar.
    }
  }

  return {
    idAvance: pgInt(r.id_avance),
    idPropuesta: pgInt(r.id_propuesta),
    avancePct: pgInt(r.avance_pct),
    nota: pgText(r.nota),
    idUsuario: r.id_usuario == null ? null : pgInt(r.id_usuario),
    autorEmail: r.autor_email,
    esBackfill: r.es_backfill === true || r.es_backfill === "t" || r.es_backfill === "true",
    createdAt: new Date(pgText(r.created_at)),
  };
}
