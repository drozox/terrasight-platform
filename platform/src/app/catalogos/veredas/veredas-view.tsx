"use client";

// =============================================================================
// VeredasView — wrapper cliente para el catalogo de veredas (HU-TC-07).
// FK idMunicipio via <select> con la lista corta de municipios. Poblacion
// opcional (default 0). Delete bloqueado si la vereda tiene predios.
// =============================================================================

import { Map } from "lucide-react";
import { CatalogoGenerico } from "../catalogo-generico";
import type { VeredaFull, MunicipioMini } from "@/lib/types";

type Actions = {
  onCreate: (fd: FormData) => Promise<{ ok: boolean; message: string }>;
  onUpdate: (fd: FormData) => Promise<{ ok: boolean; message: string }>;
  onDelete: (fd: FormData) => Promise<{ ok: boolean; message: string }>;
};

export function VeredasView({
  veredas,
  municipios,
  actions,
}: {
  veredas: VeredaFull[];
  municipios: MunicipioMini[];
  actions: Actions;
}) {
  const municipioOptions = municipios.map((m) => ({
    value: m.idMunicipio,
    label: m.nombreMunicipio,
  }));
  return (
    <CatalogoGenerico<VeredaFull>
      title="Veredas"
      description={`${veredas.length} veredas en ${municipios.length} municipio(s)`}
      icon={Map}
      data={veredas}
      pkName="idVereda"
      canEdit
      dependenciasMessage={(v) =>
        v.totalPredios > 0
          ? `Tiene ${v.totalPredios} predio(s) en esta vereda`
          : ""
      }
      columns={[
        { key: "nombreVereda", label: "Nombre" },
        { key: "nombreMunicipio", label: "Municipio" },
        { key: "poblacionEstimada", label: "Población", align: "right",
          render: (v) => v.poblacionEstimada.toLocaleString("es-CO") },
        { key: "codigoAdministrativo", label: "Código" },
        { key: "totalPredios", label: "Predios", align: "right" },
      ]}
      fields={[
        { name: "nombreVereda", label: "Nombre", type: "string", required: true, min: 2, max: 100 },
        { name: "idMunicipio", label: "Municipio", type: "select", required: true, options: municipioOptions },
        { name: "codigoAdministrativo", label: "Código administrativo", type: "string", required: true, min: 1, max: 20 },
        { name: "poblacionEstimada", label: "Población estimada", type: "number", min: 0, hint: "Opcional. Si se omite, 0." },
      ]}
      actions={actions}
      emptyMessage="Sin veredas registradas."
    />
  );
}
