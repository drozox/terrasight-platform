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
import { ACCIONES, type AccionCode } from "@/lib/acciones";
import { NuevaIntervencionForm } from "./nueva-intervencion-form";

export const metadata = { title: "Nueva intervención — SIG TERRITORIO" };

// Label pedido por el cliente para el dropdown COMPONENTE / ACCIÓN.
const CA_LABEL: Record<AccionCode, string> = {
  C1A1: "Componente 1 - Acción 1",
  C1A2: "Componente 1 - Acción 2",
  C2A1: "Componente 2 - Acción 1",
  C2A2: "Componente 2 - Acción 2",
  C3AU: "Componente 3 - Única Acción",
};

export default async function NuevaIntervencionPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; error?: string }>;
}) {
  await requireRole(["ADMIN", "GESTOR"] as const);
  const [accionesFull, predios, municipios, veredas, propietarios, sp] =
    await Promise.all([
      listAccionesFull(),
      listPredios(),
      listMunicipios(),
      listVeredas(),
      listPropietarios(),
      searchParams,
    ]);

  // ERROR 1: el dropdown muestra SOLO las 5 acciones canónicas (C1A1..C3AU),
  // no las 7 filas de sgs_com_accion. Mapeamos cada código a la fila real de la
  // BD por (componente, nombre) — así el id_accion enviado es el correcto.
  const acciones = ACCIONES.map((def) => {
    const row = accionesFull.find(
      (a) => a.nombreComponente === def.componente && def.nombres.includes(a.nombre),
    );
    if (!row) return null;
    return {
      idAccion: row.idAccion,
      code: def.code,
      label: `${def.code} — ${CA_LABEL[def.code]}`,
    };
  }).filter((o): o is { idAccion: number; code: AccionCode; label: string } => o !== null);

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
                Selecciona el tipo, dibuja o importá la geometría y completa
                los datos. El cálculo de área (polígonos), longitud (líneas) y
                coordenadas (puntos) se calcula automáticamente.
              </p>
            </div>
          </div>

          <NuevaIntervencionForm
            acciones={acciones}
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
