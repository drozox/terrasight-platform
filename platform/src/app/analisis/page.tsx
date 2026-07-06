// =============================================================================
// /analisis — Análisis espacial (HU-AA-02..04)
// Server Component: lee search params para correr el buffer si los hay.
// =============================================================================

import Link from "next/link";
import { PieChart, Droplet, Wrench, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getCoberturaVegetal } from "@/lib/repository";
import {
  getMatrizComponenteMunicipio,
  getAnalisisBuffer,
  listQuebradasFull,
  listPropuestasSimple,
  type BufferTarget,
  isBufferTarget,
} from "@/lib/repository";
import { BufferForm } from "./buffer-form";
import { BufferResults } from "./buffer-results";
import { MatrizTable } from "./matriz-table";
import { CoberturaSection } from "./cobertura-section";
import { requireUser } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Análisis Espacial — TerraSight" };

type SearchParams = Promise<{
  btipo?: string;        // 'quebrada' | 'propuesta' (evita colisión con tipo de propuesta)
  bid?: string;
  bdistancia?: string;
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
  await requireUser();
  const sp = await searchParams;

  const [quebradas, propuestas, cobertura, matriz] = await Promise.all([
    listQuebradasFull(),
    listPropuestasSimple(200),
    getCoberturaVegetal(),
    getMatrizComponenteMunicipio(),
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
          3. Cobertura vegetal (ya existía)
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

      <footer className="mb-6 border-t border-outline-variant pt-4 text-[11px] text-on-surface-variant">
        Próximas: intersección de capas por componente, área de influencia a
        partir de un punto dibujado en mapa.
      </footer>
    </div>
  );
}
