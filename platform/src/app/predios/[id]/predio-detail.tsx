"use client";

// =============================================================================
// Vista interactiva del predio (HU-TC-01):
// - Modo lectura (default)
// - Botón "Editar" → pasa a modo edición con <PredioForm mode="edit">
// =============================================================================

import * as React from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PredioFull, PropietarioMini, VeredaMini } from "@/lib/repository";
import type { MapFeature } from "@/lib/types";
import { PredioForm } from "../predio-form";

export function PredioDetail({
  initial,
  featureResumen,
  canEdit,
  propietarios,
  veredas,
}: {
  initial: PredioFull;
  featureResumen: MapFeature | null;
  canEdit: boolean;
  propietarios: PropietarioMini[];
  veredas: VeredaMini[];
}) {
  const [editing, setEditing] = React.useState(false);

  const propietario = propietarios.find((p) => p.idPropietario === initial.idPropietario);
  const vereda = veredas.find((v) => v.idVereda === initial.idVereda);

  if (editing && canEdit) {
    return (
      <>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-label-lg font-semibold text-on-surface-variant">
            Editando registro
          </p>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
        <PredioForm
          mode="edit"
          initial={initial}
          propietarios={propietarios}
          veredas={veredas}
        />
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 text-body-sm sm:grid-cols-3">
        <Field label="Código">
          {featureResumen?.properties.codigo ?? `PR-${String(initial.idPredio).padStart(5, "0")}`}
        </Field>
        <Field label="Cédula catastral">{initial.cedulaCatastral}</Field>
        <Field label="Cédula anterior">{initial.cedulaAnt}</Field>
        <Field label="Núcleo predial">{initial.nucleoPredial}</Field>
        <Field label="Área">{initial.areaHa.toLocaleString("es-CO", { maximumFractionDigits: 2 })} ha</Field>
        <Field label="Perímetro">{initial.perimetro.toLocaleString("es-CO", { maximumFractionDigits: 2 })} m</Field>
        <Field label="Centroide">
          {initial.latitudCentroide.toFixed(4)}, {initial.longitudCentroide.toFixed(4)}
        </Field>
        <Field label="Propietario">
          {propietario?.nombreRazonSocial ?? `id=${initial.idPropietario}`}
        </Field>
        <Field label="Vereda / Municipio">
          {vereda ? `${vereda.nombreVereda} · ${vereda.nombreMunicipio}` : `id=${initial.idVereda}`}
        </Field>
      </div>

      {initial.observaciones && (
        <div className="mt-6 rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
          <p className="mb-1 text-[10px] font-bold uppercase text-on-surface-variant">Observaciones</p>
          <p className="whitespace-pre-wrap text-body-sm text-on-surface">
            {initial.observaciones}
          </p>
        </div>
      )}

      {canEdit && (
        <div className="mt-6 flex justify-end border-t border-outline-variant pt-4">
          <Button onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            Editar registro
          </Button>
        </div>
      )}

      <aside className="mt-6 rounded-lg bg-surface-container-low p-3 text-[11px] text-on-surface-variant">
        Próximas funciones: visualización del polígono en mapa, historial de
        intervenciones, carga de documentos legales.
      </aside>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-on-surface-variant">{label}</p>
      <p className="font-bold text-on-surface">{children}</p>
    </div>
  );
}
