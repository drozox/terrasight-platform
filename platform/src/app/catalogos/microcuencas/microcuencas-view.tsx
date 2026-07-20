"use client";

// =============================================================================
// MicrocuencasView — wrapper cliente para el catalogo de microcuencas
// (HU-TC-09). Codigo es UNIQUE; area/lat/lon son opcionales. Delete
// bloqueado si hay quebradas asociadas.
// =============================================================================

import { Droplet } from "lucide-react";
import { CatalogoGenerico } from "../catalogo-generico";
import type { MicrocuencaFull } from "@/lib/types";

type Actions = {
  onCreate: (fd: FormData) => Promise<{ ok: boolean; message: string }>;
  onUpdate: (fd: FormData) => Promise<{ ok: boolean; message: string }>;
  onDelete: (fd: FormData) => Promise<{ ok: boolean; message: string }>;
};

export function MicrocuencasView({
  microcuencas,
  actions,
}: {
  microcuencas: MicrocuencaFull[];
  actions: Actions;
}) {
  return (
    <CatalogoGenerico<MicrocuencaFull>
      title="Microcuencas"
      description={`${microcuencas.length} microcuenca(s) en el modelo BDG`}
      icon={Droplet}
      data={microcuencas}
      pkName="idMicrocuenca"
      canEdit
      dependenciasMessage={(m) =>
        m.totalQuebradas > 0
          ? `Tiene ${m.totalQuebradas} quebrada(s) asociada(s)`
          : ""
      }
      columns={[
        { key: "nombreMicrocuenca", label: "Nombre" },
        { key: "codigo", label: "Código" },
        { key: "area", label: "Área (ha)", align: "right",
          render: (r) => r.area.toLocaleString("es-CO", { maximumFractionDigits: 2 }) },
        { key: "latitud", label: "Lat", align: "right",
          render: (r) => r.latitud.toFixed(4) },
        { key: "longitud", label: "Lon", align: "right",
          render: (r) => r.longitud.toFixed(4) },
        { key: "totalQuebradas", label: "Quebradas", align: "right" },
      ]}
      fields={[
        { name: "nombreMicrocuenca", label: "Nombre", type: "string", required: true, min: 2, max: 200 },
        { name: "codigo", label: "Código", type: "string", required: true, min: 1, max: 20, hint: "Identificador de negocio (UNIQUE)." },
        { name: "area", label: "Área (ha)", type: "number", min: 0, hint: "Opcional. 0 si se omite." },
        { name: "latitud", label: "Latitud", type: "number", min: -90, max: 90, hint: "Opcional. -90 a 90." },
        { name: "longitud", label: "Longitud", type: "number", min: -180, max: 180, hint: "Opcional. -180 a 180." },
        { name: "nombreUsuarios", label: "Comunidad / usuarios", type: "string", required: false, max: 200, hint: "Opcional." },
      ]}
      actions={actions}
      emptyMessage="Sin microcuencas registradas."
    />
  );
}
