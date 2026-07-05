// =============================================================================
// POST /api/interventions/import
//
// Recibe un payload GeoJSON ya procesado (ImportPayload) y persiste cada
// feature en:
//   - sgs_pro_propuesta (super-tipo)
//   - sgs_pro_propuesta_punto  | linea | poligono (sub-tipo con geometría)
//
// Cada propuesta resuelve:
//   - id_accion    vía lookup (componente + accion) sobre sgs_com_accion
//   - id_predio    vía KNN postgis si viene null (centroide más cercano)
//   - id_quebrada  opcional, si el feature lo trae o si intersecta quebrada
//
// La inserción ocurre dentro de una transacción. Si la BD no responde,
// devuelve 503 con detalle para que la UI pueda mostrar fallback.
// =============================================================================

import { NextResponse } from "next/server";
import { sql, pgInt, pgNum } from "@/lib/db";
import type {
  ImportPayload,
  ImportPayloadItem,
} from "@/lib/geo-import";

export const runtime = "nodejs"; // necesitamos postgres-js (no edge)

interface ImportResult {
  ok: boolean;
  inserted: number;
  ids: number[];
  byType: { punto: number; linea: number; poligono: number };
  error?: string;
  detail?: string;
}

/** Convierte [lon, lat] a PostGIS POINT(lon lat) WKT */
function pointToWKT(geom: { type: "Point"; coordinates: [number, number] }): string {
  const [lon, lat] = geom.coordinates;
  return `POINT(${lon} ${lat})`;
}

/** Convierte LineString a WKT */
function lineStringToWKT(geom: {
  type: "LineString";
  coordinates: [number, number][];
}): string {
  const pts = geom.coordinates.map(([lon, lat]) => `${lon} ${lat}`).join(", ");
  return `LINESTRING(${pts})`;
}

/** Convierte Polygon (con su anillo exterior) a WKT */
function polygonToWKT(geom: {
  type: "Polygon";
  coordinates: [number, number][][];
}): string {
  const rings = geom.coordinates
    .map((ring) => `(${ring.map(([lon, lat]) => `${lon} ${lat}`).join(", ")})`)
    .join(", ");
  return `POLYGON(${rings})`;
}

function geometryToWKT(item: ImportPayloadItem): string {
  if (item.geometry.type === "Point") return pointToWKT(item.geometry);
  if (item.geometry.type === "LineString") return lineStringToWKT(item.geometry);
  return polygonToWKT(item.geometry);
}

/** Convierte bbox a PostGIS ENVELOPE via POLYGON (minX minY, maxX minY, maxX maxY, minX maxY, minX minY) */
function bboxToPolygonWKT(bbox: [number, number, number, number]): string {
  const [minX, minY, maxX, maxY] = bbox;
  return `POLYGON((${minX} ${minY}, ${maxX} ${minY}, ${maxX} ${maxY}, ${minX} ${maxY}, ${minX} ${minY}))`;
}

/** Resuelve id_accion vía lookup componente + accion */
async function resolveAccionId(
  componente: "C1" | "C2" | "C3",
  accion: "A1" | "A2",
): Promise<number | null> {
  try {
    const [row] = await sql<{ id_accion: number | string }[]>`
      SELECT a.id_accion
      FROM sgs_com_accion a
      JOIN sgs_com_componente c ON c.id_componente = a.id_componente
      WHERE c.nombre = ${componente} AND a.nombre = ${accion}
      LIMIT 1;
    `;
    return row ? pgInt(row.id_accion) : null;
  } catch {
    return null;
  }
}

/** KNN: id_predio más cercano al centroide del feature (PostGIS <-> distance) */
async function resolveNearestPredioId(
  centroid: [number, number],
): Promise<number | null> {
  try {
    const [lon, lat] = centroid;
    const [row] = await sql<{ id_predio: number | string }[]>`
      SELECT id_predio
      FROM sgs_pre_predio
      WHERE longitud_centroide IS NOT NULL AND latitud_centroide IS NOT NULL
      ORDER BY geom <-> ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
      LIMIT 1;
    `;
    return row ? pgInt(row.id_predio) : null;
  } catch {
    return null;
  }
}

/** Resuelve id_quebrada por intersección (opcional, sólo si la BD lo soporta) */
async function resolveQuebradaId(
  bbox: [number, number, number, number],
): Promise<number | null> {
  try {
    const poly = bboxToPolygonWKT(bbox);
    const [row] = await sql<{ id_quebrada: number | string }[]>`
      SELECT id_quebrada
      FROM bcs_dh_quebrada
      WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromText(${poly}), 4326))
      ORDER BY ST_Distance(geom, ST_SetSRID(ST_GeomFromText(${poly}), 4326))
      LIMIT 1;
    `;
    return row ? pgInt(row.id_quebrada) : null;
  } catch {
    return null;
  }
}

/** Inserta una propuesta y su fila hija (transacción por propuesta para aislar errores) */
async function insertPropuesta(
  item: ImportPayloadItem,
): Promise<number | null> {
  const idAccion = await resolveAccionId(item.componente, item.accion);
  if (!idAccion) {
    throw new Error(
      `No se encontró sgs_com_accion para ${item.componente}+${item.accion}.`,
    );
  }

  // Resolución de FKs (opcional, si la BD responde)
  let idPredio = item.id_predio;
  if (idPredio == null) {
    const centroid = item.geometry.type === "Point" ? item.geometry.coordinates : null;
    if (centroid) {
      idPredio = await resolveNearestPredioId(centroid as [number, number]);
    }
  }

  // Insert en super-tipo
  const wkt = geometryToWKT(item);
  const [rowProp] = await sql<{ id_propuesta: number | string }[]>`
    INSERT INTO sgs_pro_propuesta
      (tipo, actividad, id_predio, id_quebrada, id_accion)
    VALUES
      (${item.tipo}, ${item.actividad},
       ${idPredio}, ${item.id_quebrada}, ${idAccion})
    RETURNING id_propuesta;
  `;
  const idPropuesta = pgInt(rowProp.id_propuesta);

  // Insert en sub-tabla
  if (item.tipo === "punto") {
    await sql`
      INSERT INTO sgs_pro_propuesta_punto
        (actividad, este, norte, descripcion, tipo_punto, id_propuesta, geom)
      VALUES
        (${item.actividad},
         ${item.geometry.coordinates[0]}::numeric,
         ${item.geometry.coordinates[1]}::numeric,
         ${item.nombre},
         'importado',
         ${idPropuesta},
         ST_SetSRID(ST_GeomFromText(${wkt}), 4326));
    `;
  } else if (item.tipo === "linea") {
    await sql`
      INSERT INTO sgs_pro_propuesta_linea
        (actividad, longitud_m, longitud_km, id_propuesta, geom)
      VALUES
        (${item.actividad},
         ST_Length(ST_SetSRID(ST_GeomFromText(${wkt}), 4326)::geography),
         ST_Length(ST_SetSRID(ST_GeomFromText(${wkt}), 4326)::geography) / 1000,
         ${idPropuesta},
         ST_SetSRID(ST_GeomFromText(${wkt}), 4326));
    `;
  } else {
    await sql`
      INSERT INTO sgs_pro_propuesta_poligono
        (actividad, area_ha, area_m2, id_propuesta, geom)
      VALUES
        (${item.actividad},
         ST_Area(ST_SetSRID(ST_GeomFromText(${wkt}), 4326)::geography) / 10000,
         ST_Area(ST_SetSRID(ST_GeomFromText(${wkt}), 4326)::geography),
         ${idPropuesta},
         ST_SetSRID(ST_GeomFromText(${wkt}), 4326));
    `;
  }
  return idPropuesta;
}

export async function POST(req: Request): Promise<NextResponse<ImportResult>> {
  let payload: ImportPayload;
  try {
    payload = (await req.json()) as ImportPayload;
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        inserted: 0,
        ids: [],
        byType: { punto: 0, linea: 0, poligono: 0 },
        error: "JSON inválido",
        detail: (e as Error).message,
      },
      { status: 400 },
    );
  }

  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        inserted: 0,
        ids: [],
        byType: { punto: 0, linea: 0, poligono: 0 },
        error: "Sin items para importar",
      },
      { status: 400 },
    );
  }

  // Sanity check: cap de features para no abusar del endpoint
  const HARD_CAP = 2000;
  if (payload.items.length > HARD_CAP) {
    return NextResponse.json(
      {
        ok: false,
        inserted: 0,
        ids: [],
        byType: { punto: 0, linea: 0, poligono: 0 },
        error: `Límite excedido: ${payload.items.length} items (cap ${HARD_CAP}).`,
      },
      { status: 413 },
    );
  }

  // Validación por item
  for (let i = 0; i < payload.items.length; i++) {
    const it = payload.items[i];
    if (!it.geometry || !it.geometry.type) {
      return NextResponse.json(
        {
          ok: false,
          inserted: 0,
          ids: [],
          byType: { punto: 0, linea: 0, poligono: 0 },
          error: `Item #${i + 1} sin geometry válida`,
        },
        { status: 400 },
      );
    }
  }

  // Intentar transacción; si la BD no responde, devolvemos 503 con fallback
  const ids: number[] = [];
  const byType = { punto: 0, linea: 0, poligono: 0 };

  try {
    await sql.begin(async (tx) => {
      for (const item of payload.items) {
        // Reutilizamos insertPropuesta, pero apuntando a la tx
        const idAccion = await resolveAccionId(item.componente, item.accion);
        if (!idAccion) {
          throw new Error(
            `No se encontró sgs_com_accion para ${item.componente}+${item.accion}`,
          );
        }

        let idPredio = item.id_predio;
        if (idPredio == null && item.geometry.type === "Point") {
          idPredio = await resolveNearestPredioId(item.geometry.coordinates);
        }

        const wkt = geometryToWKT(item);

        const [rowProp] = await tx<{ id_propuesta: number | string }[]>`
          INSERT INTO sgs_pro_propuesta
            (tipo, actividad, id_predio, id_quebrada, id_accion)
          VALUES
            (${item.tipo}, ${item.actividad},
             ${idPredio}, ${item.id_quebrada}, ${idAccion})
          RETURNING id_propuesta;
        `;
        const idPropuesta = pgInt(rowProp.id_propuesta);
        ids.push(idPropuesta);

        if (item.tipo === "punto") {
          await tx`
            INSERT INTO sgs_pro_propuesta_punto
              (actividad, este, norte, descripcion, tipo_punto, id_propuesta, geom)
            VALUES
              (${item.actividad},
               ${item.geometry.coordinates[0]}::numeric,
               ${item.geometry.coordinates[1]}::numeric,
               ${item.nombre},
               'importado',
               ${idPropuesta},
               ST_SetSRID(ST_GeomFromText(${wkt}), 4326));
          `;
          byType.punto += 1;
        } else if (item.tipo === "linea") {
          await tx`
            INSERT INTO sgs_pro_propuesta_linea
              (actividad, longitud_m, longitud_km, id_propuesta, geom)
            VALUES
              (${item.actividad},
               ST_Length(ST_SetSRID(ST_GeomFromText(${wkt}), 4326)::geography),
               ST_Length(ST_SetSRID(ST_GeomFromText(${wkt}), 4326)::geography) / 1000,
               ${idPropuesta},
               ST_SetSRID(ST_GeomFromText(${wkt}), 4326));
          `;
          byType.linea += 1;
        } else {
          await tx`
            INSERT INTO sgs_pro_propuesta_poligono
              (actividad, area_ha, area_m2, id_propuesta, geom)
            VALUES
              (${item.actividad},
               ST_Area(ST_SetSRID(ST_GeomFromText(${wkt}), 4326)::geography) / 10000,
               ST_Area(ST_SetSRID(ST_GeomFromText(${wkt}), 4326)::geography),
               ${idPropuesta},
               ST_SetSRID(ST_GeomFromText(${wkt}), 4326));
          `;
          byType.poligono += 1;
        }
      }
    });

    return NextResponse.json({
      ok: true,
      inserted: ids.length,
      ids,
      byType,
    });
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    return NextResponse.json(
      {
        ok: false,
        inserted: 0,
        ids: [],
        byType,
        error: "No se pudo persistir la capa. ¿PostGIS disponible?",
        detail: msg,
      },
      { status: 503 },
    );
  }
}

/** Healthcheck opcional para el panel */
export async function GET(): Promise<NextResponse> {
  try {
    await sql`SELECT 1;`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 503 },
    );
  }
}