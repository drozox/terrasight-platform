"use client";

// =============================================================================
// MapPrintPanel (Ajuste 9) — "Imprimir layout".
//
// - Formulario: Título, Descripción, Solicitado por, Fecha (automática).
// - Captura el mapa (html2canvas) con las capas activas.
// - Layout imprimible: encabezado, mapa, leyenda, medidas por actividad.
// - Export: PNG (descarga), PDF/Imprimir (window.print con @media print).
// =============================================================================

import * as React from "react";
import { Printer, X, ImageDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SigTerritorioLogo } from "@/components/icons";
import { Swatch, LAYER_SYMBOLOGY } from "./map-legend";
import type { MapLayerKey } from "./map-layers-panel";

interface Medida {
  actividad: string;
  tipo: "Lineal" | "Área" | "Punto";
  n: number;
  km: number;
  ha: number;
}

interface Props {
  layers: Record<MapLayerKey, boolean>;
  basemap: "osm" | "topo" | "satellite";
  componente?: string | null;
  accion?: string | null;
}

export function MapPrintPanel({ layers, componente, accion }: Props) {
  const [open, setOpen] = React.useState(false);
  const [titulo, setTitulo] = React.useState("");
  const [descripcion, setDescripcion] = React.useState("");
  const [solicitadoPor, setSolicitadoPor] = React.useState("");
  const [snapshot, setSnapshot] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [medidas, setMedidas] = React.useState<Medida[]>([]);

  const fecha = React.useMemo(
    () =>
      new Date().toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  const activeLayers = (Object.keys(layers) as MapLayerKey[]).filter((k) => layers[k]);

  // Medidas de las intervenciones (líneas/áreas/puntos) del filtro activo.
  React.useEffect(() => {
    if (!open) return;
    let cancel = false;
    (async () => {
      const qs = new URLSearchParams();
      if (componente) qs.set("componente", componente);
      if (accion) qs.set("accion", accion);
      const suffix = qs.toString() ? `&${qs.toString()}` : "";
      const get = async (layer: string) => {
        try {
          const r = await fetch(`/api/geo?layer=${layer}${suffix}`);
          return r.ok ? await r.json() : null;
        } catch {
          return null;
        }
      };
      const [lin, pol, pun] = await Promise.all([
        get("propuestas"),
        get("propuestas_poligono"),
        get("propuestas_punto"),
      ]);
      if (cancel) return;
      const map = new Map<string, Medida>();
      const add = (tipo: Medida["tipo"], act: string, km = 0, ha = 0) => {
        const k = `${tipo}|${act}`;
        const cur = map.get(k) ?? { actividad: act, tipo, n: 0, km: 0, ha: 0 };
        cur.n += 1;
        cur.km += km;
        cur.ha += ha;
        map.set(k, cur);
      };
      for (const f of lin?.features ?? []) {
        const p = f.properties ?? {};
        add("Lineal", (p.actividad as string) ?? "—", Number(p.longitudKm) || 0, 0);
      }
      for (const f of pol?.features ?? []) {
        const p = f.properties ?? {};
        add("Área", (p.nombre ?? p.actividad ?? "—") as string, 0, Number(p.areaHa) || 0);
      }
      for (const f of pun?.features ?? []) {
        const p = f.properties ?? {};
        add("Punto", (p.nombre ?? p.actividad ?? p.tipo ?? "—") as string);
      }
      setMedidas([...map.values()].sort((a, b) => b.n - a.n));
    })();
    return () => {
      cancel = true;
    };
  }, [open, componente, accion]);

  // Quita la clase de impresión al cerrar el diálogo de impresión.
  React.useEffect(() => {
    const after = () => document.body.classList.remove("printing");
    window.addEventListener("afterprint", after);
    return () => window.removeEventListener("afterprint", after);
  }, []);

  async function generar() {
    setGenerating(true);
    try {
      const el = document.getElementById("mapa-captura");
      if (el) {
        const mod = await import("html2canvas");
        const canvas = await mod.default(el, {
          useCORS: true,
          backgroundColor: "#ffffff",
          scale: 2,
          logging: false,
        });
        setSnapshot(canvas.toDataURL("image/png"));
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.warn("[print] capture:", e);
    } finally {
      setGenerating(false);
    }
  }

  function descargarPng() {
    if (!snapshot) return;
    const a = document.createElement("a");
    a.href = snapshot;
    a.download = `layout-${Date.now()}.png`;
    a.click();
  }

  function imprimir() {
    document.body.classList.add("printing");
    window.print();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Imprimir layout"
        aria-label="Imprimir layout"
        className="absolute bottom-20 right-4 z-[600] flex items-center gap-1.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest/95 px-3 py-2 text-[11px] font-bold text-on-surface shadow-lg backdrop-blur transition-colors hover:bg-surface-container-low"
      >
        <Printer className="size-4" aria-hidden="true" />
        Imprimir layout
      </button>

      {open && (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="mt-6 w-full max-w-3xl rounded-xl border border-outline-variant bg-surface-container-lowest shadow-2xl">
            <div className="no-print flex items-center justify-between border-b border-outline-variant p-3">
              <p className="text-title-md font-bold text-on-surface">Imprimir layout</p>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-variant/50"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Formulario */}
            <div className="no-print space-y-3 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-[11px] font-semibold text-on-surface-variant">
                  Título del layout
                  <input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ej: Análisis de intervenciones en La Calera"
                    className="mt-1 h-9 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-on-surface-variant">
                  Solicitado por
                  <input
                    value={solicitadoPor}
                    onChange={(e) => setSolicitadoPor(e.target.value)}
                    placeholder="Nombre"
                    className="mt-1 h-9 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </label>
              </div>
              <label className="block text-[11px] font-semibold text-on-surface-variant">
                Descripción (opcional)
                <input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </label>
              <p className="text-[11px] text-on-surface-variant">
                Fecha: {fecha} · Capas activas: {activeLayers.length} · Filtro:{" "}
                {accion ?? componente ?? "Todas"}
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={generar}
                  disabled={generating}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[12px] font-bold text-on-primary disabled:opacity-50"
                >
                  {generating ? <Loader2 className="size-4 animate-spin" /> : null}
                  {snapshot ? "Regenerar vista previa" : "Generar vista previa"}
                </button>
                <button
                  type="button"
                  onClick={imprimir}
                  className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-[12px] font-bold text-on-surface hover:bg-surface-variant/40"
                >
                  <Printer className="size-4" /> Imprimir / PDF
                </button>
                <button
                  type="button"
                  onClick={descargarPng}
                  disabled={!snapshot}
                  className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-[12px] font-bold text-on-surface hover:bg-surface-variant/40 disabled:opacity-50"
                >
                  <ImageDown className="size-4" /> Descargar PNG
                </button>
              </div>
            </div>

            {/* Layout (área imprimible) */}
            <div className="print-area p-6">
              <div className="mb-3 flex items-start justify-between gap-4 border-b border-outline-variant pb-3">
                <div className="flex items-center gap-3">
                  <SigTerritorioLogo className="h-12 w-12" />
                  <div>
                    <p className="text-xl font-bold leading-none text-secondary">
                      SIG Territorio
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      Convenio CAR · WWF · Fundación Natura
                    </p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-on-surface-variant">
                  <p>Fecha: {fecha}</p>
                  <p>Filtro: {accion ?? componente ?? "Todas"}</p>
                </div>
              </div>

              <h1 className="text-lg font-bold text-on-surface">
                {titulo || "Layout sin título"}
              </h1>
              {descripcion && (
                <p className="text-body-sm text-on-surface-variant">{descripcion}</p>
              )}
              {solicitadoPor && (
                <p className="text-[11px] text-on-surface-variant">
                  Solicitado por: {solicitadoPor}
                </p>
              )}

              <div className="my-3 overflow-hidden rounded-lg border border-outline-variant bg-white">
                {snapshot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={snapshot} alt="Mapa del layout" className="w-full" />
                ) : (
                  <div className="flex h-56 items-center justify-center text-sm text-on-surface-variant">
                    Generá la vista previa para incluir el mapa.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                    Leyenda (capas activas)
                  </p>
                  <ul className="space-y-1 text-body-sm">
                    {activeLayers.length === 0 && (
                      <li className="text-on-surface-variant italic">Sin capas activas</li>
                    )}
                    {activeLayers.map((k) => (
                      <li key={k} className="flex items-center gap-2">
                        <Swatch style={LAYER_SYMBOLOGY[k]} />
                        <span className="text-on-surface">{LAYER_SYMBOLOGY[k].label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                    Medidas de intervenciones
                  </p>
                  {medidas.length === 0 ? (
                    <p className="text-body-sm text-on-surface-variant italic">
                      Sin intervenciones en el filtro actual.
                    </p>
                  ) : (
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="text-on-surface-variant">
                          <th className="py-1">Actividad</th>
                          <th className="py-1">Tipo</th>
                          <th className="py-1 text-right">Cant.</th>
                          <th className="py-1 text-right">Medida</th>
                        </tr>
                      </thead>
                      <tbody>
                        {medidas.map((m) => (
                          <tr key={`${m.tipo}-${m.actividad}`} className="border-t border-outline-variant/40">
                            <td className="py-1 capitalize text-on-surface">{m.actividad}</td>
                            <td className="py-1 text-on-surface-variant">{m.tipo}</td>
                            <td className="py-1 text-right text-on-surface">{m.n}</td>
                            <td className="py-1 text-right text-on-surface">
                              {m.tipo === "Lineal" && m.km > 0 && (
                                <>
                                  {m.km.toLocaleString("es-CO", { maximumFractionDigits: 2 })} km /{" "}
                                  {Math.round(m.km * 1000).toLocaleString("es-CO")} m
                                </>
                              )}
                              {m.tipo === "Área" && m.ha > 0 && (
                                <>
                                  {m.ha.toLocaleString("es-CO", { maximumFractionDigits: 2 })} ha
                                </>
                              )}
                              {m.tipo === "Punto" && "punto"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <footer className="mt-4 border-t border-outline-variant pt-2 text-[10px] text-on-surface-variant">
                Generado por SIG Territorio · Convenio CAR · WWF · Fundación Natura · {fecha}
              </footer>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
