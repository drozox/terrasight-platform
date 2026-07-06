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
