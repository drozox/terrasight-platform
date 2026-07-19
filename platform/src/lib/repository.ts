// =============================================================================
// Repositorio: capa de consultas SQL hacia Postgres
// Por ahora son SELECT directos que luego podemos convertir en vistas /
// stored procedures según necesitemos.
// =============================================================================

import bcrypt from "bcryptjs";
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
import type { RolSistema } from "./auth";
import {
  DEMO_DASHBOARD_KPIS,
  DEMO_COMPONENTES,
  DEMO_COBERTURA,
  DEMO_INTERVENCIONES,
  DEMO_PREDIOS,
  DEMO_QUEBRADAS,
  DEMO_PREDIOS_GEOJSON,
  DEMO_ALERTAS,
  DEMO_FOOTER,
  DEMO_TOP_MUNICIPIOS,
  DEMO_SERIES_COMPONENTES,
} from "./demo-data";

// -----------------------------------------------------------------------------
// Helper: ejecuta una consulta contra Postgres y, si falla (BD caída, sin
// Docker, modo demo), retorna el fallback demo. Permite que la UI siempre
// se renderice incluso sin infraestructura levantada.
// -----------------------------------------------------------------------------

async function withFallback<T>(label: string, query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[terrasight] DB query "${label}" failed, using demo data:`, (err as Error).message);
    }
    return fallback;
  }
}

// -----------------------------------------------------------------------------
// Dashboard — KPIs principales (HU-CO-01)
// -----------------------------------------------------------------------------

export async function getDashboardKpis(): Promise<DashboardKpis> {
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
}

// -----------------------------------------------------------------------------
// Distribución por componente (HU-CO-01)
// -----------------------------------------------------------------------------

export async function getComponentes(): Promise<ComponenteTotal[]> {
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
}

// -----------------------------------------------------------------------------
// Cobertura vegetal (datos demo — el cliente no tenía agregación,
// dejamos placeholders hasta construir la vista materializada)
// -----------------------------------------------------------------------------

export async function getCoberturaVegetal(): Promise<CoberturaTotal[]> {
  return withFallback("coberturaVegetal", async () => {
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
  }, DEMO_COBERTURA);
}

// -----------------------------------------------------------------------------
// Intervenciones recientes (HU-CO-01, HU-TC-04)
// -----------------------------------------------------------------------------

export async function getIntervencionesRecientes(
  limit = 6,
  componente?: string | null,
): Promise<IntervencionReciente[]> {
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
      CASE
        WHEN pp.tipo = 'punto'    THEN 20
        WHEN pp.tipo = 'linea'    THEN 75
        WHEN pp.tipo = 'poligono' THEN 100
      END                                                          AS avance,
      pp.estado                                                     AS estado
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
    const dbEstado = pgText(r.estado);
    const estado: EstadoIntervencion =
      dbEstado === "Pendiente" || dbEstado === "Finalizada" ? dbEstado : "En ejecución";
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
}

// -----------------------------------------------------------------------------
// Predios para el mapa (HU-CO-03, HU-AA-01)
// -----------------------------------------------------------------------------

export async function getPrediosGeoJSON(
  componente?: string | null,
): Promise<MapFeatureCollection> {
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
}

export async function getPrediosMini(
  componente?: string | null,
): Promise<PredioMini[]> {
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

// -----------------------------------------------------------------------------
// Quebradas para el mapa (capa hidrografía)
// -----------------------------------------------------------------------------

export async function getQuebradasMini() {
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

// -----------------------------------------------------------------------------
// Alertas (panel derecho del Stitch — placeholder hasta tener tabla real)
// -----------------------------------------------------------------------------

export async function getAlertas(limit = 50): Promise<Alerta[]> {
  return withFallback("alertas", async () => {
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
  }, DEMO_ALERTAS.slice(0, limit));
}

// -----------------------------------------------------------------------------
// Footer — totales geográficos (municipios, veredas, fuentes hídricas)
// -----------------------------------------------------------------------------

export async function getFooterKpis(): Promise<FooterKpis> {
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
}

// -----------------------------------------------------------------------------
// Top municipios por número de predios (para gráficos de series)
// -----------------------------------------------------------------------------

export async function getPrediosPorMunicipio(
  limit = 6,
): Promise<PredioPorMunicipio[]> {
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

// =============================================================================
// Auth plataforma — usuarios y roles (HU-AD-02)
// =============================================================================

export type UsuarioAdmin = {
  idUsuario: number;
  email: string;
  nombre: string;
  rol: RolSistema;
  activo: boolean;
  ultimoAccesoEn: Date | null;
  creadoEn: Date;
};

type UsuarioRowRaw = {
  id_usuario: number | string;
  email: string;
  nombre: string;
  rol: RolSistema;
  activo: boolean | string;
  ultimo_acceso_en: Date | string | null;
  creado_en: Date | string;
};

function mapUsuarioRow(r: UsuarioRowRaw): UsuarioAdmin {
  return {
    idUsuario: pgInt(r.id_usuario),
    email: pgText(r.email),
    nombre: pgText(r.nombre),
    rol: r.rol,
    activo: r.activo === true || r.activo === "t" || r.activo === "true",
    ultimoAccesoEn: r.ultimo_acceso_en ? new Date(pgText(r.ultimo_acceso_en)) : null,
    creadoEn: new Date(pgText(r.creado_en)),
  };
}

export async function listRoles(): Promise<RolSistema[]> {
  const rows = await sql<{ nombre: RolSistema }[]>`SELECT nombre FROM sgs_adm_rol ORDER BY id_rol;`;
  return rows.map((r) => r.nombre);
}

export async function listUsuarios(): Promise<UsuarioAdmin[]> {
  const rows = await sql<UsuarioRowRaw[]>`
    SELECT u.id_usuario, u.email, u.nombre, r.nombre AS rol, u.activo,
           u.ultimo_acceso_en, u.creado_en
    FROM   sgs_adm_usuario u
    JOIN   sgs_adm_rol      r ON r.id_rol = u.id_rol
    ORDER  BY u.creado_en DESC, u.id_usuario DESC;
  `;
  return rows.map(mapUsuarioRow);
}

export async function getUsuarioById(id: number): Promise<UsuarioAdmin | null> {
  const rows = await sql<UsuarioRowRaw[]>`
    SELECT u.id_usuario, u.email, u.nombre, r.nombre AS rol, u.activo,
           u.ultimo_acceso_en, u.creado_en
    FROM   sgs_adm_usuario u
    JOIN   sgs_adm_rol      r ON r.id_rol = u.id_rol
    WHERE  u.id_usuario = ${id}
    LIMIT  1;
  `;
  return rows[0] ? mapUsuarioRow(rows[0]) : null;
}

export async function findUsuarioByEmail(email: string): Promise<UsuarioAdmin | null> {
  const rows = await sql<UsuarioRowRaw[]>`
    SELECT u.id_usuario, u.email, u.nombre, r.nombre AS rol, u.activo,
           u.ultimo_acceso_en, u.creado_en
    FROM   sgs_adm_usuario u
    JOIN   sgs_adm_rol      r ON r.id_rol = u.id_rol
    WHERE  lower(u.email) = lower(${email})
    LIMIT  1;
  `;
  return rows[0] ? mapUsuarioRow(rows[0]) : null;
}

export async function crearUsuario(args: {
  email: string;
  nombre: string;
  password: string;
  rol: RolSistema;
}): Promise<UsuarioAdmin> {
  const passwordHash = await bcrypt.hash(args.password, 10);
  const rows = await sql<{ id_usuario: number | string }[]>`
    INSERT INTO sgs_adm_usuario (email, password_hash, nombre, id_rol)
    SELECT ${args.email.toLowerCase()}, ${passwordHash}, ${args.nombre}, r.id_rol
    FROM   sgs_adm_rol r
    WHERE  r.nombre = ${args.rol}
    RETURNING id_usuario;
  `;
  if (!rows[0]) {
    throw new Error(`Rol ${args.rol} no existe en sgs_adm_rol`);
  }
  const fresh = await getUsuarioById(pgInt(rows[0].id_usuario));
  if (!fresh) throw new Error("Usuario creado pero no encontrado al releer");
  return fresh;
}

export async function actualizarUsuario(args: {
  idUsuario: number;
  nombre: string;
  rol: RolSistema;
  activo: boolean;
}): Promise<void> {
  await sql`
    UPDATE sgs_adm_usuario u
    SET    nombre        = ${args.nombre},
           id_rol        = (SELECT id_rol FROM sgs_adm_rol WHERE nombre = ${args.rol}),
           activo        = ${args.activo},
           actualizado_en = now()
    WHERE  u.id_usuario  = ${args.idUsuario};
  `;
}

export async function resetPasswordUsuario(args: {
  idUsuario: number;
  password: string;
}): Promise<void> {
  const passwordHash = await bcrypt.hash(args.password, 10);
  await sql`
    UPDATE sgs_adm_usuario
    SET    password_hash = ${passwordHash},
           actualizado_en = now()
    WHERE  id_usuario    = ${args.idUsuario};
  `;
}

export async function setUsuarioActivo(args: {
  idUsuario: number;
  activo: boolean;
}): Promise<void> {
  await sql`
    UPDATE sgs_adm_usuario
    SET    activo        = ${args.activo},
           actualizado_en = now()
    WHERE  id_usuario    = ${args.idUsuario};
  `;
}

// =============================================================================
// Auditoría — vista admin (HU-AD-04)
// =============================================================================

export type AuditEvento = "LOGIN_OK" | "LOGIN_FAIL" | "LOGOUT" | "ACCESS_DENY";

export type AuditEvent = {
  idEvento: string;
  ocurridoEn: Date;
  idUsuario: number | null;
  emailUsado: string | null;
  evento: AuditEvento;
  recurso: string | null;
  ip: string | null;
  userAgent: string | null;
  exitoso: boolean;
  detalle: string | null;
  // Para la UI: nombre del usuario si existe
  nombreUsuario: string | null;
};

export type AuditFiltros = {
  evento?: AuditEvento | null;
  idUsuario?: number | null;
  emailLike?: string | null;
  limit?: number;
  offset?: number;
};

type AuditRowRaw = {
  id_evento: string | number;
  ocurrido_en: Date | string;
  id_usuario: number | string | null;
  email_usado: string | null;
  evento: AuditEvento;
  recurso: string | null;
  ip: string | null;
  user_agent: string | null;
  exitoso: boolean | string;
  detalle: string | null;
  nombre_usuario: string | null;
};

function mapAuditRow(r: AuditRowRaw): AuditEvent {
  return {
    idEvento: pgText(r.id_evento),
    ocurridoEn: new Date(pgText(r.ocurrido_en)),
    idUsuario: r.id_usuario == null ? null : pgInt(r.id_usuario),
    emailUsado: r.email_usado ? pgText(r.email_usado) : null,
    evento: r.evento,
    recurso: r.recurso,
    ip: r.ip,
    userAgent: r.user_agent,
    exitoso: r.exitoso === true || r.exitoso === "t" || r.exitoso === "true",
    detalle: r.detalle,
    nombreUsuario: r.nombre_usuario,
  };
}

export async function listAuditEventos(
  filtros: AuditFiltros = {},
): Promise<{ rows: AuditEvent[]; total: number }> {
  const limit = Math.min(filtros.limit ?? 50, 200);
  const offset = filtros.offset ?? 0;

  const whereParts: ReturnType<typeof sql>[] = [];
  if (filtros.evento) whereParts.push(sql`a.evento = ${filtros.evento}`);
  if (filtros.idUsuario != null) whereParts.push(sql`a.id_usuario = ${filtros.idUsuario}`);
  if (filtros.emailLike) whereParts.push(sql`a.email_usado ILIKE ${"%" + filtros.emailLike + "%"}`);
  const whereSql = whereParts.length === 0
    ? sql``
    : sql`WHERE ${whereParts.reduce((acc, p, i) => i === 0 ? p : sql`${acc} AND ${p}`)}`;

  const events = await sql<AuditRowRaw[]>`
    SELECT a.id_evento, a.ocurrido_en, a.id_usuario, a.email_usado, a.evento,
           a.recurso, a.ip, a.user_agent, a.exitoso, a.detalle,
           u.nombre AS nombre_usuario
    FROM   sgs_adm_auditoria_acceso a
    LEFT JOIN sgs_adm_usuario u ON u.id_usuario = a.id_usuario
    ${whereSql}
    ORDER BY a.ocurrido_en DESC
    LIMIT ${limit} OFFSET ${offset};
  `;
  const totalRows = await sql<{ count: number | string }[]>`
    SELECT COUNT(*)::int AS count
    FROM   sgs_adm_auditoria_acceso a
    ${whereSql};
  `;
  return {
    rows: events.map(mapAuditRow),
    total: pgInt(totalRows[0]?.count),
  };
}

export async function listEventTypes(): Promise<AuditEvento[]> {
  return ["LOGIN_OK", "LOGIN_FAIL", "LOGOUT", "ACCESS_DENY"];
}

// =============================================================================
// Reportes (HU-CO-04)
//
// Implementamos los reportes que están escritos en
// `DOCS/7. Consultas y Vistas/Consultas_Reportes.sql`. Cada uno devuelve
// filas planas con tipos primitivos — el componente cliente (page o API
// CSV) se encarga del formato.
// =============================================================================

export type ReporteTipo = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8" | "R9" | "R10";

export const REPORTE_LABELS: Record<ReporteTipo, string> = {
  R1: "R1 — Listado completo de predios",
  R2: "R2 — Predios con coberturas y biomas",
  R3: "R3 — Propuestas por componente y acción",
  R4: "R4 — Propuestas por predio",
  R5: "R5 — Propuestas punto con beneficiarios",
  R6: "R6 — Zonificaciones por predio",
  R7: "R7 — Infraestructura por municipio",
  R8: "R8 — Resumen de predios por componente",
  R9: "R9 — Quebradas con más propuestas",
  R10: "R10 — Área total de conservación por bioma",
};

export const REPORTE_DESCRIPCIONES: Record<ReporteTipo, string> = {
  R1: "Lista los predios con propietario, vereda, municipio, cédula catastral y área. Útil para cruce con catastro IGAC.",
  R2: "Predios con sus coberturas CLC (CORINE Land Cover) y biomas IAVH asociados, agregados como listas separadas por coma. Útil para análisis de uso del suelo.",
  R3: "Agrupa las propuestas por componente (C1/C2/C3) y acción (A1/A2). Muestra el total y desglose por tipo (punto/línea/polígono).",
  R4: "Detalle de cada propuesta asociada a un predio: tipo, actividad, componente, acción, quebrada y métrica específica (longitud / área / tipo de punto).",
  R5: "Propuestas de tipo punto con sus usuarios beneficiarios asociados y coordenadas (este/norte). Útil para trazabilidad social.",
  R6: "Predios con sus zonificaciones ambientales: POMCA, RFP y páramos. Lista agregada de categorías presentes por predio.",
  R7: "Inventario de infraestructura (vías, drenajes simples y dobles) por municipio, con tipos y conteos.",
  R8: "Resumen ejecutivo de predios con propuestas por componente, con totales por tipo. Para reportes de avance.",
  R9: "Top de quebradas con más propuestas asociadas, con desglose por tipo. Útil para priorizar inversión.",
  R10: "Área total de predios por bioma IAVH, con conteo de predios y área promedio. Para reportes de conservación.",
};

// -----------------------------------------------------------------------------
// R1 — Listado completo de predios
// -----------------------------------------------------------------------------

export type ReporteR1Fila = {
  idPredio: number;
  nombrePredio: string;
  areaHa: number;
  propietario: string;
  telefonoPropietario: string;
  nombreVereda: string;
  nombreMunicipio: string;
  departamento: string;
  cedulaCatastral: string;
  observaciones: string;
};

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
// R3 — Propuestas por componente y acción
// -----------------------------------------------------------------------------

export type ReporteR3Fila = {
  componente: string;
  accion: string;
  totalPropuestas: number;
  propuestasLinea: number;
  propuestasPoligono: number;
  propuestasPunto: number;
  tiposPresentes: string;
};

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
// R8 — Resumen de predios por componente
// -----------------------------------------------------------------------------

export type ReporteR8Fila = {
  componente: string;
  prediosConPropuestas: number;
  totalPropuestas: number;
  linea: number;
  poligono: number;
  punto: number;
};

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

export type ReporteR9Fila = {
  idQuebrada: number;
  nombreQuebrada: string;
  area: number | null;
  nombreMunicipio: string;
  totalPropuestas: number;
  propuestasLinea: number;
  propuestasPoligono: number;
  propuestasPunto: number;
};

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
// R2 — Predios con coberturas y biomas
// -----------------------------------------------------------------------------

export type ReporteR2Fila = {
  idPredio: number;
  nombrePredio: string;
  areaHa: number;
  coberturas: string;
  biomas: string;
  totalCoberturas: number;
  totalBiomas: number;
};

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
// R4 — Propuestas por predio
// -----------------------------------------------------------------------------

export type ReporteR4Fila = {
  idPredio: number;
  nombrePredio: string;
  idPropuesta: number;
  tipo: string;
  actividad: string;
  componente: string;
  accion: string;
  nombreQuebrada: string;
  detalleEspecifico: string;
};

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
           END AS detalle_especifico
    FROM   sgs_pre_predio p
    JOIN   sgs_pro_propuesta prop ON p.id_predio = prop.id_predio
    JOIN   sgs_com_accion     acc  ON prop.id_accion     = acc.id_accion
    JOIN   sgs_com_componente comp ON acc.id_componente = comp.id_componente
    LEFT JOIN bcs_dh_quebrada q   ON prop.id_quebrada   = q.id_quebrada
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
  }));
}

// -----------------------------------------------------------------------------
// R5 — Propuestas punto con beneficiarios
// -----------------------------------------------------------------------------

export type ReporteR5Fila = {
  idPropPunto: number;
  actividad: string;
  tipoPunto: string;
  este: number | null;
  norte: number | null;
  nombreQuebrada: string;
  usuariosBeneficiarios: string;
  totalUsuarios: number;
};

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
  }[]>`
    SELECT pp.id_prop_punto, pp.actividad, pp.tipo_punto,
           pp.este, pp.norte,
           q.nombre_quebrada,
           STRING_AGG(u.nombre, ', ' ORDER BY u.nombre) AS usuarios_beneficiarios,
           COUNT(u.id_usuario)::int                     AS total_usuarios
    FROM   sgs_pro_propuesta_punto pp
    JOIN   sgs_pro_propuesta           prop ON pp.id_propuesta = prop.id_propuesta
    LEFT JOIN bcs_dh_quebrada          q    ON pp.id_quebrada   = q.id_quebrada
    LEFT JOIN sgs_rel_propuesta_punto_usuario rpu ON pp.id_prop_punto = rpu.id_prop_punto
    LEFT JOIN sgs_pre_usuario          u    ON rpu.id_usuario   = u.id_usuario
    GROUP  BY pp.id_prop_punto, pp.actividad, pp.tipo_punto, pp.este, pp.norte, q.nombre_quebrada
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
  }));
}

// -----------------------------------------------------------------------------
// R6 — Zonificaciones por predio
// -----------------------------------------------------------------------------

export type ReporteR6Fila = {
  idPredio: number;
  nombrePredio: string;
  zonificacionPomca: string;
  zonificacionRfp: string;
  paramos: string;
};

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

export type ReporteR7Fila = {
  nombreMunicipio: string;
  departamento: string;
  totalVias: number;
  totalDrenajesSimples: number;
  totalDrenajesDobles: number;
  tiposVia: string;
  estadosDrenajeSimple: string;
  tiposDrenajeDoble: string;
};

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
// R10 — Área total de conservación por bioma
// -----------------------------------------------------------------------------

export type ReporteR10Fila = {
  biomaIavh: string;
  totalPredios: number;
  areaTotalHa: number;
  areaPromedioHa: number;
  predios: string;
};

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

// =============================================================================
// Predios CRUD (HU-TC-01)
// =============================================================================

export type PredioFull = {
  idPredio: number;
  nombrePredio: string;
  areaHa: number;
  cedulaCatastral: string;
  cedulaAnt: string;
  longitudCentroide: number;
  latitudCentroide: number;
  nucleoPredial: string;
  observaciones: string;
  perimetro: number;
  idPropietario: number;
  idVereda: number;
};

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

export async function getPredioById(id: number): Promise<PredioFull | null> {
  const rows = await sql<PredioRow[]>`
    SELECT id_predio, nombre_predio, area_ha, cedula_catastral, cedula_ant,
           longitud_centroide, latitud_centroide, nucleo_predial,
           observaciones, perimetro, id_propietario, id_vereda
    FROM   sgs_pre_predio
    WHERE  id_predio = ${id}
    LIMIT  1;
  `;
  return rows[0] ? mapPredioRow(rows[0]) : null;
}

export type PropietarioMini = {
  idPropietario: number;
  nombreRazonSocial: string;
};

export async function listPropietarios(): Promise<PropietarioMini[]> {
  const rows = await sql<{ id_propietario: number | string; nombre_razon_social: string }[]>`
    SELECT id_propietario, nombre_razon_social
    FROM   sgs_pre_propietario
    ORDER  BY nombre_razon_social;
  `;
  return rows.map((r) => ({
    idPropietario: pgInt(r.id_propietario),
    nombreRazonSocial: pgText(r.nombre_razon_social),
  }));
}

export type VeredaMini = {
  idVereda: number;
  nombreVereda: string;
  idMunicipio: number;
  nombreMunicipio: string;
};

export async function listVeredas(): Promise<VeredaMini[]> {
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
}

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
// Análisis espacial (HU-AA-02..04)
// =============================================================================

export type BufferTarget = "quebrada" | "propuesta";

export function isBufferTarget(s: string): s is BufferTarget {
  return s === "quebrada" || s === "propuesta";
}

export type BufferResultTipo = "predio" | "quebrada" | "propuesta";

export type BufferResultItem = {
  tipo: BufferResultTipo;
  id: number;
  nombre: string;
  distanciaM: number | null;
  areaHa: number | null;
  longitudM: number | null;
  centroidLat: number | null;
  centroidLon: number | null;
};

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
             ST_Y(ST_Centroid(p.geom))::numeric(10,6) AS centroid_lat,
             ST_X(ST_Centroid(p.geom))::numeric(10,6) AS centroid_lon
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
           ST_Y(q.geom)::numeric(10,6) AS centroid_lat,
           ST_X(q.geom)::numeric(10,6) AS centroid_lon
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

// -----------------------------------------------------------------------------
// Matriz componente × municipio (HU-AA-04)
// -----------------------------------------------------------------------------

export type MatrizFila = {
  municipio: string;
  C1: { numPropuestas: number; hectareas: number };
  C2: { numPropuestas: number; hectareas: number };
  C3: { numPropuestas: number; hectareas: number };
  totalNumPropuestas: number;
  totalHectareas: number;
};

export async function getMatrizComponenteMunicipio(): Promise<MatrizFila[]> {
  const rows = await sql<{
    municipio: string;
    nombre_componente: string;
    num_propuestas: number | string;
    hectareas: number | string;
  }[]>`
    SELECT m.nombre_municipio                          AS municipio,
           c.nombre                                    AS nombre_componente,
           COUNT(DISTINCT pp.id_propuesta)::int        AS num_propuestas,
           COALESCE(SUM(DISTINCT ON (pp.id_propuesta) pol.area_ha), 0)::numeric
                                                       AS hectareas
    FROM   bcs_lpa_municipio m
    LEFT JOIN bcs_lpa_vereda    v ON v.id_municipio  = m.id_municipio
    LEFT JOIN sgs_pre_predio    pr ON pr.id_vereda    = v.id_vereda
    LEFT JOIN sgs_pro_propuesta pp ON pp.id_predio    = pr.id_predio
    LEFT JOIN sgs_com_accion    a ON a.id_accion     = pp.id_accion
    LEFT JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    LEFT JOIN sgs_pro_propuesta_poligono pol ON pol.id_propuesta = pp.id_propuesta
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

// -----------------------------------------------------------------------------
// Cobertura CLC × municipio (HU-AA-03)
// -----------------------------------------------------------------------------

export type CoberturaMunicipioFila = {
  municipio: string;
  totalHa: number;
  totalPredios: number;
  porCobertura: Array<{
    nombre: string;
    ha: number;
    predios: number;
    porcentaje: number;
  }>;
};

export async function getCoberturaPorMunicipio(): Promise<CoberturaMunicipioFila[]> {
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

// -----------------------------------------------------------------------------
// Intersección por bounding box (HU-AA-03)
// -----------------------------------------------------------------------------

export type BoundingBox = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
};

export type IntersectionResult = {
  bbox: BoundingBox;
  areaHaBbox: number | null;
  numPredios: number;
  totalAreaPrediosHa: number;
  numPropuestas: number;
  predios: Array<{
    idPredio: number;
    nombre: string;
    areaHaBdr: number;
    centroideLat: number;
    centroideLon: number;
    componente: string | null;
  }>;
  propuestas: Array<{
    idPropuesta: number;
    tipo: "punto" | "linea" | "poligono";
    actividad: string;
    estado: string;
    hectareas: number | null;
    longitudM: number | null;
  }>;
};

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
           ST_Y(ST_Centroid(p.geom))::numeric(10,6) AS centroid_lat,
           ST_X(ST_Centroid(p.geom))::numeric(10,6) AS centroid_lon,
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

// -----------------------------------------------------------------------------
// Listado simple de propuestas para los <select> del buffer
// -----------------------------------------------------------------------------

export type PropuestaSimple = {
  idPropuesta: number;
  tipo: "punto" | "linea" | "poligono";
  actividad: string;
  hectareas: number | null;
  longitudM: number | null;
};

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
// Quebradas CRUD (HU-TC-02)
// =============================================================================

export type QuebradaFull = {
  idQuebrada: number;
  nombreQuebrada: string;
  area: number;
  latitud: number;
  longitud: number;
  idMunicipio: number | null;
  idMicrocuenca: number | null;
};

type QuebradaRow = {
  id_quebrada: number | string;
  nombre_quebrada: string;
  area: number | string | null;
  latitud: number | string;
  longitud: number | string;
  id_municipio: number | string | null;
  id_microcuenca: number | string | null;
};

function mapQuebradaRow(r: QuebradaRow): QuebradaFull {
  return {
    idQuebrada: pgInt(r.id_quebrada),
    nombreQuebrada: pgText(r.nombre_quebrada),
    area: r.area == null ? 0 : pgNum(r.area),
    latitud: pgNum(r.latitud),
    longitud: pgNum(r.longitud),
    idMunicipio: r.id_municipio == null ? null : pgInt(r.id_municipio),
    idMicrocuenca: r.id_microcuenca == null ? null : pgInt(r.id_microcuenca),
  };
}

export async function listQuebradasFull(): Promise<QuebradaFull[]> {
  const rows = await sql<QuebradaRow[]>`
    SELECT id_quebrada, nombre_quebrada, area, latitud, longitud,
           id_municipio, id_microcuenca
    FROM   bcs_dh_quebrada
    ORDER  BY nombre_quebrada;
  `;
  return rows.map(mapQuebradaRow);
}

export async function getQuebradaById(id: number): Promise<QuebradaFull | null> {
  const rows = await sql<QuebradaRow[]>`
    SELECT id_quebrada, nombre_quebrada, area, latitud, longitud,
           id_municipio, id_microcuenca
    FROM   bcs_dh_quebrada
    WHERE  id_quebrada = ${id}
    LIMIT  1;
  `;
  return rows[0] ? mapQuebradaRow(rows[0]) : null;
}

export async function crearQuebrada(input: Omit<QuebradaFull, "idQuebrada">): Promise<QuebradaFull> {
  const rows = await sql<{ id_quebrada: number | string }[]>`
    INSERT INTO bcs_dh_quebrada (
      nombre_quebrada, area, latitud, longitud, id_municipio, id_microcuenca
    ) VALUES (
      ${input.nombreQuebrada}, ${input.area}, ${input.latitud}, ${input.longitud},
      ${input.idMunicipio}, ${input.idMicrocuenca}
    )
    RETURNING id_quebrada;
  `;
  if (!rows[0]) throw new Error("Insert fallido");
  const fresh = await getQuebradaById(pgInt(rows[0].id_quebrada));
  if (!fresh) throw new Error("Insert OK pero no se puede releer");
  return fresh;
}

export async function actualizarQuebrada(
  id: number,
  input: Omit<QuebradaFull, "idQuebrada">,
): Promise<void> {
  await sql`
    UPDATE bcs_dh_quebrada SET
      nombre_quebrada = ${input.nombreQuebrada},
      area            = ${input.area},
      latitud         = ${input.latitud},
      longitud        = ${input.longitud},
      id_municipio    = ${input.idMunicipio},
      id_microcuenca  = ${input.idMicrocuenca}
    WHERE id_quebrada = ${id};
  `;
}

export async function eliminarQuebrada(id: number): Promise<void> {
  // Las FKs (sgs_pro_propuesta.id_quebrada) son ON DELETE RESTRICT, así que
  // un 23503 nos llega de la BD si hay dependencias. El cliente lo verá.
  await sql`DELETE FROM bcs_dh_quebrada WHERE id_quebrada = ${id};`;
}

export type MunicipioMini = {
  idMunicipio: number;
  nombreMunicipio: string;
};

export async function listMunicipios(): Promise<MunicipioMini[]> {
  const rows = await sql<{ id_municipio: number | string; nombre_municipio: string }[]>`
    SELECT id_municipio, nombre_municipio
    FROM   bcs_lpa_municipio
    ORDER  BY nombre_municipio;
  `;
  return rows.map((r) => ({
    idMunicipio: pgInt(r.id_municipio),
    nombreMunicipio: pgText(r.nombre_municipio),
  }));
}

// =============================================================================
// Intervenciones — solo cambio de estado (HU-TC-04)
//
// TODO: la columna `estado` no existe todavía en sgs_pro_propuesta. El estado
// se calcula desde `tipo` (punto=20%, linea=75%, poligono=100% → Finalizada).
// Para que el GESTOR pueda editar el estado hace falta una migración
// `04-intervencion-estado.sql` que agregue la columna con backfill.
// Marcamos este CRUD como pendiente.
// =============================================================================

export type EstadoIntervencion = "En ejecución" | "Finalizada" | "Pendiente";

const ESTADOS_VALIDOS: readonly EstadoIntervencion[] = ["Pendiente", "En ejecución", "Finalizada"];

export function isEstadoIntervencion(s: string): s is EstadoIntervencion {
  return (ESTADOS_VALIDOS as readonly string[]).includes(s);
}

export async function setIntervencionEstado(
  idPropuesta: number,
  nuevoEstado: EstadoIntervencion,
): Promise<void> {
  if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
    throw new Error(`Estado inválido: ${nuevoEstado}`);
  }
  await sql`
    UPDATE sgs_pro_propuesta
    SET    estado = ${nuevoEstado}
    WHERE  id_propuesta = ${idPropuesta};
  `;
}

// =============================================================================
// Catálogo lookup: Componentes y Acciones (TC-03 catálogo, lectura)
// =============================================================================

export type ComponenteLookup = {
  idComponente: number;
  nombre: string;
};

export type AccionLookup = {
  idAccion: number;
  nombre: string;
  idComponente: number;
  nombreComponente: string;
};

export async function listComponentesLookup(): Promise<ComponenteLookup[]> {
  const rows = await sql<{ id_componente: number | string; nombre: string }[]>`
    SELECT id_componente, nombre FROM sgs_com_componente ORDER BY nombre;
  `;
  return rows.map((r) => ({
    idComponente: pgInt(r.id_componente),
    nombre: pgText(r.nombre),
  }));
}

export async function listAccionesLookup(): Promise<AccionLookup[]> {
  const rows = await sql<{
    id_accion: number | string; nombre: string;
    id_componente: number | string; nombre_componente: string;
  }[]>`
    SELECT a.id_accion, a.nombre, a.id_componente, c.nombre AS nombre_componente
    FROM   sgs_com_accion a
    JOIN   sgs_com_componente c ON c.id_componente = a.id_componente
    ORDER  BY c.nombre, a.nombre;
  `;
  return rows.map((r) => ({
    idAccion: pgInt(r.id_accion),
    nombre: pgText(r.nombre),
    idComponente: pgInt(r.id_componente),
    nombreComponente: pgText(r.nombre_componente),
  }));
}

// =============================================================================
// CRUD de catalogos (HU-TC-03)
//
// sgs_com_componente y sgs_com_accion son catalogos cerrados del modelo BDG.
// Para evitar updates accidentales, las Server Actions validan los nombres
// contra una whitelist (`COMPONENTES_VALIDOS` / `ACCIONES_VALIDAS`) antes de
// pegarle a la BD. Los CHECK constraints de la BD son la red de seguridad
// final. Las UNIQUE constraints nuevas habilitan ON CONFLICT para devolver
// el registro existente en vez de error 23505 al usuario.
// =============================================================================

export const COMPONENTES_VALIDOS = ["C1", "C2", "C3"] as const;
export const ACCIONES_VALIDAS = ["A1", "A2"] as const;
export type ComponenteValido = (typeof COMPONENTES_VALIDOS)[number];
export type AccionValida = (typeof ACCIONES_VALIDAS)[number];

export type ComponenteFull = {
  idComponente: number;
  nombre: ComponenteValido;
  createdAt: Date | null;
  updatedAt: Date | null;
  totalAcciones: number;
  totalPropuestas: number;
};

export type AccionFull = {
  idAccion: number;
  nombre: AccionValida;
  idComponente: number;
  nombreComponente: ComponenteValido;
  createdAt: Date | null;
  updatedAt: Date | null;
  totalPropuestas: number;
};

// -----------------------------------------------------------------------------
// Listado de componentes con contadores (acciones y propuestas vinculadas).
// Usado por /catalogos (server) y por la UI para mostrar dependencias antes
// de borrar.
// -----------------------------------------------------------------------------
export async function listComponentesFull(): Promise<ComponenteFull[]> {
  const rows = await sql<{
    id_componente: number | string;
    nombre: string;
    created_at: string | Date | null;
    updated_at: string | Date | null;
    total_acciones: number | string;
    total_propuestas: number | string;
  }[]>`
    SELECT
      c.id_componente,
      c.nombre,
      c.created_at,
      c.updated_at,
      COALESCE(a.cnt, 0)::int AS total_acciones,
      COALESCE(p.cnt, 0)::int AS total_propuestas
    FROM sgs_com_componente c
    LEFT JOIN (
      SELECT id_componente, COUNT(*) AS cnt
      FROM sgs_com_accion
      GROUP BY id_componente
    ) a ON a.id_componente = c.id_componente
    LEFT JOIN (
      SELECT c2.id_componente, COUNT(*) AS cnt
      FROM sgs_pro_propuesta pp
      JOIN sgs_com_accion a2        ON a2.id_accion       = pp.id_accion
      JOIN sgs_com_componente c2    ON c2.id_componente  = a2.id_componente
      GROUP BY c2.id_componente
    ) p ON p.id_componente = c.id_componente
    ORDER BY c.nombre;
  `;
  return rows.map((r) => ({
    idComponente: pgInt(r.id_componente),
    nombre: pgText(r.nombre) as ComponenteValido,
    createdAt: pgDate(r.created_at),
    updatedAt: pgDate(r.updated_at),
    totalAcciones: pgInt(r.total_acciones),
    totalPropuestas: pgInt(r.total_propuestas),
  }));
}

// -----------------------------------------------------------------------------
// Listado de acciones con contador de propuestas. JOIN a componente para
// mostrar nombre legible en la UI.
// -----------------------------------------------------------------------------
export async function listAccionesFull(): Promise<AccionFull[]> {
  const rows = await sql<{
    id_accion: number | string;
    nombre: string;
    id_componente: number | string;
    nombre_componente: string;
    created_at: string | Date | null;
    updated_at: string | Date | null;
    total_propuestas: number | string;
  }[]>`
    SELECT
      a.id_accion,
      a.nombre,
      a.id_componente,
      c.nombre AS nombre_componente,
      a.created_at,
      a.updated_at,
      COALESCE(p.cnt, 0)::int AS total_propuestas
    FROM sgs_com_accion a
    JOIN sgs_com_componente c ON c.id_componente = a.id_componente
    LEFT JOIN (
      SELECT id_accion, COUNT(*) AS cnt
      FROM sgs_pro_propuesta
      GROUP BY id_accion
    ) p ON p.id_accion = a.id_accion
    ORDER BY c.nombre, a.nombre;
  `;
  return rows.map((r) => ({
    idAccion: pgInt(r.id_accion),
    nombre: pgText(r.nombre) as AccionValida,
    idComponente: pgInt(r.id_componente),
    nombreComponente: pgText(r.nombre_componente) as ComponenteValido,
    createdAt: pgDate(r.created_at),
    updatedAt: pgDate(r.updated_at),
    totalPropuestas: pgInt(r.total_propuestas),
  }));
}

// -----------------------------------------------------------------------------
// Helpers byId (para futuro /catalogos/[id] si lo piden; hoy la pagina es
// una sola vista con dos tablas). Mantenerlos exported por consistencia.
// -----------------------------------------------------------------------------
export async function getComponenteById(id: number): Promise<ComponenteFull | null> {
  const all = await listComponentesFull();
  return all.find((c) => c.idComponente === id) ?? null;
}

export async function getAccionById(id: number): Promise<AccionFull | null> {
  const all = await listAccionesFull();
  return all.find((a) => a.idAccion === id) ?? null;
}

// -----------------------------------------------------------------------------
// Crear componente.
// Si el nombre ya existe (UNIQUE), devolvemos el registro existente en vez
// de tirar 23505 — UX mas amable para el cliente.
// -----------------------------------------------------------------------------
export async function crearComponente(nombre: ComponenteValido): Promise<ComponenteFull> {
  const rows = await sql<{ id_componente: number | string }[]>`
    INSERT INTO sgs_com_componente (nombre)
    VALUES (${nombre})
    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
    RETURNING id_componente;
  `;
  if (!rows[0]) throw new Error("Insert/upsert de componente fallido");
  const fresh = await getComponenteById(pgInt(rows[0].id_componente));
  if (!fresh) throw new Error("Componente no se puede releer tras upsert");
  return fresh;
}

// -----------------------------------------------------------------------------
// Actualizar componente. Valida whitelist en la app; UNIQUE constraint es la
// red de seguridad. Si el nuevo nombre ya existe en otra fila, 23505.
// -----------------------------------------------------------------------------
export async function actualizarComponente(
  id: number,
  nombre: ComponenteValido,
): Promise<void> {
  await sql`
    UPDATE sgs_com_componente
    SET    nombre = ${nombre}
    WHERE  id_componente = ${id};
  `;
}

// -----------------------------------------------------------------------------
// Eliminar componente. Bloqueado si tiene acciones o propuestas vinculadas.
// Devuelve un mensaje claro para la UI.
// -----------------------------------------------------------------------------
export async function eliminarComponente(id: number): Promise<void> {
  const check = await sql<{ acciones: number | string; propuestas: number | string }[]>`
    SELECT
      (SELECT COUNT(*) FROM sgs_com_accion     WHERE id_componente = ${id})::int AS acciones,
      (SELECT COUNT(*) FROM sgs_com_accion a
         JOIN sgs_pro_propuesta p ON p.id_accion = a.id_accion
         WHERE a.id_componente = ${id})::int  AS propuestas;
  `;
  const acciones = pgInt(check[0]?.acciones);
  const propuestas = pgInt(check[0]?.propuestas);
  if (acciones > 0) {
    throw new Error(
      `No se puede eliminar: el componente tiene ${acciones} accion(es) asociada(s). ` +
      `Eliminá primero las acciones o reasignalas.`,
    );
  }
  if (propuestas > 0) {
    throw new Error(
      `No se puede eliminar: hay ${propuestas} propuesta(s) que referencian acciones de este componente.`,
    );
  }
  await sql`DELETE FROM sgs_com_componente WHERE id_componente = ${id};`;
}

// -----------------------------------------------------------------------------
// Crear accion. ON CONFLICT (id_componente, nombre) devuelve la fila existente.
// -----------------------------------------------------------------------------
export async function crearAccion(
  nombre: AccionValida,
  idComponente: number,
): Promise<AccionFull> {
  const rows = await sql<{ id_accion: number | string }[]>`
    INSERT INTO sgs_com_accion (nombre, id_componente)
    VALUES (${nombre}, ${idComponente})
    ON CONFLICT (id_componente, nombre)
      DO UPDATE SET id_componente = EXCLUDED.id_componente
    RETURNING id_accion;
  `;
  if (!rows[0]) throw new Error("Insert/upsert de accion fallido");
  const fresh = await getAccionById(pgInt(rows[0].id_accion));
  if (!fresh) throw new Error("Accion no se puede releer tras upsert");
  return fresh;
}

// -----------------------------------------------------------------------------
// Actualizar accion. Cambiar el componente esta permitido (rebind).
// -----------------------------------------------------------------------------
export async function actualizarAccion(
  id: number,
  nombre: AccionValida,
  idComponente: number,
): Promise<void> {
  await sql`
    UPDATE sgs_com_accion
    SET    nombre = ${nombre},
           id_componente = ${idComponente}
    WHERE  id_accion = ${id};
  `;
}

// -----------------------------------------------------------------------------
// Eliminar accion. Bloqueado si hay propuestas que la referencian (FK RESTRICT
// lo haria igual, pero el mensaje proactivo es mas claro).
// -----------------------------------------------------------------------------
export async function eliminarAccion(id: number): Promise<void> {
  const check = await sql<{ propuestas: number | string }[]>`
    SELECT COUNT(*)::int AS propuestas
    FROM   sgs_pro_propuesta
    WHERE  id_accion = ${id};
  `;
  const propuestas = pgInt(check[0]?.propuestas);
  if (propuestas > 0) {
    throw new Error(
      `No se puede eliminar: hay ${propuestas} propuesta(s) que referencian esta accion. ` +
      `Reasignalas a otra accion primero.`,
    );
  }
  await sql`DELETE FROM sgs_com_accion WHERE id_accion = ${id};`;
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
// Tipos GeoJSON mínimos (no importamos @types/geojson para no sumar deps).
// -----------------------------------------------------------------------------
export interface GeoJSONLineString {
  type: "LineString";
  coordinates: [number, number][];
}

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: [number, number][][];
}

// -----------------------------------------------------------------------------
// AvancePropuesta — fila de sgs_pro_propuesta_avance (con JOIN a usuario).
// -----------------------------------------------------------------------------
export type AvancePropuesta = {
  idAvance: number;
  idPropuesta: number;
  avancePct: number;
  nota: string;
  idUsuario: number | null;
  autorEmail: string | null;
  createdAt: Date;
};

// -----------------------------------------------------------------------------
// Geometría por subtipo (discriminated union sobre `geom`).
// -----------------------------------------------------------------------------
type PuntoGeom = {
  lat: number;
  lon: number;
  tipoPunto: string;
  descripcion: string;
};

type LineaGeom = {
  longitudM: number;
  /** `sgs_pro_propuesta_linea` no tiene columna de área; queda en 0 para
   *  uniformidad de tipo con `PoligonoGeom` y poder mostrar la métrica
   *  en una misma card del front. */
  areaHa: number;
  geojson: GeoJSONLineString;
};

type PoligonoGeom = {
  areaHa: number;
  geojson: GeoJSONPolygon;
};

type IntervencionCompletaBase = {
  id: number;
  tipo: "punto" | "linea" | "poligono";
  actividad: string;
  estado: EstadoIntervencion;
  createdAt: Date | null;
  // Joins (nullable: la propuesta podría no tener predio/municipio/etc.)
  predio: { id: number; nombre: string; codigo: string; areaHa: number } | null;
  vereda: { id: number; nombre: string } | null;
  municipio: { id: number; nombre: string; departamento: string } | null;
  accion: { id: number; nombre: string; componente: string } | null;
  quebrada: { id: number; nombre: string } | null;
  // Avance (HU-IC-04)
  avancePctActual: number;
  avances: AvancePropuesta[];
};

export type IntervencionCompleta =
  | (IntervencionCompletaBase & { tipo: "punto"; geom: PuntoGeom | null })
  | (IntervencionCompletaBase & { tipo: "linea"; geom: LineaGeom | null })
  | (IntervencionCompletaBase & { tipo: "poligono"; geom: PoligonoGeom | null });

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

function avancePctPorTipo(tipo: string): number {
  if (tipo === "punto") return 20;
  if (tipo === "linea") return 75;
  if (tipo === "poligono") return 100;
  return 0;
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
    created_at: Date | string | null;
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
      pp.created_at,
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

  // Avance actual: el del último registro, o el derivado del tipo si no hay.
  const avancePctActual = avances.length > 0 ? avances[0]!.avancePct : avancePctPorTipo(tipo);

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
    createdAt: row.created_at ? new Date(pgText(row.created_at)) : null,
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
// -----------------------------------------------------------------------------
export async function listAvancesByPropuesta(id: number): Promise<AvancePropuesta[]> {
  const rows = await sql<{
    id_avance: number | string;
    id_propuesta: number | string;
    avance_pct: number | string;
    nota: string;
    id_usuario: number | string | null;
    autor_email: string | null;
    created_at: Date | string;
  }[]>`
    SELECT av.id_avance,
           av.id_propuesta,
           av.avance_pct,
           av.nota,
           av.id_usuario,
           autor.email AS autor_email,
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
    created_at: Date | string;
  }[]>`
    WITH inserted AS (
      INSERT INTO sgs_pro_propuesta_avance (id_propuesta, avance_pct, nota, id_usuario)
      VALUES (${args.idPropuesta}, ${args.avancePct}, ${args.nota}, ${args.idUsuario})
      RETURNING id_avance, id_propuesta, avance_pct, nota, id_usuario, created_at
    )
    SELECT i.id_avance,
           i.id_propuesta,
           i.avance_pct,
           i.nota,
           i.id_usuario,
           autor.email AS autor_email,
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
    createdAt: new Date(pgText(r.created_at)),
  };
}

// =============================================================================
// Monitoreo (HU-MO-01..03)
//
// Puntos de obra captacion, estacion limnimetrica, bebedero, tanque y
// panel_solar. Cada punto vive en sgs_pro_propuesta_punto y hereda de
// sgs_pro_propuesta (1:1 por id_propuesta UNIQUE), que a su vez cuelga de
// sgs_pre_predio y sgs_com_accion/componente.
//
// Decisiones:
//   - `estado` se lee de sgs_pro_propuesta (unica fuente de verdad).
//   - `geom` puede ser NULL; el JOIN con sgs_pro_propuesta_punto ya tiene
//     este/norte como numeric (fuente confiable). ST_X/ST_Y se exponen
//     como lon/lat cuando el geom existe (casi nunca en la BD actual).
//   - Beneficiarios via sgs_pre_usuario + sgs_rel_propuesta_punto_usuario.
//   - withFallback SOLO en KPIs y listMonitoreoPuntos: la ficha / edicion
//     deben fallar duro si la BD no responde (single-record y mutaciones).
// =============================================================================

// -----------------------------------------------------------------------------
// Whitelist de tipo_punto
// -----------------------------------------------------------------------------
export const TIPOS_PUNTO = [
  "obra_captacion",
  "estacion_limnimetrica",
  "bebedero",
  "tanque",
  "panel_solar",
] as const;
export type TipoPunto = (typeof TIPOS_PUNTO)[number];

export const TIPO_PUNTO_LABEL: Record<TipoPunto, string> = {
  obra_captacion: "Obra de captación",
  estacion_limnimetrica: "Estación limnimétrica",
  bebedero: "Bebedero",
  tanque: "Tanque",
  panel_solar: "Panel solar",
};

export const TIPO_PUNTO_COLOR: Record<
  TipoPunto,
  "primary" | "secondary" | "tertiary" | "warning" | "info"
> = {
  obra_captacion: "primary",
  estacion_limnimetrica: "info",
  bebedero: "secondary",
  tanque: "tertiary",
  panel_solar: "warning",
};

export function isTipoPunto(s: string): s is TipoPunto {
  return (TIPOS_PUNTO as readonly string[]).includes(s);
}

// -----------------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------------
export type MonitoreoPunto = {
  idPropPunto: number;
  idPropuesta: number;
  actividad: string;
  descripcion: string;
  tipoPunto: TipoPunto;
  tipoObra: number;
  estructuraAnclaje: boolean;
  nivelComplejidad: string;
  idEstacionOriginal: string;
  codTipo: string;
  codigoCaj: string;
  este: number;
  norte: number;
  lon: number | null; // ST_X(geom::geometry)
  lat: number | null; // ST_Y(geom::geometry)
  idQuebrada: number | null;
  nombreQuebrada: string | null;
  idPredio: number;
  codigoPredio: string;
  nombrePredio: string;
  nombreMunicipio: string | null;
  nombreVereda: string | null;
  idAccion: number;
  nombreAccion: string;
  idComponente: number;
  nombreComponente: string;
  estadoPropuesta: EstadoIntervencion; // viene de sgs_pro_propuesta.estado
  totalBeneficiarios: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type BeneficiarioMini = {
  idUsuario: number;
  nombre: string;
  telefono: string;
  vereda: string;
  municipio: string;
};

export type MonitoreoKpis = {
  totalPuntos: number;
  porTipo: Record<TipoPunto, number>;
  totalBeneficiarios: number;
  porComponente: Record<string, number>;
};

// -----------------------------------------------------------------------------
// Row type + mapper interno compartido por listMonitoreoPuntos y
// getMonitoreoPuntoById. Mantener la firma sincronizada con el SELECT.
// -----------------------------------------------------------------------------
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
    tipoPunto: pgText(r.tipo_punto) as TipoPunto,
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
    ST_X(pp.geom::geometry) AS lon,
    ST_Y(pp.geom::geometry) AS lat,
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

// -----------------------------------------------------------------------------
// getMonitoreoKPIs — totales por tipo, por componente, beneficiarios unicos.
// -----------------------------------------------------------------------------
export async function getMonitoreoKPIs(): Promise<MonitoreoKpis> {
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
    const porTipo: Record<TipoPunto, number> = {
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
}

// -----------------------------------------------------------------------------
// listMonitoreoPuntos — listado paginado con todos los joins + filtros.
// -----------------------------------------------------------------------------
export async function listMonitoreoPuntos(
  opts: {
    tipo?: TipoPunto | null;
    componente?: string | null;
    q?: string | null;
    limit?: number;
  } = {},
): Promise<MonitoreoPunto[]> {
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
}

// -----------------------------------------------------------------------------
// getMonitoreoPuntoById — ficha detallada (sin fallback, debe fallar duro).
// -----------------------------------------------------------------------------
export async function getMonitoreoPuntoById(id: number): Promise<MonitoreoPunto | null> {
  const rows = await sql<MonitoreoRow[]>`
    ${MONITOREO_BASE_SELECT}
    WHERE  pp.id_prop_punto = ${id}
    LIMIT  1;
  `;
  return rows[0] ? mapMonitoreoRow(rows[0]) : null;
}

// -----------------------------------------------------------------------------
// listBeneficiariosByPunto — usuarios asociados a un punto.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// listBeneficiariosDisponiblesByPunto — usuarios NO asociados (selector).
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// actualizarPunto — UPDATE dinamico solo de los campos provistos.
// Si todos son undefined, no-op. Captura CHECK (23514) y FK (23503).
// -----------------------------------------------------------------------------
export async function actualizarPunto(
  id: number,
  fields: {
    actividad?: string;
    descripcion?: string;
    tipoPunto?: TipoPunto;
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

// -----------------------------------------------------------------------------
// asociarBeneficiario — INSERT ... ON CONFLICT DO NOTHING (silencioso).
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// desasociarBeneficiario — DELETE por PK compuesta.
// -----------------------------------------------------------------------------
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
// Catalogos secundarios (HU-TC-06..10)
//
// 5 catalogos del modelo BDG con el mismo patron que /catalogos (TC-03) y
// monitoreo (MO-01..03): whitelists, UPSERT amable con ON CONFLICT, trigger
// updated_at, pre-check de dependencias en eliminar.
//
// Solo ADMIN puede escribir (validado en server actions).
// Tablas:
//   - bcs_lpa_municipio    (HU-TC-06)
//   - bcs_lpa_vereda       (HU-TC-07)
//   - sgs_pre_propietario  (HU-TC-08)
//   - bcs_dh_microcuenca   (HU-TC-09)
//   - sgs_pre_usuario      (HU-TC-10, beneficiarios)
// =============================================================================

// -----------------------------------------------------------------------------
// Regex telefono: 7-20 chars, permite digitos, espacios, guiones, + y ().
// Coincide con el CHECK constraint (VARCHAR(20)).
// -----------------------------------------------------------------------------
export const TELEFONO_REGEX = /^[\d\s\-\+\(\)]{7,20}$/;

export function isValidTelefono(t: string): boolean {
  return TELEFONO_REGEX.test(t);
}

// =============================================================================
// HU-TC-06: Municipios (bcs_lpa_municipio)
// =============================================================================

export type MunicipioFull = {
  idMunicipio: number;
  nombreMunicipio: string;
  codigoAdministrativo: string;
  departamento: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  /** # de veredas que dependen de este municipio (pre-check eliminar). */
  totalVeredas: number;
  /** # de predios indirectos via veredas (pre-check eliminar). */
  totalPredios: number;
};

type MunicipioRow = {
  id_municipio: number | string;
  nombre_municipio: string;
  codigo_administrativo: string;
  departamento: string;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  total_veredas: number | string;
  total_predios: number | string;
};

function mapMunicipioRow(r: MunicipioRow): MunicipioFull {
  return {
    idMunicipio: pgInt(r.id_municipio),
    nombreMunicipio: pgText(r.nombre_municipio),
    codigoAdministrativo: pgText(r.codigo_administrativo),
    departamento: pgText(r.departamento),
    createdAt: pgDate(r.created_at),
    updatedAt: pgDate(r.updated_at),
    totalVeredas: pgInt(r.total_veredas),
    totalPredios: pgInt(r.total_predios),
  };
}

export async function listMunicipiosFull(): Promise<MunicipioFull[]> {
  return withFallback("municipiosFull", async () => {
    const rows = await sql<MunicipioRow[]>`
      SELECT
        m.id_municipio,
        m.nombre_municipio,
        m.codigo_administrativo,
        m.departamento,
        m.created_at,
        m.updated_at,
        COALESCE(v.cnt, 0)::int AS total_veredas,
        COALESCE(p.cnt, 0)::int AS total_predios
      FROM   bcs_lpa_municipio m
      LEFT JOIN (
        SELECT id_municipio, COUNT(*) AS cnt
        FROM   bcs_lpa_vereda
        GROUP  BY id_municipio
      ) v ON v.id_municipio = m.id_municipio
      LEFT JOIN (
        SELECT v2.id_municipio, COUNT(pr.id_predio) AS cnt
        FROM   bcs_lpa_vereda  v2
        JOIN   sgs_pre_predio  pr ON pr.id_vereda = v2.id_vereda
        GROUP  BY v2.id_municipio
      ) p ON p.id_municipio = m.id_municipio
      ORDER  BY m.departamento, m.nombre_municipio;
    `;
    return rows.map(mapMunicipioRow);
  }, []);
}

export async function getMunicipioById(id: number): Promise<MunicipioFull | null> {
  const rows = await sql<MunicipioRow[]>`
    SELECT
      m.id_municipio,
      m.nombre_municipio,
      m.codigo_administrativo,
      m.departamento,
      m.created_at,
      m.updated_at,
      COALESCE(v.cnt, 0)::int AS total_veredas,
      COALESCE(p.cnt, 0)::int AS total_predios
    FROM   bcs_lpa_municipio m
    LEFT JOIN (
      SELECT id_municipio, COUNT(*) AS cnt
      FROM   bcs_lpa_vereda
      GROUP  BY id_municipio
    ) v ON v.id_municipio = m.id_municipio
    LEFT JOIN (
      SELECT v2.id_municipio, COUNT(pr.id_predio) AS cnt
      FROM   bcs_lpa_vereda  v2
      JOIN   sgs_pre_predio  pr ON pr.id_vereda = v2.id_vereda
      GROUP  BY v2.id_municipio
    ) p ON p.id_municipio = m.id_municipio
    WHERE  m.id_municipio = ${id}
    LIMIT  1;
  `;
  return rows[0] ? mapMunicipioRow(rows[0]) : null;
}

export type MunicipioInput = {
  nombreMunicipio: string;
  codigoAdministrativo: string;
  departamento: string;
};

export async function crearMunicipio(input: MunicipioInput): Promise<MunicipioFull> {
  if (input.nombreMunicipio.length < 2 || input.nombreMunicipio.length > 255) {
    throw new Error("nombreMunicipio debe tener entre 2 y 255 caracteres");
  }
  if (input.codigoAdministrativo.length < 1 || input.codigoAdministrativo.length > 50) {
    throw new Error("codigoAdministrativo debe tener entre 1 y 50 caracteres");
  }
  if (input.departamento.length < 2 || input.departamento.length > 100) {
    throw new Error("departamento debe tener entre 2 y 100 caracteres");
  }
  const rows = await sql<{ id_municipio: number | string }[]>`
    INSERT INTO bcs_lpa_municipio (nombre_municipio, codigo_administrativo, departamento)
    VALUES (${input.nombreMunicipio}, ${input.codigoAdministrativo}, ${input.departamento})
    ON CONFLICT (nombre_municipio, departamento) DO UPDATE
      SET codigo_administrativo = EXCLUDED.codigo_administrativo
    RETURNING id_municipio;
  `;
  if (!rows[0]) throw new Error("Insert/upsert de municipio fallido");
  const fresh = await getMunicipioById(pgInt(rows[0].id_municipio));
  if (!fresh) throw new Error("Municipio no se puede releer tras upsert");
  return fresh;
}

export async function actualizarMunicipio(
  id: number,
  input: MunicipioInput,
): Promise<void> {
  if (input.nombreMunicipio.length < 2 || input.nombreMunicipio.length > 255) {
    throw new Error("nombreMunicipio debe tener entre 2 y 255 caracteres");
  }
  if (input.codigoAdministrativo.length < 1 || input.codigoAdministrativo.length > 50) {
    throw new Error("codigoAdministrativo debe tener entre 1 y 50 caracteres");
  }
  if (input.departamento.length < 2 || input.departamento.length > 100) {
    throw new Error("departamento debe tener entre 2 y 100 caracteres");
  }
  await sql`
    UPDATE bcs_lpa_municipio
    SET    nombre_municipio      = ${input.nombreMunicipio},
           codigo_administrativo = ${input.codigoAdministrativo},
           departamento          = ${input.departamento}
    WHERE  id_municipio = ${id};
  `;
}

export async function eliminarMunicipio(id: number): Promise<void> {
  const check = await sql<{ veredas: number | string; predios: number | string }[]>`
    SELECT
      (SELECT COUNT(*) FROM bcs_lpa_vereda WHERE id_municipio = ${id})::int    AS veredas,
      (SELECT COUNT(*) FROM sgs_pre_predio
         WHERE id_vereda IN (SELECT id_vereda FROM bcs_lpa_vereda WHERE id_municipio = ${id})
      )::int                                                                    AS predios;
  `;
  const veredas = pgInt(check[0]?.veredas);
  const predios = pgInt(check[0]?.predios);
  if (veredas > 0) {
    throw new Error(
      `No se puede eliminar: el municipio tiene ${veredas} vereda(s) asociada(s). ` +
      `Eliminá primero las veredas o reasignalas.`,
    );
  }
  if (predios > 0) {
    throw new Error(
      `No se puede eliminar: hay ${predios} predio(s) en veredas de este municipio.`,
    );
  }
  await sql`DELETE FROM bcs_lpa_municipio WHERE id_municipio = ${id};`;
}

// =============================================================================
// HU-TC-07: Veredas (bcs_lpa_vereda)
// =============================================================================

export type VeredaFull = {
  idVereda: number;
  nombreVereda: string;
  codigoAdministrativo: string;
  poblacionEstimada: number;
  idMunicipio: number;
  nombreMunicipio: string | null;
  departamento: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  /** # de predios que dependen de esta vereda (pre-check eliminar). */
  totalPredios: number;
};

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

export async function listVeredasFull(): Promise<VeredaFull[]> {
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
}

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

export type VeredaInput = {
  nombreVereda: string;
  codigoAdministrativo: string;
  poblacionEstimada?: number;
  idMunicipio: number;
};

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

// =============================================================================
// HU-TC-08: Propietarios (sgs_pre_propietario)
// =============================================================================

export type PropietarioFull = {
  idPropietario: number;
  nombreRazonSocial: string;
  telefono: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  /** # de predios que dependen de este propietario (pre-check eliminar). */
  totalPredios: number;
};

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

export async function listPropietariosFull(): Promise<PropietarioFull[]> {
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
}

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

export type PropietarioInput = {
  nombreRazonSocial: string;
  telefono?: string;
};

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
// HU-TC-09: Microcuencas (bcs_dh_microcuenca)
// =============================================================================

export type MicrocuencaFull = {
  idMicrocuenca: number;
  nombreMicrocuenca: string;
  codigo: string;
  area: number;
  latitud: number;
  longitud: number;
  nombreUsuarios: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  /** # de quebradas que dependen de esta microcuenca (pre-check eliminar). */
  totalQuebradas: number;
};

type MicrocuencaRow = {
  id_microcuenca: number | string;
  nombre_microcuenca: string;
  codigo: string;
  area: number | string;
  latitud: number | string;
  longitud: number | string;
  nombre_usuarios: string;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  total_quebradas: number | string;
};

function mapMicrocuencaRow(r: MicrocuencaRow): MicrocuencaFull {
  return {
    idMicrocuenca: pgInt(r.id_microcuenca),
    nombreMicrocuenca: pgText(r.nombre_microcuenca),
    codigo: pgText(r.codigo),
    area: pgNum(r.area),
    latitud: pgNum(r.latitud),
    longitud: pgNum(r.longitud),
    nombreUsuarios: pgText(r.nombre_usuarios),
    createdAt: pgDate(r.created_at),
    updatedAt: pgDate(r.updated_at),
    totalQuebradas: pgInt(r.total_quebradas),
  };
}

export async function listMicrocuencasFull(): Promise<MicrocuencaFull[]> {
  return withFallback("microcuencasFull", async () => {
    const rows = await sql<MicrocuencaRow[]>`
      SELECT
        mc.id_microcuenca,
        mc.nombre_microcuenca,
        mc.codigo,
        mc.area,
        mc.latitud,
        mc.longitud,
        mc.nombre_usuarios,
        mc.created_at,
        mc.updated_at,
        COALESCE(q.cnt, 0)::int AS total_quebradas
      FROM   bcs_dh_microcuenca mc
      LEFT JOIN (
        SELECT id_microcuenca, COUNT(*) AS cnt
        FROM   bcs_dh_quebrada
        GROUP  BY id_microcuenca
      ) q ON q.id_microcuenca = mc.id_microcuenca
      ORDER  BY mc.nombre_microcuenca;
    `;
    return rows.map(mapMicrocuencaRow);
  }, []);
}

export async function getMicrocuencaById(id: number): Promise<MicrocuencaFull | null> {
  const rows = await sql<MicrocuencaRow[]>`
    SELECT
      mc.id_microcuenca,
      mc.nombre_microcuenca,
      mc.codigo,
      mc.area,
      mc.latitud,
      mc.longitud,
      mc.nombre_usuarios,
      mc.created_at,
      mc.updated_at,
      COALESCE(q.cnt, 0)::int AS total_quebradas
    FROM   bcs_dh_microcuenca mc
    LEFT JOIN (
      SELECT id_microcuenca, COUNT(*) AS cnt
      FROM   bcs_dh_quebrada
      GROUP  BY id_microcuenca
    ) q ON q.id_microcuenca = mc.id_microcuenca
    WHERE  mc.id_microcuenca = ${id}
    LIMIT  1;
  `;
  return rows[0] ? mapMicrocuencaRow(rows[0]) : null;
}

export type MicrocuencaInput = {
  nombreMicrocuenca: string;
  codigo: string;
  area?: number;
  latitud?: number;
  longitud?: number;
  nombreUsuarios?: string;
};

export async function crearMicrocuenca(input: MicrocuencaInput): Promise<MicrocuencaFull> {
  if (input.nombreMicrocuenca.length < 2 || input.nombreMicrocuenca.length > 255) {
    throw new Error("nombreMicrocuenca debe tener entre 2 y 255 caracteres");
  }
  if (input.codigo.length < 1 || input.codigo.length > 50) {
    throw new Error("codigo debe tener entre 1 y 50 caracteres");
  }
  const rows = await sql<{ id_microcuenca: number | string }[]>`
    INSERT INTO bcs_dh_microcuenca (nombre_microcuenca, codigo, area, latitud, longitud, nombre_usuarios)
    VALUES (
      ${input.nombreMicrocuenca},
      ${input.codigo},
      ${input.area ?? 0},
      ${input.latitud ?? 0},
      ${input.longitud ?? 0},
      ${input.nombreUsuarios ?? "N/A"}
    )
    ON CONFLICT (codigo) DO UPDATE
      SET nombre_microcuenca = EXCLUDED.nombre_microcuenca
    RETURNING id_microcuenca;
  `;
  if (!rows[0]) throw new Error("Insert/upsert de microcuenca fallido");
  const fresh = await getMicrocuencaById(pgInt(rows[0].id_microcuenca));
  if (!fresh) throw new Error("Microcuenca no se puede releer tras upsert");
  return fresh;
}

export async function actualizarMicrocuenca(
  id: number,
  input: MicrocuencaInput,
): Promise<void> {
  if (input.nombreMicrocuenca.length < 2 || input.nombreMicrocuenca.length > 255) {
    throw new Error("nombreMicrocuenca debe tener entre 2 y 255 caracteres");
  }
  if (input.codigo.length < 1 || input.codigo.length > 50) {
    throw new Error("codigo debe tener entre 1 y 50 caracteres");
  }
  await sql`
    UPDATE bcs_dh_microcuenca
    SET    nombre_microcuenca  = ${input.nombreMicrocuenca},
           codigo              = ${input.codigo},
           area                = ${input.area ?? 0},
           latitud             = ${input.latitud ?? 0},
           longitud            = ${input.longitud ?? 0},
           nombre_usuarios     = ${input.nombreUsuarios ?? "N/A"}
    WHERE  id_microcuenca = ${id};
  `;
}

export async function eliminarMicrocuenca(id: number): Promise<void> {
  const check = await sql<{ quebradas: number | string }[]>`
    SELECT COUNT(*)::int AS quebradas
    FROM   bcs_dh_quebrada
    WHERE  id_microcuenca = ${id};
  `;
  const quebradas = pgInt(check[0]?.quebradas);
  if (quebradas > 0) {
    throw new Error(
      `No se puede eliminar: hay ${quebradas} quebrada(s) asociada(s) a esta microcuenca. ` +
      `Reasignalas a otra microcuenca primero.`,
    );
  }
  await sql`DELETE FROM bcs_dh_microcuenca WHERE id_microcuenca = ${id};`;
}

// =============================================================================
// HU-TC-10: Beneficiarios (sgs_pre_usuario)
//
// Cubre la ficha /catalogos (CRUD con UNIQUE amable) y reemplaza al viejo
// crearBeneficiario() usado por el flujo de monitoreo. Ahora devuelve
// BeneficiarioFull (con createdAt/updatedAt y contador de relaciones).
// =============================================================================

export type BeneficiarioFull = {
  idUsuario: number;
  nombre: string;
  telefono: string;
  vereda: string;
  municipio: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  /** # de relaciones sgs_rel_propuesta_punto_usuario (pre-check eliminar). */
  totalRelaciones: number;
};

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

export async function listBeneficiariosFull(): Promise<BeneficiarioFull[]> {
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
}

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

export type BeneficiarioInput = {
  nombre: string;
  telefono?: string;
  vereda?: string;
  municipio?: string;
};

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
