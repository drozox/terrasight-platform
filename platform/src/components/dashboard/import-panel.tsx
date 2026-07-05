"use client";

import * as React from "react";
import {
  UploadCloud,
  FileWarning,
  CheckCircle2,
  Loader2,
  X,
  FileText,
  Layers,
  Box,
  CircleDot,
  Map as MapIcon,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseArchivoCapas,
  buildResumenImportacion,
  toImportPayload,
  formatAreaHa,
  formatLongitudM,
  formatBbox,
  type ResumenImportacion,
} from "@/lib/geo-import";

// -----------------------------------------------------------------------------
// Tipos del panel
// -----------------------------------------------------------------------------

interface ImportResult {
  ok: boolean;
  inserted: number;
  ids?: number[];
  byType?: { punto: number; linea: number; poligono: number };
  error?: string;
  detail?: string;
}

interface ImportPanelProps {
  className?: string;
  /** Si se llama después de un import exitoso (para que el padre refresque datos) */
  onImported?: () => void;
}

type Estado =
  | { kind: "idle" }
  | { kind: "loading"; fileName: string }
  | { kind: "error"; titulo: string; detalle: string }
  | { kind: "preview"; fileName: string; resumen: ResumenImportacion }
  | { kind: "submitting"; resumen: ResumenImportacion }
  | { kind: "success"; resumen: ResumenImportacion; result: ImportResult }
  | { kind: "submitError"; resumen: ResumenImportacion; titulo: string; detalle: string };

// -----------------------------------------------------------------------------
// Componente principal
// -----------------------------------------------------------------------------

export function ImportPanel({ className, onImported }: ImportPanelProps) {
  const [estado, setEstado] = React.useState<Estado>({ kind: "idle" });
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const procesarArchivo = React.useCallback(async (file: File) => {
    setEstado({ kind: "loading", fileName: file.name });
    try {
      const fc = await parseArchivoCapas(file);
      const resumen = buildResumenImportacion(fc);
      if (resumen.total === 0) {
        setEstado({
          kind: "error",
          titulo: "Sin features válidas",
          detalle:
            "El archivo se leyó pero no contiene Point/LineString/Polygon. " +
            (resumen.advertencias[0] ?? ""),
        });
        return;
      }
      setEstado({ kind: "preview", fileName: file.name, resumen });
    } catch (e) {
      setEstado({
        kind: "error",
        titulo: "No se pudo leer el archivo",
        detalle: (e as Error).message,
      });
    }
  }, []);

  const onDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;
      // Para shapefile: aceptar varios; para geojson: el primero
      if (files.length === 1) {
        void procesarArchivo(files[0]);
      } else {
        void procesarArchivo(files.find((f) => f.name.toLowerCase().endsWith(".zip")) ?? files[0]);
      }
    },
    [procesarArchivo],
  );

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void procesarArchivo(f);
    e.target.value = ""; // permite re-seleccionar el mismo archivo
  };

  const enviar = React.useCallback(async () => {
    if (estado.kind !== "preview") return;
    const resumen = estado.resumen;
    setEstado({ kind: "submitting", resumen });
    try {
      const payload = toImportPayload(resumen, estado.fileName);
      const resp = await fetch("/api/interventions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await resp.json()) as ImportResult;
      if (!resp.ok || !data.ok) {
        setEstado({
          kind: "submitError",
          resumen,
          titulo: data.error ?? `Error HTTP ${resp.status}`,
          detalle: data.detail ?? "",
        });
        return;
      }
      setEstado({ kind: "success", resumen, result: data });
      onImported?.();
    } catch (e) {
      setEstado({
        kind: "submitError",
        resumen,
        titulo: "No se pudo conectar con el servidor",
        detalle: (e as Error).message,
      });
    }
  }, [estado, onImported]);

  const reset = () => setEstado({ kind: "idle" });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className={cn(
        "rounded-xl border border-outline-variant bg-surface-container-lowest",
        "shadow-[0px_4px_12px_rgba(0,0,0,0.03)]",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers className="size-5" />
          </div>
          <div>
            <h2 className="text-title-sm font-bold text-on-surface">
              Importar capa de acciones
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Carga polígonos, líneas o puntos para crear propuestas en la BD.
            </p>
          </div>
        </div>
        {estado.kind !== "idle" && (
          <button
            type="button"
            onClick={reset}
            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        {estado.kind === "idle" && (
          <Dropzone
            dragOver={dragOver}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onPick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".geojson,.json,.zip,.shp,.dbf,.prj"
              multiple
              onChange={onPick}
              className="hidden"
            />
          </Dropzone>
        )}

        {(estado.kind === "loading" || estado.kind === "submitting") && (
          <div className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3">
            <Loader2 className="size-5 animate-spin text-primary" />
            <div>
              <p className="text-body-md font-medium text-on-surface">
                {estado.kind === "loading"
                  ? `Leyendo ${estado.fileName}…`
                  : `Importando ${estado.resumen.total} features a la BD…`}
              </p>
              <p className="text-body-sm text-on-surface-variant">
                Calculando áreas, longitudes y resolviendo FKs.
              </p>
            </div>
          </div>
        )}

        {estado.kind === "error" && (
          <ErrorBlock titulo={estado.titulo} detalle={estado.detalle} />
        )}

        {estado.kind === "preview" && (
          <PreviewBlock resumen={estado.resumen} fileName={estado.fileName} onEnviar={enviar} />
        )}

        {estado.kind === "submitError" && (
          <>
            <ErrorBlock titulo={estado.titulo} detalle={estado.detalle} />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-outline-variant px-3 py-1.5 text-body-sm hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={enviar}
                className="rounded-lg bg-primary px-3 py-1.5 text-body-sm font-medium text-on-primary hover:bg-primary/90"
              >
                Reintentar
              </button>
            </div>
          </>
        )}

        {estado.kind === "success" && (
          <SuccessBlock resumen={estado.resumen} result={estado.result} onOtra={reset} />
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Subcomponentes
// -----------------------------------------------------------------------------

function Dropzone({
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onPick,
  children,
}: {
  dragOver: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onPick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition",
        dragOver
          ? "border-primary bg-primary/5"
          : "border-outline-variant bg-surface-container-low hover:border-primary/60 hover:bg-primary/5",
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UploadCloud className="size-7" />
      </div>
      <div>
        <p className="text-title-sm font-semibold text-on-surface">
          Arrastra un archivo aquí
        </p>
        <p className="text-body-sm text-on-surface-variant">
          o haz clic para seleccionar — GeoJSON (.geojson) o Shapefile
          (.zip / .shp + .dbf + .prj)
        </p>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[11px] text-on-surface-variant">
        <span className="rounded-full bg-surface-container px-2 py-0.5">.geojson</span>
        <span className="rounded-full bg-surface-container px-2 py-0.5">.json</span>
        <span className="rounded-full bg-surface-container px-2 py-0.5">.zip</span>
        <span className="rounded-full bg-surface-container px-2 py-0.5">.shp</span>
      </div>
      {children}
    </div>
  );
}

function PreviewBlock({
  resumen,
  fileName,
  onEnviar,
}: {
  resumen: ResumenImportacion;
  fileName: string;
  onEnviar: () => void;
}) {
  // Métricas agregadas
  const totalArea = resumen.propuestas
    .filter((p) => p.metricas.area_ha !== undefined)
    .reduce((acc, p) => acc + (p.metricas.area_ha ?? 0), 0);
  const totalLongitud = resumen.propuestas
    .filter((p) => p.metricas.longitud_m !== undefined)
    .reduce((acc, p) => acc + (p.metricas.longitud_m ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Encabezado del archivo */}
      <div className="flex items-center gap-3 rounded-lg bg-surface-container-low px-4 py-3">
        <FileText className="size-5 text-primary" />
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-body-md font-medium text-on-surface">
            {fileName}
          </p>
          <p className="text-body-sm text-on-surface-variant">
            {resumen.total} features listas para importar
          </p>
        </div>
      </div>

      {/* Tarjetas de desglose */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<CircleDot className="size-4" />}
          label="Puntos"
          value={String(resumen.puntos)}
          color="bg-secondary/10 text-secondary"
        />
        <StatCard
          icon={<MapIcon className="size-4" />}
          label="Líneas"
          value={String(resumen.lineas)}
          sub={formatLongitudM(totalLongitud)}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          icon={<Box className="size-4" />}
          label="Polígonos"
          value={String(resumen.poligonos)}
          sub={formatAreaHa(totalArea)}
          color="bg-tertiary/10 text-tertiary"
        />
      </div>

      {/* Bbox */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3">
        <p className="text-label-sm font-semibold text-on-surface-variant">
          Extensión espacial (bbox)
        </p>
        <p className="text-body-md text-on-surface">{formatBbox(resumen.bbox)}</p>
        <p className="mt-1 text-[11px] text-on-surface-variant">
          WGS84 (EPSG:4326) — se reproyectará automáticamente si el .prj indica otro SRS.
        </p>
      </div>

      {/* Advertencias */}
      {resumen.advertencias.length > 0 && (
        <div className="rounded-lg border border-tertiary/30 bg-tertiary/5 px-4 py-3">
          <p className="text-label-sm font-semibold text-tertiary">
            {resumen.advertencias.length} advertencia(s)
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-body-sm text-on-surface-variant">
            {resumen.advertencias.slice(0, 5).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
            {resumen.advertencias.length > 5 && (
              <li>… y {resumen.advertencias.length - 5} más</li>
            )}
          </ul>
        </div>
      )}

      {/* Tabla de preview (top 6) */}
      <div className="overflow-hidden rounded-lg border border-outline-variant">
        <table className="w-full text-body-sm">
          <thead className="bg-surface-container-low">
            <tr className="text-left text-label-sm text-on-surface-variant">
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Nombre</th>
              <th className="px-3 py-2 font-semibold">Tipo</th>
              <th className="px-3 py-2 font-semibold">Comp.</th>
              <th className="px-3 py-2 font-semibold">Actividad</th>
              <th className="px-3 py-2 font-semibold text-right">Medida</th>
            </tr>
          </thead>
          <tbody>
            {resumen.propuestas.slice(0, 6).map((p, i) => (
              <tr key={i} className="border-t border-outline-variant/50">
                <td className="px-3 py-1.5 text-on-surface-variant">{i + 1}</td>
                <td className="px-3 py-1.5 text-on-surface">{p.nombre}</td>
                <td className="px-3 py-1.5 capitalize text-on-surface-variant">
                  {p.tipo}
                </td>
                <td className="px-3 py-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      p.componente === "C1" && "bg-primary/10 text-primary",
                      p.componente === "C2" && "bg-secondary/10 text-secondary",
                      p.componente === "C3" && "bg-tertiary/10 text-tertiary",
                    )}
                  >
                    {p.componente}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-on-surface-variant">{p.actividad}</td>
                <td className="px-3 py-1.5 text-right font-medium text-on-surface">
                  {p.tipo === "poligono"
                    ? formatAreaHa(p.metricas.area_ha)
                    : p.tipo === "linea"
                    ? formatLongitudM(p.metricas.longitud_m)
                    : `${p.metricas.centroide[0].toFixed(4)}, ${p.metricas.centroide[1].toFixed(4)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {resumen.propuestas.length > 6 && (
          <div className="border-t border-outline-variant bg-surface-container-low px-3 py-1.5 text-[11px] text-on-surface-variant">
            Mostrando 6 de {resumen.propuestas.length} features.
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-2 pt-1">
        <span className="mr-auto self-center text-[11px] text-on-surface-variant">
          Se crearán <strong>{resumen.total}</strong> propuestas en{" "}
          <code className="rounded bg-surface-container px-1 py-0.5 text-[10px]">
            sgs_pro_propuesta
          </code>
          .
        </span>
        <button
          type="button"
          onClick={onEnviar}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-body-md font-semibold text-on-primary shadow-sm transition hover:bg-primary/90"
        >
          <UploadCloud className="size-4" />
          Importar a la base de datos
        </button>
      </div>
    </div>
  );
}

function SuccessBlock({
  resumen,
  result,
  onOtra,
}: {
  resumen: ResumenImportacion;
  result: ImportResult;
  onOtra: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="size-8" />
      </div>
      <div>
        <p className="text-title-md font-bold text-on-surface">
          ¡Capa importada!
        </p>
        <p className="text-body-sm text-on-surface-variant">
          {result.inserted ?? resumen.total} propuestas persistidas en la BD.
        </p>
      </div>
      {result.byType && (
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
          {result.byType.punto > 0 && (
            <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-secondary">
              {result.byType.punto} puntos
            </span>
          )}
          {result.byType.linea > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
              {result.byType.linea} líneas
            </span>
          )}
          {result.byType.poligono > 0 && (
            <span className="rounded-full bg-tertiary/10 px-2 py-0.5 text-tertiary">
              {result.byType.poligono} polígonos
            </span>
          )}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onOtra}
          className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-body-md hover:bg-surface-container"
        >
          <Trash2 className="size-4" />
          Importar otra capa
        </button>
      </div>
    </div>
  );
}

function ErrorBlock({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-error/30 bg-error/5 px-4 py-3">
      <FileWarning className="size-5 shrink-0 text-error" />
      <div>
        <p className="text-body-md font-semibold text-error">{titulo}</p>
        {detalle && (
          <p className="mt-0.5 text-body-sm text-on-surface-variant">{detalle}</p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3">
      <div className={cn("mb-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5", color)}>
        {icon}
        <span className="text-[11px] font-semibold">{label}</span>
      </div>
      <p className="text-headline-sm font-bold text-on-surface">{value}</p>
      {sub && <p className="text-[11px] text-on-surface-variant">{sub}</p>}
    </div>
  );
}