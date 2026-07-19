"use client";

// =============================================================================
// Vista interactiva de la ficha de intervención (HU-IC-01..04).
// Orquesta los sub-componentes:
//   - Datos básicos (grid)
//   - Mapa mini (IntervencionMapa)
//   - Avance (AvanceForm)
//   - Timeline (Timeline)
//   - Estado editable (EstadoIntervencionDropdown)
// =============================================================================

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Wrench,
  MapPin,
  Droplets,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { IntervencionCompleta } from "@/lib/repository";
import { EstadoIntervencionDropdown } from "../estado-dropdown";
import { IntervencionMapa } from "./mapa-mini";
import { AvanceForm } from "./avance-form";
import { Timeline } from "./timeline";

type Flash = { tipo: "ok" | "error"; msg: string };

export function IntervencionDetail({
  initial,
  canEdit,
}: {
  initial: IntervencionCompleta;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [flash, setFlash] = React.useState<Flash | null>(null);

  function showFlash(f: Flash) {
    setFlash(f);
    if (f.tipo === "ok") setTimeout(() => setFlash(null), 4000);
  }

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {flash && (
        <div
          role="status"
          className={
            flash.tipo === "ok"
              ? "flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-body-sm text-primary"
              : "flex items-start gap-2 rounded-lg border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error"
          }
        >
          {flash.tipo === "ok" ? (
            <CheckCircle2 className="mt-0.5 size-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 size-4 flex-shrink-0" />
          )}
          <span>{flash.msg}</span>
        </div>
      )}

      {/* ---- Estado editable + datos básicos ---- */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-label-lg font-bold uppercase tracking-wider text-on-surface-variant">
            Datos básicos
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase text-on-surface-variant">
              Estado:
            </span>
            <EstadoIntervencionDropdown
              idPropuesta={initial.id}
              estado={initial.estado}
              canEdit={canEdit}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-body-sm sm:grid-cols-3">
          <Field label="Tipo" icon={<Layers className="size-3.5" />}>
            <span className="capitalize">{initial.tipo}</span>
          </Field>

          <Field label="Componente" icon={<Layers className="size-3.5" />}>
            {initial.accion?.componente ? (
              <Badge variant="primary">{initial.accion.componente}</Badge>
            ) : (
              "—"
            )}
          </Field>

          <Field label="Acción" icon={<Wrench className="size-3.5" />}>
            {initial.accion?.nombre ? (
              <Badge variant="outline">{initial.accion.nombre}</Badge>
            ) : (
              "—"
            )}
          </Field>

          <Field label="Predio" icon={<Building2 className="size-3.5" />}>
            {initial.predio ? (
              <Link
                href={`/predios/${initial.predio.id}`}
                className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
              >
                {initial.predio.codigo}
                <ExternalLink className="size-3" />
              </Link>
            ) : (
              "—"
            )}
          </Field>

          <Field label="Municipio" icon={<MapPin className="size-3.5" />}>
            {initial.municipio?.nombre ?? "—"}
            {initial.municipio?.departamento ? (
              <span className="ml-1 text-[11px] text-on-surface-variant">
                · {initial.municipio.departamento}
              </span>
            ) : null}
          </Field>

          <Field label="Vereda" icon={<MapPin className="size-3.5" />}>
            {initial.vereda?.nombre ?? "—"}
          </Field>

          <Field label="Quebrada" icon={<Droplets className="size-3.5" />}>
            {initial.quebrada?.nombre ?? <span className="text-on-surface-variant/60">N/A</span>}
          </Field>

          <Field
            label="Fecha de creación"
            icon={<Calendar className="size-3.5" />}
          >
            {formatDate(initial.createdAt)}
          </Field>

          <Field label="Actividad">
            <span className="text-on-surface">
              {initial.actividad || "—"}
            </span>
          </Field>
        </div>
      </Card>

      {/* ---- Geometría ---- */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-outline-variant px-5 py-3">
          <h2 className="text-label-lg font-bold uppercase tracking-wider text-on-surface-variant">
            Geometría
          </h2>
          <span className="text-[11px] text-on-surface-variant">
            {initial.tipo === "punto" && "Punto en el mapa"}
            {initial.tipo === "linea" && "Línea en el mapa"}
            {initial.tipo === "poligono" && "Polígono en el mapa"}
          </span>
        </div>
        <div className="p-3">
          <IntervencionMapa intervencion={initial} />
        </div>
      </Card>

      {/* ---- Avance ---- */}
      <Card className="p-5">
        <h2 className="mb-4 text-label-lg font-bold uppercase tracking-wider text-on-surface-variant">
          Avance
        </h2>
        <AvanceForm
          idPropuesta={initial.id}
          avanceActual={initial.avancePctActual}
          canEdit={canEdit}
          onUpdate={(msg) => {
            showFlash({ tipo: "ok", msg });
            refresh();
          }}
          onError={(msg) => showFlash({ tipo: "error", msg })}
        />
      </Card>

      {/* ---- Timeline ---- */}
      <Card className="p-5">
        <h2 className="mb-4 text-label-lg font-bold uppercase tracking-wider text-on-surface-variant">
          Histórico de avances
        </h2>
        {/* Excluimos el backfill (migración 06) para no mostrar el evento
            "Backfill inicial (migración 06)" como primera entrada. */}
        <Timeline avances={initial.avances.filter((a) => !a.esBackfill)} />
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Field — label + value, con icono opcional.
// -----------------------------------------------------------------------------
function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase text-on-surface-variant">
        {icon}
        {label}
      </p>
      <p className="font-bold text-on-surface">{children}</p>
    </div>
  );
}
