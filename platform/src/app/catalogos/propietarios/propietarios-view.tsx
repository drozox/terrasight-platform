"use client";

// =============================================================================
// PropietariosView — wrapper cliente para el catalogo de propietarios
// (HU-TC-08). Telefono opcional validado por regex en el repository.
// Delete bloqueado si tiene predios asociados.
// =============================================================================

import { Users } from "lucide-react";
import { CatalogoGenerico } from "../catalogo-generico";
import type { PropietarioFull } from "@/lib/repository";

type Actions = {
  onCreate: (fd: FormData) => Promise<{ ok: boolean; message: string }>;
  onUpdate: (fd: FormData) => Promise<{ ok: boolean; message: string }>;
  onDelete: (fd: FormData) => Promise<{ ok: boolean; message: string }>;
};

export function PropietariosView({
  propietarios,
  actions,
}: {
  propietarios: PropietarioFull[];
  actions: Actions;
}) {
  return (
    <CatalogoGenerico<PropietarioFull>
      title="Propietarios"
      description={`${propietarios.length} propietario(s) en el modelo BDG`}
      icon={Users}
      data={propietarios}
      pkName="idPropietario"
      canEdit
      dependenciasMessage={(p) =>
        p.totalPredios > 0
          ? `Tiene ${p.totalPredios} predio(s) asociado(s)`
          : ""
      }
      columns={[
        { key: "nombreRazonSocial", label: "Nombre / Razón social" },
        { key: "telefono", label: "Teléfono" },
        { key: "totalPredios", label: "Predios", align: "right" },
        {
          key: "createdAt",
          label: "Creado",
          render: (r) => r.createdAt?.toLocaleDateString("es-CO") ?? "—",
        },
      ]}
      fields={[
        { name: "nombreRazonSocial", label: "Nombre / Razón social", type: "string", required: true, min: 2, max: 200 },
        {
          name: "telefono",
          label: "Teléfono",
          type: "string",
          required: false,
          min: 7,
          max: 20,
          hint: "Opcional. 7-20 chars, permite dígitos, espacios, guiones, + y ().",
        },
      ]}
      actions={actions}
      emptyMessage="Sin propietarios registrados."
    />
  );
}
