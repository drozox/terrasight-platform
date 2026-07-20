// =============================================================================
// /analisis — Análisis espacial (HU-AA-02..04)
// Server Component: lee search params para correr el buffer / bbox si los hay.
// =============================================================================

import Link from "next/link";
import { PieChart, Droplet, Wrench, MapPin, Square } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getCoberturaVegetal } from "@/lib/repos";
import {
  getMatrizComponenteMunicipio,
  getAnalisisBuffer,
  listQuebradasFull,
  listPropuestasSimple,
  getCoberturaPorMunicipio,
  getIntersectPorBoundingBox,
} from "@/lib/repos";
import { isBufferTarget } from "@/lib/constants";
import type { BufferTarget } from "@/lib/types";
import { BufferForm } from "./buffer-form";
import { BufferResults } from "./buffer-results";
import { MatrizTable } from "./matriz-table";
import { CoberturaSection } from "./cobertura-section";
import { CoberturaPorMunicipio } from "./cobertura-municipio-section";
import { IntersectionBBoxForm } from "./intersection-bbox-form";
import { IntersectionResults } from "./intersection-results";
import { requireRole } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Análisis Espacial — TerraSight" };

type SearchParams = Promise<{
  btipo?: string;
  bid?: string;
  bdistancia?: string;
  ibbox_minLon?: string;
  ibbox_minLat?: string;
  ibbox_maxLon?: string;
  ibbox_maxLat?: string;
}>;

function parseNum(v: string | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function AnalisisPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["ADMIN", "ANALISTA"] as const);
  const sp = await searchParams;

  const [quebradas, propuestas, cobertura, matriz, coberturaPorMun] = await Promise.all([
    listQuebradasFull(),
    listPropuestasSimple(200),
    getCoberturaVegetal(),
    getMatrizComponenteMunicipio(),
    getCoberturaPorMunicipio(),
  ]);

  // Si hay parámetros de búsqueda, corremos el análisis buffer.
  let buffer:
    | { kind: "ok"; items: Awaited<ReturnType<typeof getAnalisisBuffer>>; tipo: BufferTarget; id: number; distanciaM: number }
    | { kind: "error"; message: string }
    | null = null;

  if (sp.btipo && sp.bid && sp.bdistancia) {
    const tipo = sp.btipo;
    const id = parseNum(sp.bid);
    const distanciaM = parseNum(sp.bdistancia);
    if (!isBufferTarget(tipo) || id == null || distanciaM == null) {
      buffer = { kind: "error", message: "Parámetros incompletos o inválidos." };
    } else {
      try {
        const items = await getAnalisisBuffer({ target: tipo, id, distanciaM });
        buffer = { kind: "ok", items, tipo, id, distanciaM };
      } catch (err) {
        buffer = { kind: "error", message: (err as Error).message };
      }
    }
  }

  // Intersección por bounding box (HU-AA-03)
  let bboxInit: { minLon: string; minLat: string; maxLon: string; maxLat: string } | null = null;
  let bboxResult: Awaited<ReturnType<typeof getIntersectPorBoundingBox>> | null = null;
  let bboxError: string | null = null;
  if (sp.ibbox_minLon && sp.ibbox_minLat && sp.ibbox_maxLon && sp.ibbox_maxLat) {
    bboxInit = {
      minLon: sp.ibbox_minLon,
      minLat: sp.ibbox_minLat,
      maxLon: sp.ibbox_maxLon,
      maxLat: sp.ibbox_maxLat,
    };
    const minLon = parseNum(sp.ibbox_minLon);
    const minLat = parseNum(sp.ibbox_minLat);
    const maxLon = parseNum(sp.ibbox_maxLon);
    const maxLat = parseNum(sp.ibbox_maxLat);
    if (minLon == null || minLat == null || maxLon == null || maxLat == null) {
      bboxError = "bbox inválido: todos los valores deben ser numéricos.";
    } else {
      try {
        bboxResult = await getIntersectPorBoundingBox({ minLon, minLat, maxLon, maxLat });
      } catch (err) {
        bboxError = (err as Error).message;
      }
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-surface-container-lowest px-margin-edge py-6">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tertiary/10 text-tertiary">
            <PieChart className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Análisis Espacial</h1>
            <p className="text-body-sm text-on-surface-variant">
              Buffer, distancia e influencia territorial sobre predios, quebradas y propuestas.
              Cálculos PostGIS en vivo sobre la base.
            </p>
          </div>
        </div>
      </header>

      {/* =================================================================
          1. Análisis Buffer
          ================================================================= */}
      <section className="mb-8" id="buffer">
        <h2 className="mb-3 flex items-center gap-2 text-title-lg font-bold text-on-surface">
          <Droplet className="size-5 text-info" />
          Buffer / Distancia
        </h2>
        <Card className="p-6">
          <p className="mb-4 text-body-sm text-on-surface-variant">
            Elegí una fuente (quebrada o propuesta) y un radio. Te devolvemos
            qué entidades caen adentro y a qué distancia, ordenadas de más
            cercano a más lejano. Usa PostGIS con cálculo geodésico
            (geografía) — los radios están en metros.
          </p>

          <BufferForm
            quebradas={quebradas}
            propuestas={propuestas}
            initial={{
              tipo: sp.btipo ?? "",
              id:   sp.bid ?? "",
              distancia: sp.bdistancia ?? "500",
            }}
          />

          {buffer && buffer.kind === "error" && (
            <div role="alert" className="mt-4 rounded-lg border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error">
              {buffer.message}
            </div>
          )}
          {buffer && buffer.kind === "ok" && (
            <BufferResults
              items={buffer.items}
              targetTipo={buffer.tipo}
              targetId={buffer.id}
              distanciaM={buffer.distanciaM}
              quebradas={quebradas}
              propuestas={propuestas}
            />
          )}
        </Card>
      </section>

      {/* =================================================================
          2. Matriz componente × municipio
          ================================================================= */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-title-lg font-bold text-on-surface">
          <Wrench className="size-5 text-tertiary" />
          Cobertura por municipio
        </h2>
        <Card className="p-6">
          <p className="mb-4 text-body-sm text-on-surface-variant">
            Cuántas propuestas tiene cada municipio y cuántas hectáreas
            intervenidas por componente. Sirve para detectar desequilibrios
            territoriales rápidos.
          </p>
          <MatrizTable rows={matriz} />
        </Card>
      </section>

      {/* =================================================================
          3. Cobertura vegetal (ya existía) — distribución global
          ================================================================= */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-title-lg font-bold text-on-surface">
          <MapPin className="size-5 text-primary" />
          Cobertura vegetal
        </h2>
        <Card className="p-6">
          <CoberturaSection data={cobertura} />
        </Card>
      </section>

      {/* =================================================================
          4. Cobertura CLC × municipio (HU-AA-03)
          ================================================================= */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-title-lg font-bold text-on-surface">
          <MapPin className="size-5 text-secondary" />
          Cobertura CLC por municipio
        </h2>
        <Card className="p-6">
          <p className="mb-4 text-body-sm text-on-surface-variant">
            Porcentaje de cada tipo de cobertura del mapa CLC (Corine Land
            Cover) por municipio, cruzada con los predios del convenio. Útil
            para entender el contexto territorial antes de priorizar
            intervenciones.
          </p>
          <CoberturaPorMunicipio filas={coberturaPorMun} />
        </Card>
      </section>

      {/* =================================================================
          5. Intersección por bounding box (HU-AA-03)
          ================================================================= */}
      <section className="mb-8" id="bbox">
        <h2 className="mb-3 flex items-center gap-2 text-title-lg font-bold text-on-surface">
          <Square className="size-5 text-info" />
          Intersección por bounding box
        </h2>
        <Card className="p-6">
          <p className="mb-4 text-body-sm text-on-surface-variant">
            Definí un rectángulo geográfico (lon/lat WGS84). El sistema
            devuelve qué predios y propuestas caen dentro, con totales de
            hectáreas y densidad territorial. Útil para análisis rápidos de
            zonas específicas sin salir de la plataforma.
          </p>

          <IntersectionBBoxForm initial={bboxInit} />

          <IntersectionResults result={bboxResult} error={bboxError} />
        </Card>
      </section>

      <footer className="mb-6 border-t border-outline-variant pt-4 text-[11px] text-on-surface-variant">
        Próximas: dibujar polígono a mano en el mapa (en lugar de bbox) y
        exportar los análisis a CSV/GeoJSON.
      </footer>
    </div>
  );
}
