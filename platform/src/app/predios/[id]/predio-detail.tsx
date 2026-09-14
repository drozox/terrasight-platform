"use client";

// =============================================================================
// Vista interactiva del predio (HU-TC-01) — DEEPSEEK-71 (F4):
// - Modo lectura (default)
// - Botón "Editar" → pasa a modo edición con <PredioForm mode="edit">
// - Mapa del polígono
// - Sección "Intervenciones del predio"
// - Sección "Ambiental (Fase 6)"
// =============================================================================

import * as React from "react";
import Link from "next/link";
import dynamicImport from "next/dynamic";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  PredioFull,
  PropietarioMini,
  VeredaMini,
} from "@/lib/types";
import type { MapFeature } from "@/lib/types";
import type { PredioAnalisisCompleto } from "@/lib/repos/fase6";
import { PredioForm } from "../predio-form";

// Lazy: react-leaflet no se ejecuta en SSR.
const PredioMapa = dynamicImport(
  () => import("./predio-mapa").then((m) => m.PredioMapa),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low text-body-sm text-on-surface-variant">
        Cargando mapa…
      </div>
    ),
  },
);

interface IntervencionMini {
  idPropuesta: number;
  tipo: "punto" | "linea" | "poligono";
  actividad: string;
  estado: string;
  idAccion: number | null;
  nombreAccion: string | null;
  nombreComponente: string | null;
}

export function PredioDetail({
  initial,
  featureResumen,
  canEdit,
  propietarios,
  veredas,
  intervenciones,
  analisis,
}: {
  initial: PredioFull;
  featureResumen: MapFeature | null;
  canEdit: boolean;
  propietarios: PropietarioMini[];
  veredas: VeredaMini[];
  intervenciones: IntervencionMini[];
  analisis: PredioAnalisisCompleto;
}) {
  const [editing, setEditing] = React.useState(false);

  const propietario = propietarios.find(
    (p) => p.idPropietario === initial.idPropietario,
  );
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
      {/* Mapa del polígono (lazy, react-leaflet). */}
      <div className="mb-6">
        <PredioMapa feature={featureResumen} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-body-sm sm:grid-cols-3">
        <Field label="Código">
          {featureResumen?.properties.codigo ??
            `PR-${String(initial.idPredio).padStart(5, "0")}`}
        </Field>
        <Field label="Cédula catastral">{initial.cedulaCatastral}</Field>
        <Field label="Cédula anterior">{initial.cedulaAnt}</Field>
        <Field label="Núcleo predial">{initial.nucleoPredial}</Field>
        <Field label="Área">
          {initial.areaHa.toLocaleString("es-CO", { maximumFractionDigits: 2 })} ha
        </Field>
        <Field label="Perímetro">
          {initial.perimetro.toLocaleString("es-CO", { maximumFractionDigits: 2 })} m
        </Field>
        <Field label="Centroide">
          {initial.latitudCentroide.toFixed(4)},{" "}
          {initial.longitudCentroide.toFixed(4)}
        </Field>
        <Field label="Propietario">
          {propietario?.nombreRazonSocial ?? `id=${initial.idPropietario}`}
        </Field>
        <Field label="Vereda / Municipio">
          {vereda
            ? `${vereda.nombreVereda} · ${vereda.nombreMunicipio}`
            : `id=${initial.idVereda}`}
        </Field>
      </div>

      {initial.observaciones && (
        <div className="mt-6 rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
          <p className="mb-1 text-[10px] font-bold uppercase text-on-surface-variant">
            Observaciones
          </p>
          <p className="whitespace-pre-wrap text-body-sm text-on-surface">
            {initial.observaciones}
          </p>
        </div>
      )}

      {/* Intervenciones del predio (DEEPSEEK-71) */}
      <section className="mt-6">
        <h3 className="mb-2 text-title-md font-bold text-on-surface">
          Intervenciones del predio
        </h3>
        {intervenciones.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">
            Sin intervenciones registradas para este predio.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-outline-variant">
            <table className="w-full text-left text-body-sm">
              <thead className="bg-surface-container-low text-[10px] uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Actividad</th>
                  <th className="px-3 py-2">Componente / Acción</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {intervenciones.map((it) => (
                  <tr
                    key={it.idPropuesta}
                    className="border-t border-outline-variant/30"
                  >
                    <td className="px-3 py-1.5">
                      <Link
                        href={`/intervenciones/${it.idPropuesta}`}
                        className="font-mono text-[12px] text-primary hover:underline"
                      >
                        {it.idPropuesta}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5">{it.actividad}</td>
                    <td className="px-3 py-1.5">
                      {it.nombreComponente
                        ? `${it.nombreComponente} · ${it.nombreAccion ?? "—"}`
                        : "—"}
                    </td>
                    <td className="px-3 py-1.5 capitalize">{it.tipo}</td>
                    <td className="px-3 py-1.5 font-mono text-[12px]">
                      {it.estado}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Ambiental (Fase 6) — DEEPSEEK-71 */}
      <section className="mt-6">
        <h3 className="mb-2 text-title-md font-bold text-on-surface">
          Ambiental (Fase 6)
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Fase6Card
            title="Coberturas"
            rows={(analisis.coberturas ?? []).map((r) => ({
              key: r.nombre_cobertura ?? "—",
              area: r.area_interseccion_ha,
              pct: r.porcentaje_predio,
            }))}
          />
          <Fase6Card
            title="Biomas IAVH"
            rows={(analisis.biomas ?? []).map((r) => ({
              key: r.bioma_iavh ?? "—",
              area: r.area_interseccion_ha,
              pct: r.porcentaje_predio,
            }))}
          />
          <Fase6Card
            title="Páramos"
            rows={(analisis.paramos ?? []).map((r) => ({
              key: r.nombre_paramo ?? r.complejo_nombre ?? "—",
              area: r.area_interseccion_ha,
              pct: r.porcentaje_predio,
            }))}
          />
          <Fase6Card
            title="POMCA"
            rows={(analisis.pomcas ?? []).map((r) => ({
              key: r.categoria_zonificacion ?? "—",
              area: r.area_interseccion_ha,
              pct: r.porcentaje_predio,
            }))}
          />
          <Fase6Card
            title="Reservas Forestales (RFP)"
            rows={(analisis.rfps ?? []).map((r) => ({
              key: r.categoria_zonificacion ?? r.nombre ?? "—",
              area: r.area_interseccion_ha,
              pct: r.porcentaje_predio,
            }))}
            className="sm:col-span-2"
          />
        </div>
      </section>

      {canEdit && (
        <div className="mt-6 flex justify-end border-t border-outline-variant pt-4">
          <Button onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            Editar registro
          </Button>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-on-surface-variant">
        {label}
      </p>
      <p className="font-bold text-on-surface">{children}</p>
    </div>
  );
}

function Fase6Card({
  title,
  rows,
  className,
}: {
  title: string;
  rows: Array<{ key: string; area?: number | null; pct?: number | null }>;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-lg border border-outline-variant/30 bg-surface-container-low p-3 " +
        (className ?? "")
      }
    >
      <p className="mb-2 text-[10px] font-bold uppercase text-on-surface-variant">
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Sin solapamiento.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r, i) => (
            <li
              key={`${r.key}-${i}`}
              className="flex items-baseline justify-between text-body-sm"
            >
              <span className="truncate pr-2 text-on-surface">{r.key}</span>
              <span className="shrink-0 font-mono text-[12px] text-on-surface-variant">
                {r.area != null
                  ? `${r.area.toLocaleString("es-CO", { maximumFractionDigits: 2 })} ha`
                  : "—"}
                {r.pct != null ? ` · ${r.pct.toFixed(1)}%` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
