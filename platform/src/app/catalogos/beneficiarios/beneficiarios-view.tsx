"use client";

// =============================================================================
// BeneficiariosView — wrapper cliente para el catalogo de beneficiarios
// (HU-TC-10). Telefono es OBLIGATORIO (UNIQUE (nombre, telefono)).
// Vereda/municipio son strings (no FKs a tablas en este modelo).
// Delete bloqueado si tiene relaciones a puntos de monitoreo.
// =============================================================================

import { UserCheck } from "lucide-react";
import { CatalogoGenerico } from "../catalogo-generico";
import type { BeneficiarioFull } from "@/lib/types";

type Actions = {
  onCreate: (fd: FormData) => Promise<{ ok: boolean; message: string }>;
  onUpdate: (fd: FormData) => Promise<{ ok: boolean; message: string }>;
  onDelete: (fd: FormData) => Promise<{ ok: boolean; message: string }>;
};

export function BeneficiariosView({
  beneficiarios,
  actions,
}: {
  beneficiarios: BeneficiarioFull[];
  actions: Actions;
}) {
  return (
    <CatalogoGenerico<BeneficiarioFull>
      title="Beneficiarios"
      description={`${beneficiarios.length} beneficiario(s) registrado(s)`}
      icon={UserCheck}
      data={beneficiarios}
      pkName="idUsuario"
      canEdit
      dependenciasMessage={(b) =>
        b.totalRelaciones > 0
          ? `Asociado a ${b.totalRelaciones} punto(s) de monitoreo`
          : ""
      }
      columns={[
        { key: "nombre", label: "Nombre" },
        { key: "telefono", label: "Teléfono" },
        { key: "vereda", label: "Vereda" },
        { key: "municipio", label: "Municipio" },
        { key: "totalRelaciones", label: "Puntos", align: "right" },
      ]}
      fields={[
        { name: "nombre", label: "Nombre", type: "string", required: true, min: 2, max: 200 },
        {
          name: "telefono",
          label: "Teléfono",
          type: "string",
          required: true,
          min: 7,
          max: 20,
          hint: "Obligatorio. 7-20 chars, dígitos, espacios, guiones, + y ().",
        },
        { name: "vereda", label: "Vereda", type: "string", required: false, max: 200, hint: "Opcional." },
        { name: "municipio", label: "Municipio", type: "string", required: false, max: 200, hint: "Opcional." },
      ]}
      actions={actions}
      emptyMessage="Sin beneficiarios registrados."
    />
  );
}
