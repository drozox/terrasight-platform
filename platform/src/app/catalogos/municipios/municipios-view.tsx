"use client";

// =============================================================================
// MunicipiosView — wrapper cliente para el catalogo de municipios (HU-TC-06).
// Usa CatalogoGenerico (componente generico) parametrizado con columns/fields
// y las 3 server actions (create/update/delete). Delete se bloquea si el
// municipio tiene veredas o predios linkeados (pre-check en repository).
// =============================================================================

import { Building2 } from "lucide-react";
import { CatalogoGenerico } from "../catalogo-generico";
import type { MunicipioFull } from "@/lib/repository";

type Actions = {
  onCreate: (fd: FormData) => Promise<{ ok: boolean; message: string }>;
  onUpdate: (fd: FormData) => Promise<{ ok: boolean; message: string }>;
  onDelete: (fd: FormData) => Promise<{ ok: boolean; message: string }>;
};

export function MunicipiosView({
  municipios,
  actions,
}: {
  municipios: MunicipioFull[];
  actions: Actions;
}) {
  return (
    <CatalogoGenerico<MunicipioFull>
      title="Municipios"
      description={`${municipios.length} municipios en el modelo BDG`}
      icon={Building2}
      data={municipios}
      pkName="idMunicipio"
      canEdit
      dependenciasMessage={(m) =>
        m.totalVeredas > 0
          ? `Tiene ${m.totalVeredas} vereda(s) y ${m.totalPredios} predio(s) linkeados`
          : ""
      }
      columns={[
        { key: "nombreMunicipio", label: "Nombre" },
        { key: "departamento", label: "Departamento" },
        { key: "codigoAdministrativo", label: "Código" },
        { key: "totalVeredas", label: "Veredas", align: "right" },
        { key: "totalPredios", label: "Predios", align: "right" },
        {
          key: "createdAt",
          label: "Creado",
          render: (r) => r.createdAt?.toLocaleDateString("es-CO") ?? "—",
        },
      ]}
      fields={[
        { name: "nombreMunicipio", label: "Nombre", type: "string", required: true, min: 2, max: 100 },
        { name: "departamento", label: "Departamento", type: "string", required: true, min: 2, max: 100 },
        { name: "codigoAdministrativo", label: "Código administrativo", type: "string", required: true, min: 1, max: 20 },
      ]}
      actions={actions}
      emptyMessage="Sin municipios registrados."
    />
  );
}
