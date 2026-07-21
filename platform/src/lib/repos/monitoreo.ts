// =============================================================================
// Monitoreo (HU-MO-01..03) + Catálogo Beneficiarios (HU-TC-10)
//
//   - Puntos de obra captacion, estacion limnimetrica, bebedero, tanque y
//     panel_solar. Cada punto vive en sgs_pro_propuesta_punto y hereda de
//     sgs_pro_propuesta (1:1 por id_propuesta UNIQUE), que a su vez cuelga de
//     sgs_pre_predio y sgs_com_accion/componente.
//   - Decisiones:
//       - `estado` se lee de sgs_pro_propuesta (unica fuente de verdad).
//       - `geom` puede ser NULL; el JOIN con sgs_pro_propuesta_punto ya tiene
//         este/norte como numeric (fuente confiable). ST_X/ST_Y se exponen
//         como lon/lat cuando el geom existe (casi nunca en la BD actual).
//       - Beneficiarios via sgs_pre_usuario + sgs_rel_propuesta_punto_usuario.
//       - withFallback SOLO en KPIs y listMonitoreoPuntos: la ficha / edicion
//         deben fallar duro si la BD no responde (single-record y mutaciones).
//
// Reglas del split:
//   - Solo importa de `./_helpers`, `./types`, `./constants`, `../db`. Nunca
//     de otro `repos/*.ts`.
// =============================================================================

import { sql, pgInt, pgNum, pgText, pgDate } from "../db";
import { withFallback, isValidTelefono } from "./_helpers";
import { cached } from "./_cache";
import { TIPOS_PUNTO, isTipoPunto } from "../constants";
import type {
  MonitoreoPunto,
  MonitoreoKpis,
  BeneficiarioFull,
  BeneficiarioMini,
  BeneficiarioInput,
  EstadoIntervencion,
} from "../types";

// =============================================================================
// Helpers internos (row type + mapper compartido por las queries de puntos)
// =============================================================================
type MonitoreoRow = {
  id_prop_punto: number | string;
  id_propuesta: number | string;
  actividad: string;
  descripcion: string;
  tipo_punto: string;
  tipo_obra: number | string;
  estructura_anclaje: boolean | string;
  nivel_complejidad: string;
  id_estacion_original: string;
  cod_tipo: string;
  codigo_caj: string;
  este: number | string;
  norte: number | string;
  lon: number | string | null;
  lat: number | string | null;
  id_quebrada: number | string | null;
  nombre_quebrada: string | null;
  id_predio: number | string;
  nombre_predio: string;
  id_vereda: number | string | null;
  nombre_vereda: string | null;
  id_municipio: number | string | null;
  nombre_municipio: string | null;
  id_accion: number | string;
  nombre_accion: string;
  id_componente: number | string;
  nombre_componente: string;
  estado: string;
  total_beneficiarios: number | string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
};

function mapMonitoreoRow(r: MonitoreoRow): MonitoreoPunto {
  const dbEstado = pgText(r.estado);
  const estado: EstadoIntervencion =
    dbEstado === "Pendiente" || dbEstado === "Finalizada" ? dbEstado : "En ejecución";
  return {
    idPropPunto: pgInt(r.id_prop_punto),
    idPropuesta: pgInt(r.id_propuesta),
    actividad: pgText(r.actividad),
    descripcion: pgText(r.descripcion),
    tipoPunto: pgText(r.tipo_punto) as MonitoreoPunto["tipoPunto"],
    tipoObra: pgInt(r.tipo_obra),
    estructuraAnclaje: r.estructura_anclaje === true || r.estructura_anclaje === "t" || r.estructura_anclaje === "true",
    nivelComplejidad: pgText(r.nivel_complejidad),
    idEstacionOriginal: pgText(r.id_estacion_original),
    codTipo: pgText(r.cod_tipo),
    codigoCaj: pgText(r.codigo_caj),
    este: pgNum(r.este),
    norte: pgNum(r.norte),
    lon: r.lon == null ? null : pgNum(r.lon),
    lat: r.lat == null ? null : pgNum(r.lat),
    idQuebrada: r.id_quebrada == null ? null : pgInt(r.id_quebrada),
    nombreQuebrada: r.nombre_quebrada ?? null,
    idPredio: pgInt(r.id_predio),
    codigoPredio: "PR-" + String(pgInt(r.id_predio)).padStart(5, "0"),
    nombrePredio: pgText(r.nombre_predio),
    nombreMunicipio: r.nombre_municipio ?? null,
    nombreVereda: r.nombre_vereda ?? null,
    idAccion: pgInt(r.id_accion),
    nombreAccion: pgText(r.nombre_accion),
    idComponente: pgInt(r.id_componente),
    nombreComponente: pgText(r.nombre_componente),
    estadoPropuesta: estado,
    totalBeneficiarios: pgInt(r.total_beneficiarios ?? 0),
    createdAt: pgDate(r.created_at),
    updatedAt: pgDate(r.updated_at),
  };
}

const MONITOREO_BASE_SELECT = sql`
  SELECT
    pp.id_prop_punto,
    pp.id_propuesta,
    pp.actividad,
    pp.descripcion,
    pp.tipo_punto,
    pp.tipo_obra,
    pp.estructura_anclaje,
    pp.nivel_complejidad,
    pp.id_estacion_original,
    pp.cod_tipo,
    pp.codigo_caj,
    pp.este,
    pp.norte,
    pp.id_quebrada,
    q.nombre_quebrada,
    p.id_predio,
    pr.nombre_predio,
    pr.id_vereda,
    v.nombre_vereda,
    m.id_municipio,
    m.nombre_municipio,
    a.id_accion,
    a.nombre      AS nombre_accion,
    c.id_componente,
    c.nombre      AS nombre_componente,
    p.estado,
    COALESCE(b.cnt, 0)::int   AS total_beneficiarios,
    pp.created_at,
    pp.updated_at
  FROM   sgs_pro_propuesta_punto pp
  JOIN   sgs_pro_propuesta           p   ON p.id_propuesta     = pp.id_propuesta
  JOIN   sgs_com_accion              a   ON a.id_accion        = p.id_accion
  JOIN   sgs_com_componente          c   ON c.id_componente    = a.id_componente
  JOIN   sgs_pre_predio              pr  ON pr.id_predio       = p.id_predio
  LEFT JOIN bcs_lpa_vereda           v   ON v.id_vereda        = pr.id_vereda
  LEFT JOIN bcs_lpa_municipio        m   ON m.id_municipio     = v.id_municipio
  LEFT JOIN bcs_dh_quebrada          q   ON q.id_quebrada      = pp.id_quebrada
  LEFT JOIN (
    SELECT id_prop_punto, COUNT(*) AS cnt
    FROM   sgs_rel_propuesta_punto_usuario
    GROUP  BY id_prop_punto
  )                                  b   ON b.id_prop_punto    = pp.id_prop_punto
`;

// =============================================================================
// getMonitoreoKPIs — totales por tipo, por componente, beneficiarios unicos.
// =============================================================================
const getMonitoreoKPIsImpl = async (): Promise<MonitoreoKpis> => {
  return withFallback("monitoreoKPIs", async () => {
    const [porTipoRows, porCompRows, totalBenefRows] = await Promise.all([
      sql<{ tipo_punto: string; cnt: number | string }[]>`
        SELECT tipo_punto, COUNT(*)::int AS cnt
        FROM   sgs_pro_propuesta_punto
        GROUP  BY tipo_punto;
      `,
      sql<{ comp: string; cnt: number | string }[]>`
        SELECT c.nombre AS comp, COUNT(DISTINCT pp.id_prop_punto)::int AS cnt
        FROM   sgs_pro_propuesta_punto pp
        JOIN   sgs_pro_propuesta   p ON p.id_propuesta = pp.id_propuesta
        JOIN   sgs_com_accion      a ON a.id_accion    = p.id_accion
        JOIN   sgs_com_componente  c ON c.id_componente = a.id_componente
        GROUP  BY c.nombre;
      `,
      sql<{ total: number | string }[]>`
        SELECT COUNT(DISTINCT id_usuario)::int AS total
        FROM   sgs_rel_propuesta_punto_usuario;
      `,
    ]);

    // Inicializamos los 5 tipos en 0 para que la UI siempre tenga todas las
    // claves (suma 100% de cobertura aunque no haya puntos de un tipo).
    const porTipo: Record<MonitoreoPunto["tipoPunto"], number> = {
      obra_captacion: 0,
      estacion_limnimetrica: 0,
      bebedero: 0,
      tanque: 0,
      panel_solar: 0,
    };
    let totalPuntos = 0;
    for (const r of porTipoRows) {
      const cnt = pgInt(r.cnt);
      if (isTipoPunto(r.tipo_punto)) {
        porTipo[r.tipo_punto] += cnt;
      }
      totalPuntos += cnt;
    }

    const porComponente: Record<string, number> = {};
    for (const r of porCompRows) {
      porComponente[pgText(r.comp)] = pgInt(r.cnt);
    }

    return {
      totalPuntos,
      porTipo,
      totalBeneficiarios: pgInt(totalBenefRows[0]?.total ?? 0),
      porComponente,
    };
  }, {
    totalPuntos: 0,
    porTipo: {
      obra_captacion: 0,
      estacion_limnimetrica: 0,
      bebedero: 0,
      tanque: 0,
      panel_solar: 0,
    },
    totalBeneficiarios: 0,
    porComponente: {},
  });
};
export const getMonitoreoKPIs = cached(getMonitoreoKPIsImpl, {
  tags: ["monitoreo"],
  ttl: 60,
});

// =============================================================================
// listMonitoreoPuntos — listado paginado con todos los joins + filtros.
// =============================================================================
const listMonitoreoPuntosImpl = async (
  opts: {
    tipo?: MonitoreoPunto["tipoPunto"] | null;
    componente?: string | null;
    q?: string | null;
    limit?: number;
  } = {},
): Promise<MonitoreoPunto[]> => {
  return withFallback("monitoreoPuntos", async () => {
    const whereParts: ReturnType<typeof sql>[] = [];
    if (opts.tipo) whereParts.push(sql`pp.tipo_punto = ${opts.tipo}`);
    if (opts.componente) whereParts.push(sql`c.nombre = ${opts.componente}`);
    if (opts.q && opts.q.trim().length > 0) {
      const like = "%" + opts.q.trim() + "%";
      whereParts.push(
        sql`(pp.actividad ILIKE ${like} OR pp.descripcion ILIKE ${like} OR pr.nombre_predio ILIKE ${like})`,
      );
    }
    const whereSql = whereParts.length === 0
      ? sql``
      : sql`WHERE ${whereParts.reduce((acc, p, i) => (i === 0 ? p : sql`${acc} AND ${p}`))}`;

    const limit = opts.limit ?? 200;
    const rows = await sql<MonitoreoRow[]>`
      ${MONITOREO_BASE_SELECT}
      ${whereSql}
      ORDER BY pp.id_prop_punto DESC
      LIMIT  ${limit};
    `;
    return rows.map(mapMonitoreoRow);
  }, []);
};
export const listMonitoreoPuntos = cached(listMonitoreoPuntosImpl, {
  tags: ["monitoreo"],
  ttl: 60,
});

// =============================================================================
// getMonitoreoPuntoById — ficha detallada (sin fallback, debe fallar duro).
// =============================================================================
export async function getMonitoreoPuntoById(id: number): Promise<MonitoreoPunto | null> {
  const rows = await sql<MonitoreoRow[]>`
    ${MONITOREO_BASE_SELECT}
    WHERE  pp.id_prop_punto = ${id}
    LIMIT  1;
  `;
  return rows[0] ? mapMonitoreoRow(rows[0]) : null;
}

// =============================================================================
// listBeneficiariosByPunto — usuarios asociados a un punto.
// =============================================================================
export async function listBeneficiariosByPunto(id: number): Promise<BeneficiarioMini[]> {
  const rows = await sql<{
    id_usuario: number | string;
    nombre: string;
    telefono: string;
    vereda: string;
    municipio: string;
  }[]>`
    SELECT u.id_usuario, u.nombre, u.telefono, u.vereda, u.municipio
    FROM   sgs_pre_usuario u
    JOIN   sgs_rel_propuesta_punto_usuario r ON r.id_usuario = u.id_usuario
    WHERE  r.id_prop_punto = ${id}
    ORDER  BY u.nombre;
  `;
  return rows.map((r) => ({
    idUsuario: pgInt(r.id_usuario),
    nombre: pgText(r.nombre),
    telefono: pgText(r.telefono),
    vereda: pgText(r.vereda),
    municipio: pgText(r.municipio),
  }));
}

// =============================================================================
// listBeneficiariosDisponiblesByPunto — usuarios NO asociados (selector).
// =============================================================================
export async function listBeneficiariosDisponiblesByPunto(
  id: number,
): Promise<BeneficiarioMini[]> {
  const rows = await sql<{
    id_usuario: number | string;
    nombre: string;
    telefono: string;
    vereda: string;
    municipio: string;
  }[]>`
    SELECT u.id_usuario, u.nombre, u.telefono, u.vereda, u.municipio
    FROM   sgs_pre_usuario u
    WHERE  u.id_usuario NOT IN (
      SELECT id_usuario
      FROM   sgs_rel_propuesta_punto_usuario
      WHERE  id_prop_punto = ${id}
    )
    ORDER  BY u.nombre
    LIMIT  200;
  `;
  return rows.map((r) => ({
    idUsuario: pgInt(r.id_usuario),
    nombre: pgText(r.nombre),
    telefono: pgText(r.telefono),
    vereda: pgText(r.vereda),
    municipio: pgText(r.municipio),
  }));
}

// =============================================================================
// actualizarPunto — UPDATE dinamico solo de los campos provistos.
// Si todos son undefined, no-op. Captura CHECK (23514) y FK (23503).
// =============================================================================
export async function actualizarPunto(
  id: number,
  fields: {
    actividad?: string;
    descripcion?: string;
    tipoPunto?: MonitoreoPunto["tipoPunto"];
    tipoObra?: number;
    estructuraAnclaje?: boolean;
    nivelComplejidad?: string;
    idEstacionOriginal?: string;
    codTipo?: string;
    codigoCaj?: string;
  },
): Promise<void> {
  // Whitelist defensiva (los `undefined` se ignoran)
  if (fields.tipoPunto !== undefined && !isTipoPunto(fields.tipoPunto)) {
    throw new Error(`tipoPunto inválido: ${fields.tipoPunto}`);
  }
  if (fields.tipoObra !== undefined && ![1, 2, 3].includes(fields.tipoObra)) {
    throw new Error(`tipoObra debe ser 1, 2 o 3 (recibido: ${fields.tipoObra})`);
  }

  // UPDATE dinamico con SETs opcionales. Usamos una sola transaccion implicita
  // del lado postgres-js.
  if (fields.actividad !== undefined) {
    await sql`UPDATE sgs_pro_propuesta_punto SET actividad = ${fields.actividad} WHERE id_prop_punto = ${id};`;
  }
  if (fields.descripcion !== undefined) {
    await sql`UPDATE sgs_pro_propuesta_punto SET descripcion = ${fields.descripcion} WHERE id_prop_punto = ${id};`;
  }
  if (fields.tipoPunto !== undefined) {
    await sql`UPDATE sgs_pro_propuesta_punto SET tipo_punto = ${fields.tipoPunto} WHERE id_prop_punto = ${id};`;
  }
  if (fields.tipoObra !== undefined) {
    await sql`UPDATE sgs_pro_propuesta_punto SET tipo_obra = ${fields.tipoObra} WHERE id_prop_punto = ${id};`;
  }
  if (fields.estructuraAnclaje !== undefined) {
    await sql`UPDATE sgs_pro_propuesta_punto SET estructura_anclaje = ${fields.estructuraAnclaje} WHERE id_prop_punto = ${id};`;
  }
  if (fields.nivelComplejidad !== undefined) {
    await sql`UPDATE sgs_pro_propuesta_punto SET nivel_complejidad = ${fields.nivelComplejidad} WHERE id_prop_punto = ${id};`;
  }
  if (fields.idEstacionOriginal !== undefined) {
    await sql`UPDATE sgs_pro_propuesta_punto SET id_estacion_original = ${fields.idEstacionOriginal} WHERE id_prop_punto = ${id};`;
  }
  if (fields.codTipo !== undefined) {
    await sql`UPDATE sgs_pro_propuesta_punto SET cod_tipo = ${fields.codTipo} WHERE id_prop_punto = ${id};`;
  }
  if (fields.codigoCaj !== undefined) {
    await sql`UPDATE sgs_pro_propuesta_punto SET codigo_caj = ${fields.codigoCaj} WHERE id_prop_punto = ${id};`;
  }
}

// =============================================================================
// asociarBeneficiario — INSERT ... ON CONFLICT DO NOTHING (silencioso).
// =============================================================================
export async function asociarBeneficiario(
  idPropPunto: number,
  idUsuario: number,
): Promise<void> {
  await sql`
    INSERT INTO sgs_rel_propuesta_punto_usuario (id_prop_punto, id_usuario)
    VALUES (${idPropPunto}, ${idUsuario})
    ON CONFLICT DO NOTHING;
  `;
}

// =============================================================================
// desasociarBeneficiario — DELETE por PK compuesta.
// =============================================================================
export async function desasociarBeneficiario(
  idPropPunto: number,
  idUsuario: number,
): Promise<void> {
  await sql`
    DELETE FROM sgs_rel_propuesta_punto_usuario
    WHERE  id_prop_punto = ${idPropPunto}
      AND  id_usuario    = ${idUsuario};
  `;
}

// =============================================================================
// HU-TC-10: Beneficiarios (sgs_pre_usuario)
//
// Cubre la ficha /catalogos (CRUD con UNIQUE amable) y reemplaza al viejo
// crearBeneficiario() usado por el flujo de monitoreo. Ahora devuelve
// BeneficiarioFull (con createdAt/updatedAt y contador de relaciones).
// =============================================================================

type BeneficiarioRow = {
  id_usuario: number | string;
  nombre: string;
  telefono: string;
  vereda: string;
  municipio: string;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  total_relaciones: number | string;
};

function mapBeneficiarioRow(r: BeneficiarioRow): BeneficiarioFull {
  return {
    idUsuario: pgInt(r.id_usuario),
    nombre: pgText(r.nombre),
    telefono: pgText(r.telefono),
    vereda: pgText(r.vereda),
    municipio: pgText(r.municipio),
    createdAt: pgDate(r.created_at),
    updatedAt: pgDate(r.updated_at),
    totalRelaciones: pgInt(r.total_relaciones),
  };
}

const listBeneficiariosFullImpl = async (): Promise<BeneficiarioFull[]> => {
  return withFallback("beneficiariosFull", async () => {
    const rows = await sql<BeneficiarioRow[]>`
      SELECT
        u.id_usuario,
        u.nombre,
        u.telefono,
        u.vereda,
        u.municipio,
        u.created_at,
        u.updated_at,
        COALESCE(r.cnt, 0)::int AS total_relaciones
      FROM   sgs_pre_usuario u
      LEFT JOIN (
        SELECT id_usuario, COUNT(*) AS cnt
        FROM   sgs_rel_propuesta_punto_usuario
        GROUP  BY id_usuario
      ) r ON r.id_usuario = u.id_usuario
      ORDER  BY u.nombre;
    `;
    return rows.map(mapBeneficiarioRow);
  }, []);
};
export const listBeneficiariosFull = cached(listBeneficiariosFullImpl, {
  tags: ["catalogos:full", "monitoreo"],
  ttl: 300,
});

export async function getBeneficiarioById(id: number): Promise<BeneficiarioFull | null> {
  const rows = await sql<BeneficiarioRow[]>`
    SELECT
      u.id_usuario,
      u.nombre,
      u.telefono,
      u.vereda,
      u.municipio,
      u.created_at,
      u.updated_at,
      COALESCE(r.cnt, 0)::int AS total_relaciones
    FROM   sgs_pre_usuario u
    LEFT JOIN (
      SELECT id_usuario, COUNT(*) AS cnt
      FROM   sgs_rel_propuesta_punto_usuario
      GROUP  BY id_usuario
    ) r ON r.id_usuario = u.id_usuario
    WHERE  u.id_usuario = ${id}
    LIMIT  1;
  `;
  return rows[0] ? mapBeneficiarioRow(rows[0]) : null;
}

/**
 * crearBeneficiario — UPSERT amable con ON CONFLICT (nombre, telefono).
 *
 * IMPORTANTE: si `telefono` viene vacio, NO se puede aplicar ON CONFLICT
 * (la PK del UNIQUE lo incluye). Devolvemos error explicito para que la
 * UI pida un telefono no-vacio.
 *
 * Reemplaza la version anterior (de HU-MO) que retornaba BeneficiarioMini.
 * Quien la use sigue recibiendo idUsuario/nombre (compatible hacia atras).
 */
export async function crearBeneficiario(input: BeneficiarioInput): Promise<BeneficiarioFull> {
  if (input.nombre.length < 2 || input.nombre.length > 255) {
    throw new Error("nombre debe tener entre 2 y 255 caracteres");
  }
  const telefono = input.telefono ?? "";
  if (telefono.length > 0 && !isValidTelefono(telefono)) {
    throw new Error("telefono invalido (7-20 chars, permite digitos, espacios, guiones, + y ())");
  }
  if (telefono.length === 0) {
    throw new Error(
      "telefono es obligatorio para beneficiario (el UNIQUE (nombre, telefono) lo requiere)",
    );
  }
  const vereda = input.vereda ?? "";
  const municipio = input.municipio ?? "";

  const rows = await sql<{ id_usuario: number | string }[]>`
    INSERT INTO sgs_pre_usuario (nombre, telefono, vereda, municipio)
    VALUES (${input.nombre}, ${telefono}, ${vereda}, ${municipio})
    ON CONFLICT (nombre, telefono) DO UPDATE
      SET vereda = EXCLUDED.vereda,
          municipio = EXCLUDED.municipio
    RETURNING id_usuario;
  `;
  if (!rows[0]) throw new Error("Insert/upsert de beneficiario fallido");
  const fresh = await getBeneficiarioById(pgInt(rows[0].id_usuario));
  if (!fresh) throw new Error("Beneficiario no se puede releer tras upsert");
  return fresh;
}

export async function actualizarBeneficiario(
  id: number,
  input: BeneficiarioInput,
): Promise<void> {
  if (input.nombre.length < 2 || input.nombre.length > 255) {
    throw new Error("nombre debe tener entre 2 y 255 caracteres");
  }
  const telefono = input.telefono ?? "";
  if (telefono.length > 0 && !isValidTelefono(telefono)) {
    throw new Error("telefono invalido (7-20 chars, permite digitos, espacios, guiones, + y ())");
  }
  await sql`
    UPDATE sgs_pre_usuario
    SET    nombre    = ${input.nombre},
           telefono  = ${telefono},
           vereda    = ${input.vereda ?? ""},
           municipio = ${input.municipio ?? ""}
    WHERE  id_usuario = ${id};
  `;
}

export async function eliminarBeneficiario(id: number): Promise<void> {
  const check = await sql<{ relaciones: number | string }[]>`
    SELECT COUNT(*)::int AS relaciones
    FROM   sgs_rel_propuesta_punto_usuario
    WHERE  id_usuario = ${id};
  `;
  const relaciones = pgInt(check[0]?.relaciones);
  if (relaciones > 0) {
    throw new Error(
      `No se puede eliminar: el beneficiario esta asociado a ${relaciones} punto(s) de monitoreo. ` +
      `Desasocialo primero.`,
    );
  }
  await sql`DELETE FROM sgs_pre_usuario WHERE id_usuario = ${id};`;
}
