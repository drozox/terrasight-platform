// =============================================================================
// Predios CRUD (HU-TC-01) + Catálogos secundarios Veredas (HU-TC-07) y
// Propietarios (HU-TC-08).
//
// Reglas del split:
//   - Solo importa de `./_helpers`, `./types`, `../db`. Nunca de otro
//     `repos/*.ts`.
//   - `pgInt`/`pgNum`/`pgText`/`pgDate`/`sql` desde `../db`.
// =============================================================================

import { sql, pgInt, pgNum, pgText, pgDate } from "../db";
import { withFallback, isValidTelefono } from "./_helpers";
import { cached } from "./_cache";
import { accionDef, codigoAccionPara, type AccionCode } from "../acciones";
import type {
  PredioFull,
  PropietarioMini,
  PropietarioFull,
  PropietarioInput,
  VeredaMini,
  VeredaFull,
  VeredaInput,
} from "../types";

// =============================================================================
// Predios (HU-TC-01)
// =============================================================================

type PredioRow = {
  id_predio: number | string;
  nombre_predio: string;
  area_ha: number | string;
  cedula_catastral: string;
  cedula_ant: string;
  longitud_centroide: number | string;
  latitud_centroide: number | string;
  nucleo_predial: string;
  observaciones: string;
  perimetro: number | string;
  id_propietario: number | string;
  id_vereda: number | string;
};

function mapPredioRow(r: PredioRow): PredioFull {
  return {
    idPredio: pgInt(r.id_predio),
    nombrePredio: pgText(r.nombre_predio),
    areaHa: pgNum(r.area_ha),
    cedulaCatastral: pgText(r.cedula_catastral),
    cedulaAnt: pgText(r.cedula_ant),
    longitudCentroide: pgNum(r.longitud_centroide),
    latitudCentroide: pgNum(r.latitud_centroide),
    nucleoPredial: pgText(r.nucleo_predial),
    observaciones: pgText(r.observaciones),
    perimetro: pgNum(r.perimetro),
    idPropietario: pgInt(r.id_propietario),
    idVereda: pgInt(r.id_vereda),
  };
}

export async function listPredios(): Promise<PredioFull[]> {
  const rows = await sql<PredioRow[]>`
    SELECT id_predio, nombre_predio, area_ha, cedula_catastral, cedula_ant,
           longitud_centroide, latitud_centroide, nucleo_predial,
           observaciones, perimetro, id_propietario, id_vereda
    FROM   sgs_pre_predio
    ORDER  BY nombre_predio;
  `;
  return rows.map(mapPredioRow);
}

// -----------------------------------------------------------------------------
// listPrediosFiltrados — DEEPSEEK-F3 / F3.2
// Variante rica con nombre de propietario + filtros por componente/acción.
//
// IMPORTANTE (modelo de datos): sgs_pre_predio NO guarda componente/acción ni
// id_accion. El vínculo real es vía las PROPUESTAS del predio
// (sgs_pro_propuesta.id_accion → sgs_com_accion → sgs_com_componente).
// Cada predio puede tener 0..N propuestas; mostramos la primera acción (orden
// por id_accion) como su componente/acción representativa.
// -----------------------------------------------------------------------------
export type PredioFiltrado = {
  idPredio: number;
  codigo: string;
  nombrePredio: string;
  nucleoPredial: string;
  nombreVereda: string;
  nombreMunicipio: string;
  componente: string | null;      // "C1" | "C2" | "C3" | null
  accion: string | null;           // "A1" | "A2" | "U" | null (nombre en BD)
  codigoAccion: AccionCode | null; // "C1A1" .. "C3AU"
  accionLabel: string;             // "A1" | "A2" | "AU" | "—"
  areaHa: number;
  longitudCentroide: number;
  latitudCentroide: number;
  idPropietario: number;
  nombrePropietario: string;
  idVereda: number;
};

/** Etiqueta corta de acción para la tabla: C3AU → "AU"; resto → nombre BD. */
function etiquetaAccion(code: AccionCode | null, accion: string | null): string {
  if (code === "C3AU") return "AU";
  return accion ?? "—";
}

export async function listPrediosFiltrados(args: {
  componente?: string | null;
  accion?: AccionCode | null;
  q?: string | null;
}): Promise<PredioFiltrado[]> {
  const conditions = [];
  // Filtramos por las propuestas del predio (no por columnas del predio).
  if (args.componente) {
    conditions.push(sql`EXISTS (
      SELECT 1
      FROM sgs_pro_propuesta pp
      JOIN sgs_com_accion     a ON a.id_accion     = pp.id_accion
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      WHERE pp.id_predio = p.id_predio AND c.nombre = ${args.componente}
    )`);
  }
  if (args.accion) {
    const def = accionDef(args.accion);
    conditions.push(sql`EXISTS (
      SELECT 1
      FROM sgs_pro_propuesta pp
      JOIN sgs_com_accion     a ON a.id_accion     = pp.id_accion
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      WHERE pp.id_predio = p.id_predio
        AND c.nombre = ${def.componente}
        AND a.nombre IN ${sql(def.nombres)}
    )`);
  }
  if (args.q) {
    const like = "%" + args.q + "%";
    conditions.push(
      sql`(p.nombre_predio ILIKE ${like}
           OR p.cedula_catastral ILIKE ${like}
           OR p.nucleo_predial ILIKE ${like}
           OR pr.nombre_razon_social ILIKE ${like})`,
    );
  }
  const whereClause =
    conditions.length === 0
      ? sql``
      : sql`WHERE ${conditions.reduce((acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`), sql``)}`;

  const rows = await sql<
    {
      id_predio: number | string;
      codigo: string | null;
      nombre_predio: string;
      nucleo_predial: string;
      area_ha: number | string;
      longitud_centroide: number | string;
      latitud_centroide: number | string;
      id_propietario: number | string;
      nombre_propietario: string | null;
      id_vereda: number | string;
      nombre_vereda: string | null;
      nombre_municipio: string | null;
      nombre_componente: string | null;
      nombre_accion: string | null;
    }[]
  >`
    SELECT p.id_predio,
           ('PR-' || LPAD(p.id_predio::text, GREATEST(5, length(p.id_predio::text)), '0'))     AS codigo,
           p.nombre_predio,
           p.nucleo_predial,
           p.area_ha,
           p.longitud_centroide,
           p.latitud_centroide,
           p.id_propietario,
           pr.nombre_razon_social                          AS nombre_propietario,
           p.id_vereda,
           v.nombre_vereda,
           m.nombre_municipio,
           ca.nombre_componente,
           ca.nombre_accion
    FROM   sgs_pre_predio p
    LEFT JOIN sgs_pre_propietario pr ON pr.id_propietario = p.id_propietario
    LEFT JOIN bcs_lpa_vereda       v ON v.id_vereda      = p.id_vereda
    LEFT JOIN bcs_lpa_municipio    m ON m.id_municipio   = v.id_municipio
    LEFT JOIN LATERAL (
      SELECT c.nombre AS nombre_componente, a.nombre AS nombre_accion
      FROM   sgs_pro_propuesta pp
      JOIN   sgs_com_accion     a ON a.id_accion     = pp.id_accion
      JOIN   sgs_com_componente c ON c.id_componente = a.id_componente
      WHERE  pp.id_predio = p.id_predio
      ORDER  BY a.id_accion
      LIMIT  1
    ) ca ON true
    ${whereClause}
    ORDER  BY p.nombre_predio;
  `;
  return rows.map((r) => {
    const componente = r.nombre_componente ? pgText(r.nombre_componente) : null;
    const accion = r.nombre_accion ? pgText(r.nombre_accion) : null;
    const codigoAccion = codigoAccionPara(componente, accion);
    return {
      idPredio: pgInt(r.id_predio),
      codigo: r.codigo ?? `PR-${String(pgInt(r.id_predio)).padStart(5, "0")}`,
      nombrePredio: pgText(r.nombre_predio),
      nucleoPredial: pgText(r.nucleo_predial),
      nombreVereda: pgText(r.nombre_vereda ?? ""),
      nombreMunicipio: pgText(r.nombre_municipio ?? ""),
      componente,
      accion,
      codigoAccion,
      accionLabel: etiquetaAccion(codigoAccion, accion),
      areaHa: pgNum(r.area_ha),
      longitudCentroide: pgNum(r.longitud_centroide),
      latitudCentroide: pgNum(r.latitud_centroide),
      idPropietario: pgInt(r.id_propietario),
      nombrePropietario: pgText(r.nombre_propietario ?? ""),
      idVereda: pgInt(r.id_vereda),
    };
  });
}

// -----------------------------------------------------------------------------
// getPrediosKpis — conteos del encabezado (Total / C1 / C3).
// C2 se excluye: no acota por predios (se maneja por microcuencas).
// Un predio se cuenta en un componente si tiene ≥1 propuesta de ese componente.
// -----------------------------------------------------------------------------
export type PrediosKpis = { total: number; c1: number; c3: number };

export async function getPrediosKpis(): Promise<PrediosKpis> {
  const [row] = await sql<{ total: number | string; c1: number | string; c3: number | string }[]>`
    WITH pc AS (
      SELECT pp.id_predio, c.nombre AS comp
      FROM   sgs_pro_propuesta pp
      JOIN   sgs_com_accion     a ON a.id_accion     = pp.id_accion
      JOIN   sgs_com_componente c ON c.id_componente = a.id_componente
      WHERE  pp.id_predio IS NOT NULL
      GROUP  BY pp.id_predio, c.nombre
    )
    SELECT
      (SELECT count(*) FROM sgs_pre_predio)::int                       AS total,
      (SELECT count(DISTINCT id_predio) FROM pc WHERE comp = 'C1')::int AS c1,
      (SELECT count(DISTINCT id_predio) FROM pc WHERE comp = 'C3')::int AS c3
  `;
  return {
    total: pgInt(row?.total),
    c1: pgInt(row?.c1),
    c3: pgInt(row?.c3),
  };
}

export async function getPredioById(id: number): Promise<PredioFull | null> {
  // DEEPSEEK-F3.3: agregamos JOIN con propietario para que la ficha muestre
  // el nombre del propietario (no solo el ID).
  type RowConProp = {
    id_predio: number | string;
    nombre_predio: string;
    area_ha: number | string;
    cedula_catastral: string;
    cedula_ant: string;
    longitud_centroide: number | string;
    latitud_centroide: number | string;
    nucleo_predial: string;
    observaciones: string;
    perimetro: number | string;
    id_propietario: number | string;
    id_vereda: number | string;
    nombre_propietario: string | null;
    lat_calc: number | string | null;
    lon_calc: number | string | null;
  };
  const rows = (await sql`
    SELECT p.id_predio, p.nombre_predio, p.area_ha, p.cedula_catastral, p.cedula_ant,
           p.longitud_centroide, p.latitud_centroide, p.nucleo_predial,
           p.observaciones, p.perimetro, p.id_propietario, p.id_vereda,
           pr.nombre_razon_social AS nombre_propietario,
           CASE WHEN (p.latitud_centroide = 0 OR p.longitud_centroide = 0) AND p.geom IS NOT NULL
                THEN ST_Y(ST_Centroid(ST_Transform(p.geom, 4326)))
                ELSE p.latitud_centroide END AS lat_calc,
           CASE WHEN (p.latitud_centroide = 0 OR p.longitud_centroide = 0) AND p.geom IS NOT NULL
                THEN ST_X(ST_Centroid(ST_Transform(p.geom, 4326)))
                ELSE p.longitud_centroide END AS lon_calc
    FROM   sgs_pre_predio p
    LEFT JOIN sgs_pre_propietario pr ON pr.id_propietario = p.id_propietario
    WHERE  p.id_predio = ${id}
    LIMIT  1;
  `) as RowConProp[];
  if (rows.length === 0) return null;
  const r = rows[0]!;
  return {
    ...mapPredioRow(r),
    // DEEPSEEK-F3.2: si el centroide guardado es 0,0 lo derivamos del shape.
    latitudCentroide: pgNum(r.lat_calc ?? r.latitud_centroide),
    longitudCentroide: pgNum(r.lon_calc ?? r.longitud_centroide),
    nombrePropietario: pgText(r.nombre_propietario ?? ""),
  };
}

const listPropietariosImpl = async (): Promise<PropietarioMini[]> => {
  const rows = await sql<{ id_propietario: number | string; nombre_razon_social: string }[]>`
    SELECT id_propietario, nombre_razon_social
    FROM   sgs_pre_propietario
    ORDER  BY nombre_razon_social;
  `;
  return rows.map((r) => ({
    idPropietario: pgInt(r.id_propietario),
    nombreRazonSocial: pgText(r.nombre_razon_social),
  }));
};
export const listPropietarios = cached(listPropietariosImpl, {
  tags: ["catalogos:lookup"],
  ttl: 300,
});

const listVeredasImpl = async (): Promise<VeredaMini[]> => {
  const rows = await sql<{
    id_vereda: number | string;
    nombre_vereda: string;
    id_municipio: number | string;
    nombre_municipio: string;
  }[]>`
    SELECT v.id_vereda, v.nombre_vereda, v.id_municipio, m.nombre_municipio
    FROM   bcs_lpa_vereda v
    JOIN   bcs_lpa_municipio m ON m.id_municipio = v.id_municipio
    ORDER  BY m.nombre_municipio, v.nombre_vereda;
  `;
  return rows.map((r) => ({
    idVereda: pgInt(r.id_vereda),
    nombreVereda: pgText(r.nombre_vereda),
    idMunicipio: pgInt(r.id_municipio),
    nombreMunicipio: pgText(r.nombre_municipio),
  }));
};
export const listVeredas = cached(listVeredasImpl, {
  tags: ["catalogos:lookup"],
  ttl: 300,
});

export async function crearPredio(input: Omit<PredioFull, "idPredio">): Promise<PredioFull> {
  const rows = await sql<{ id_predio: number | string }[]>`
    INSERT INTO sgs_pre_predio (
      nombre_predio, area_ha, cedula_catastral, cedula_ant,
      longitud_centroide, latitud_centroide, nucleo_predial,
      observaciones, perimetro, id_propietario, id_vereda
    ) VALUES (
      ${input.nombrePredio}, ${input.areaHa}, ${input.cedulaCatastral}, ${input.cedulaAnt},
      ${input.longitudCentroide}, ${input.latitudCentroide}, ${input.nucleoPredial},
      ${input.observaciones}, ${input.perimetro}, ${input.idPropietario}, ${input.idVereda}
    )
    RETURNING id_predio;
  `;
  if (!rows[0]) throw new Error("Insert fallido");
  const fresh = await getPredioById(pgInt(rows[0].id_predio));
  if (!fresh) throw new Error("Insert OK pero no se puede releer");
  return fresh;
}

// -----------------------------------------------------------------------------
// crearPredioConShape — DEEPSEEK-F3.4 / F3.2-fix
// Recibe WKT del shape en SRID 4326 (lon/lat, como lo dibuja Leaflet) y extrae
// automáticamente:
//   - longitud_centroide / latitud_centroide (ST_Centroid sobre 4326)
//   - area_ha (ST_Area ::geography / 10000) — geography exige 4326
//   - perimetro (ST_Perimeter ::geography)
//   - geom (MULTIPOLYGON, SRID 4686) — transformado desde 4326 (migración 39)
// El WKT DEBE ser POLYGON o MULTIPOLYGON.
// -----------------------------------------------------------------------------
export async function crearPredioConShape(input: {
  nombrePredio: string;
  cedulaCatastral: string;
  cedulaAnt: string;
  nucleoPredial: string;
  idPropietario: number;
  idVereda: number;
  shapeWkt: string;
  observaciones?: string;
}): Promise<PredioFull> {
  const rows = await sql<{ id_predio: number | string }[]>`
    INSERT INTO sgs_pre_predio (
      nombre_predio, area_ha, cedula_catastral, cedula_ant,
      longitud_centroide, latitud_centroide, nucleo_predial,
      observaciones, perimetro, id_propietario, id_vereda,
      geom
    )
    SELECT
      ${input.nombrePredio},
      ST_Area(ST_GeomFromText(${input.shapeWkt}, 4326)::geography) / 10000.0,
      ${input.cedulaCatastral},
      ${input.cedulaAnt},
      ST_X(ST_Centroid(ST_GeomFromText(${input.shapeWkt}, 4326))),
      ST_Y(ST_Centroid(ST_GeomFromText(${input.shapeWkt}, 4326))),
      ${input.nucleoPredial},
      ${input.observaciones ?? ""},
      ST_Perimeter(ST_GeomFromText(${input.shapeWkt}, 4326)::geography),
      ${input.idPropietario},
      ${input.idVereda},
      ST_Multi(ST_Transform(ST_GeomFromText(${input.shapeWkt}, 4326), 4686))
    RETURNING id_predio;
  `;
  if (!rows[0]) throw new Error("Insert de predio con shape fallido");
  const fresh = await getPredioById(pgInt(rows[0].id_predio));
  if (!fresh) throw new Error("Insert OK pero no se puede releer");
  return fresh;
}

export async function actualizarPredio(
  id: number,
  input: Omit<PredioFull, "idPredio">,
): Promise<void> {
  await sql`
    UPDATE sgs_pre_predio SET
      nombre_predio       = ${input.nombrePredio},
      area_ha             = ${input.areaHa},
      cedula_catastral    = ${input.cedulaCatastral},
      cedula_ant          = ${input.cedulaAnt},
      longitud_centroide  = ${input.longitudCentroide},
      latitud_centroide   = ${input.latitudCentroide},
      nucleo_predial      = ${input.nucleoPredial},
      observaciones       = ${input.observaciones},
      perimetro           = ${input.perimetro},
      id_propietario      = ${input.idPropietario},
      id_vereda           = ${input.idVereda}
    WHERE id_predio = ${id};
  `;
}

export async function eliminarPredio(id: number): Promise<void> {
  // Verificamos que no tenga propuestas asociadas (FK logic está en BD,
  // pero queremos un mensaje útil antes del 23503).
  const propuestas = await sql<{ count: number | string }[]>`
    SELECT COUNT(*)::int AS count
    FROM   sgs_pro_propuesta
    WHERE  id_predio = ${id};
  `;
  const count = pgInt(propuestas[0]?.count);
  if (count > 0) {
    throw new Error(
      `No se puede eliminar: el predio tiene ${count} propuesta(s) asociada(s). ` +
      `Desvinculá las propuestas o agregá una columna "activo" (TODO).`,
    );
  }
  await sql`DELETE FROM sgs_pre_predio WHERE id_predio = ${id};`;
}

// =============================================================================
// HU-TC-08: Propietarios (sgs_pre_propietario) — CRUD
// =============================================================================

type PropietarioRow = {
  id_propietario: number | string;
  nombre_razon_social: string;
  telefono: string;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  total_predios: number | string;
};

function mapPropietarioRow(r: PropietarioRow): PropietarioFull {
  return {
    idPropietario: pgInt(r.id_propietario),
    nombreRazonSocial: pgText(r.nombre_razon_social),
    telefono: pgText(r.telefono),
    createdAt: pgDate(r.created_at),
    updatedAt: pgDate(r.updated_at),
    totalPredios: pgInt(r.total_predios),
  };
}

const listPropietariosFullImpl = async (): Promise<PropietarioFull[]> => {
  return withFallback("propietariosFull", async () => {
    const rows = await sql<PropietarioRow[]>`
      SELECT
        p.id_propietario,
        p.nombre_razon_social,
        p.telefono,
        p.created_at,
        p.updated_at,
        COALESCE(pr.cnt, 0)::int AS total_predios
      FROM   sgs_pre_propietario p
      LEFT JOIN (
        SELECT id_propietario, COUNT(*) AS cnt
        FROM   sgs_pre_predio
        GROUP  BY id_propietario
      ) pr ON pr.id_propietario = p.id_propietario
      ORDER  BY p.nombre_razon_social;
    `;
    return rows.map(mapPropietarioRow);
  }, []);
};
export const listPropietariosFull = cached(listPropietariosFullImpl, {
  tags: ["catalogos:full"],
  ttl: 300,
});

export async function getPropietarioById(id: number): Promise<PropietarioFull | null> {
  const rows = await sql<PropietarioRow[]>`
    SELECT
      p.id_propietario,
      p.nombre_razon_social,
      p.telefono,
      p.created_at,
      p.updated_at,
      COALESCE(pr.cnt, 0)::int AS total_predios
    FROM   sgs_pre_propietario p
    LEFT JOIN (
      SELECT id_propietario, COUNT(*) AS cnt
      FROM   sgs_pre_predio
      GROUP  BY id_propietario
    ) pr ON pr.id_propietario = p.id_propietario
    WHERE  p.id_propietario = ${id}
    LIMIT  1;
  `;
  return rows[0] ? mapPropietarioRow(rows[0]) : null;
}

export async function crearPropietario(input: PropietarioInput): Promise<PropietarioFull> {
  if (input.nombreRazonSocial.length < 2 || input.nombreRazonSocial.length > 255) {
    throw new Error("nombreRazonSocial debe tener entre 2 y 255 caracteres");
  }
  if (input.telefono !== undefined && input.telefono.length > 0 && !isValidTelefono(input.telefono)) {
    throw new Error("telefono invalido (7-20 chars, permite digitos, espacios, guiones, + y ())");
  }
  const telefono = input.telefono ?? "";
  const rows = await sql<{ id_propietario: number | string }[]>`
    INSERT INTO sgs_pre_propietario (nombre_razon_social, telefono)
    VALUES (${input.nombreRazonSocial}, ${telefono})
    ON CONFLICT (nombre_razon_social) DO UPDATE
      SET telefono = EXCLUDED.telefono
    RETURNING id_propietario;
  `;
  if (!rows[0]) throw new Error("Insert/upsert de propietario fallido");
  const fresh = await getPropietarioById(pgInt(rows[0].id_propietario));
  if (!fresh) throw new Error("Propietario no se puede releer tras upsert");
  return fresh;
}

export async function actualizarPropietario(
  id: number,
  input: PropietarioInput,
): Promise<void> {
  if (input.nombreRazonSocial.length < 2 || input.nombreRazonSocial.length > 255) {
    throw new Error("nombreRazonSocial debe tener entre 2 y 255 caracteres");
  }
  if (input.telefono !== undefined && input.telefono.length > 0 && !isValidTelefono(input.telefono)) {
    throw new Error("telefono invalido (7-20 chars, permite digitos, espacios, guiones, + y ())");
  }
  const telefono = input.telefono ?? "";
  await sql`
    UPDATE sgs_pre_propietario
    SET    nombre_razon_social = ${input.nombreRazonSocial},
           telefono            = ${telefono}
    WHERE  id_propietario = ${id};
  `;
}

export async function eliminarPropietario(id: number): Promise<void> {
  const check = await sql<{ predios: number | string }[]>`
    SELECT COUNT(*)::int AS predios
    FROM   sgs_pre_predio
    WHERE  id_propietario = ${id};
  `;
  const predios = pgInt(check[0]?.predios);
  if (predios > 0) {
    throw new Error(
      `No se puede eliminar: hay ${predios} predio(s) asociado(s) a este propietario. ` +
      `Reasignalos a otro propietario primero.`,
    );
  }
  await sql`DELETE FROM sgs_pre_propietario WHERE id_propietario = ${id};`;
}

// =============================================================================
// HU-TC-07: Veredas (bcs_lpa_vereda) — CRUD
// =============================================================================

type VeredaRow = {
  id_vereda: number | string;
  nombre_vereda: string;
  codigo_administrativo: string;
  poblacion_estimada: number | string;
  id_municipio: number | string;
  nombre_municipio: string | null;
  departamento: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  total_predios: number | string;
};

function mapVeredaRow(r: VeredaRow): VeredaFull {
  return {
    idVereda: pgInt(r.id_vereda),
    nombreVereda: pgText(r.nombre_vereda),
    codigoAdministrativo: pgText(r.codigo_administrativo),
    poblacionEstimada: pgInt(r.poblacion_estimada),
    idMunicipio: pgInt(r.id_municipio),
    nombreMunicipio: r.nombre_municipio ?? null,
    departamento: r.departamento ?? null,
    createdAt: pgDate(r.created_at),
    updatedAt: pgDate(r.updated_at),
    totalPredios: pgInt(r.total_predios),
  };
}

const listVeredasFullImpl = async (): Promise<VeredaFull[]> => {
  return withFallback("veredasFull", async () => {
    const rows = await sql<VeredaRow[]>`
      SELECT
        v.id_vereda,
        v.nombre_vereda,
        v.codigo_administrativo,
        v.poblacion_estimada,
        v.id_municipio,
        m.nombre_municipio,
        m.departamento,
        v.created_at,
        v.updated_at,
        COALESCE(p.cnt, 0)::int AS total_predios
      FROM   bcs_lpa_vereda     v
      JOIN   bcs_lpa_municipio  m ON m.id_municipio = v.id_municipio
      LEFT JOIN (
        SELECT id_vereda, COUNT(*) AS cnt
        FROM   sgs_pre_predio
        GROUP  BY id_vereda
      ) p ON p.id_vereda = v.id_vereda
      ORDER  BY m.nombre_municipio, v.nombre_vereda;
    `;
    return rows.map(mapVeredaRow);
  }, []);
};
export const listVeredasFull = cached(listVeredasFullImpl, {
  tags: ["catalogos:full"],
  ttl: 300,
});

export async function getVeredaById(id: number): Promise<VeredaFull | null> {
  const rows = await sql<VeredaRow[]>`
    SELECT
      v.id_vereda,
      v.nombre_vereda,
      v.codigo_administrativo,
      v.poblacion_estimada,
      v.id_municipio,
      m.nombre_municipio,
      m.departamento,
      v.created_at,
      v.updated_at,
      COALESCE(p.cnt, 0)::int AS total_predios
    FROM   bcs_lpa_vereda     v
    JOIN   bcs_lpa_municipio  m ON m.id_municipio = v.id_municipio
    LEFT JOIN (
      SELECT id_vereda, COUNT(*) AS cnt
      FROM   sgs_pre_predio
      GROUP  BY id_vereda
    ) p ON p.id_vereda = v.id_vereda
    WHERE  v.id_vereda = ${id}
    LIMIT  1;
  `;
  return rows[0] ? mapVeredaRow(rows[0]) : null;
}

export async function crearVereda(input: VeredaInput): Promise<VeredaFull> {
  if (input.nombreVereda.length < 2 || input.nombreVereda.length > 255) {
    throw new Error("nombreVereda debe tener entre 2 y 255 caracteres");
  }
  if (input.codigoAdministrativo.length < 1 || input.codigoAdministrativo.length > 50) {
    throw new Error("codigoAdministrativo debe tener entre 1 y 50 caracteres");
  }
  if (input.poblacionEstimada !== undefined && input.poblacionEstimada < 0) {
    throw new Error("poblacionEstimada debe ser >= 0");
  }
  const rows = await sql<{ id_vereda: number | string }[]>`
    INSERT INTO bcs_lpa_vereda (nombre_vereda, codigo_administrativo, poblacion_estimada, id_municipio)
    VALUES (
      ${input.nombreVereda},
      ${input.codigoAdministrativo},
      ${input.poblacionEstimada ?? 0},
      ${input.idMunicipio}
    )
    ON CONFLICT (id_municipio, nombre_vereda) DO UPDATE
      SET codigo_administrativo = EXCLUDED.codigo_administrativo
    RETURNING id_vereda;
  `;
  if (!rows[0]) throw new Error("Insert/upsert de vereda fallido");
  const fresh = await getVeredaById(pgInt(rows[0].id_vereda));
  if (!fresh) throw new Error("Vereda no se puede releer tras upsert");
  return fresh;
}

export async function actualizarVereda(
  id: number,
  input: VeredaInput,
): Promise<void> {
  if (input.nombreVereda.length < 2 || input.nombreVereda.length > 255) {
    throw new Error("nombreVereda debe tener entre 2 y 255 caracteres");
  }
  if (input.codigoAdministrativo.length < 1 || input.codigoAdministrativo.length > 50) {
    throw new Error("codigoAdministrativo debe tener entre 1 y 50 caracteres");
  }
  if (input.poblacionEstimada !== undefined && input.poblacionEstimada < 0) {
    throw new Error("poblacionEstimada debe ser >= 0");
  }
  await sql`
    UPDATE bcs_lpa_vereda
    SET    nombre_vereda          = ${input.nombreVereda},
           codigo_administrativo  = ${input.codigoAdministrativo},
           poblacion_estimada     = ${input.poblacionEstimada ?? 0},
           id_municipio           = ${input.idMunicipio}
    WHERE  id_vereda = ${id};
  `;
}

export async function eliminarVereda(id: number): Promise<void> {
  const check = await sql<{ predios: number | string }[]>`
    SELECT COUNT(*)::int AS predios
    FROM   sgs_pre_predio
    WHERE  id_vereda = ${id};
  `;
  const predios = pgInt(check[0]?.predios);
  if (predios > 0) {
    throw new Error(
      `No se puede eliminar: hay ${predios} predio(s) en esta vereda. ` +
      `Reasignalos a otra vereda primero.`,
    );
  }
  await sql`DELETE FROM bcs_lpa_vereda WHERE id_vereda = ${id};`;
}
