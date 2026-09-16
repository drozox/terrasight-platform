// =============================================================================
// /intervenciones/nueva — Alta de intervención/propuesta (DEEPSEEK-F2.2 + AJUSTE 4)
//
// Server Component: valida rol, carga catalogos (acciones, predios,
// municipios, veredas, propietarios) y delega al form client con mapa
// interactivo para dibujar la geometría.
// =============================================================================

import Link from "next/link";
import { ArrowLeft, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth-guard";
import {
  listAccionesFull,
  listPredios,
  listMunicipios,
  listVeredas,
  listPropietarios,
} from "@/lib/repos";
import { NuevaIntervencionForm } from "./nueva-intervencion-form";

export const metadata = { title: "Nueva intervención — SIG TERRITORIO" };

export default async function NuevaIntervencionPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; error?: string }>;
}) {
  await requireRole(["ADMIN", "GESTOR"] as const);
  const [acciones, predios, municipios, veredas, propietarios, sp] =
    await Promise.all([
      listAccionesFull(),
      listPredios(),
      listMunicipios(),
      listVeredas(),
      listPropietarios(),
      searchParams,
    ]);
  const initialTipo =
    sp?.tipo === "punto" || sp?.tipo === "linea" || sp?.tipo === "poligono"
      ? sp.tipo
      : null;
  const initialError = sp?.error ? decodeURIComponent(sp.error) : null;

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-5xl flex-col gap-gutter">
        <Link
          href="/intervenciones"
          className="inline-flex w-fit items-center gap-2 text-label-lg font-bold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Volver a Intervenciones
        </Link>

        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <Wrench className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">
                Nueva intervención
              </h1>
              <p className="text-body-sm text-on-surface-variant">
                Selecciona el tipo, dibuja la geometría en el mapa y completa
                los datos. El cálculo de área (polígonos), longitud (líneas) y
                coordenadas (puntos) se calcula automáticamente.
              </p>
            </div>
          </div>

          <NuevaIntervencionForm
            acciones={acciones.map((a) => ({
              idAccion: a.idAccion,
              nombre: a.nombre,
              nombreComponente: a.nombreComponente,
            }))}
            predios={predios.map((p) => ({
              idPredio: p.idPredio,
              nombrePredio: p.nombrePredio,
            }))}
            municipios={municipios.map((m) => ({
              idMunicipio: m.idMunicipio,
              nombre: m.nombreMunicipio,
            }))}
            veredas={veredas.map((v) => ({
              idVereda: v.idVereda,
              nombre: v.nombreVereda,
              idMunicipio: v.idMunicipio,
            }))}
            propietarios={propietarios.map((p) => ({
              idPropietario: p.idPropietario,
              nombre: p.nombreRazonSocial ?? "(sin nombre)",
            }))}
            initialTipo={initialTipo}
            initialError={initialError}
          />
        </Card>
      </div>
    </div>
  );
}
