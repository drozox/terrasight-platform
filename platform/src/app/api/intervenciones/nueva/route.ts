// =============================================================================
// /api/intervenciones/nueva — POST (DEEPSEEK-F2.2 + AJUSTE 4)
//
// Crea una propuesta/intervención nueva con geometría dibujada en el form
// (Leaflet.draw). Recibe la geometría como JSON-string en el campo `geom`
// y la pasa a `crearPropuestaConGeometria` que inserta en la tabla hija
// correspondiente.
//
// Valida que el usuario tenga rol ADMIN o GESTOR.
// =============================================================================

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-guard";
import { crearPropuesta, crearPropuestaConGeometria } from "@/lib/repos/propuestas";

export const dynamic = "force-dynamic";

// Estados validos del workflow (migracion 33).
const ESTADOS_VALIDOS = new Set([
  "BORRADOR",
  "EN_REVISION",
  "APROBADA",
  "EN_EJECUCION",
  "FINALIZADA",
]);

function asString(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v : "";
}
function asIntOrNull(v: FormDataEntryValue | null): number | null {
  const s = asString(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(req: Request) {
  const usuario = await getCurrentUser();
  if (!usuario || (usuario.rol !== "ADMIN" && usuario.rol !== "GESTOR")) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }

  const tipo = asString(form.get("tipo"));
  if (tipo !== "punto" && tipo !== "linea" && tipo !== "poligono") {
    return NextResponse.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
  }

  const idAccion = Number(asString(form.get("idAccion")));
  if (!Number.isFinite(idAccion) || idAccion <= 0) {
    return NextResponse.json({ ok: false, error: "Acción inválida" }, { status: 400 });
  }

  const actividad = asString(form.get("actividad")).trim();
  if (!actividad) {
    return NextResponse.json({ ok: false, error: "Actividad requerida" }, { status: 400 });
  }

  const idPredio = asIntOrNull(form.get("idPredio"));
  const idMunicipio = asIntOrNull(form.get("idMunicipio"));
  const idVereda = asIntOrNull(form.get("idVereda"));
  const idPropietario = asIntOrNull(form.get("idPropietario"));
  const descripcion = asString(form.get("descripcion")).trim();
  const observaciones = asString(form.get("observaciones")).trim();
  const fecha = asString(form.get("fecha")).trim();
  const estado = asString(form.get("estado")).trim() || "BORRADOR";
  const geomRaw = asString(form.get("geom")).trim();

  if (!ESTADOS_VALIDOS.has(estado)) {
    return NextResponse.json({ ok: false, error: `Estado inválido (${estado})` }, { status: 400 });
  }

  // Dos caminos: con geometría (AJUSTE 4) o legacy (sin geom — DEEPSEEK-F2.2).
  try {
    if (geomRaw) {
      let geomObj: GeoJSON.Geometry | null = null;
      try {
        const parsed = JSON.parse(geomRaw);
        if (parsed && typeof parsed === "object" && "type" in parsed) {
          geomObj = parsed as GeoJSON.Geometry;
        }
      } catch {
        return NextResponse.json({ ok: false, error: "Geom JSON inválido" }, { status: 400 });
      }
      if (!geomObj) {
        return NextResponse.json({ ok: false, error: "Falta la geometría" }, { status: 400 });
      }
      const expectedGeomType =
        tipo === "punto" ? "Point" : tipo === "linea" ? "LineString" : "Polygon";
      if (
        geomObj.type !== expectedGeomType &&
        !geomObj.type.startsWith("Multi")
      ) {
        return NextResponse.json(
          { ok: false, error: `Geom tipo ${geomObj.type} no coincide con ${tipo}` },
          { status: 400 },
        );
      }
      const { idPropuesta } = await crearPropuestaConGeometria({
        tipo,
        idAccion,
        idPredio,
        idMunicipio,
        idVereda,
        idPropietario,
        actividad,
        descripcion: descripcion || undefined,
        estado: estado as "BORRADOR",
        fecha: fecha || undefined,
        geomGeoJSON: geomObj,
      });
      return NextResponse.json({ ok: true, id: idPropuesta });
    }

    // Legacy: crear solo propuesta (sin hija). El form pudo elegir tipo sin geom.
    const { idPropuesta } = await crearPropuesta({
      tipo,
      idAccion,
      idPredio,
      actividad,
      observaciones: observaciones || undefined,
    });
    return NextResponse.json({ ok: true, id: idPropuesta });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
