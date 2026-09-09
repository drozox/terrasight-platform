"use client";

// =============================================================================
// ImportPrediosForm — form para subir un CSV de predios
//
// Sprint 21. Muestra:
//   - Textarea para pegar el CSV directamente
//   - Botón de submit que llama /api/importaciones
//   - Resultado con estadísticas (OK/error) y descarga de errores
// =============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface CommitResult {
  id_importacion: number;
  total_filas: number;
  filas_exitosas: number;
  filas_con_error: number;
  estado: "EN_PROCESO" | "COMPLETADO" | "COMPLETADO_CON_ERRORES" | "FALLIDO";
}

const TEMPLATE_CSV = `nombre_predio;area_ha;id_vereda;id_propietario
"Predio El Carmen";12.5;5;3
"Finca La Esperanza";8.3;5;
"Hacienda San José";25.0;6;4`;

export function ImportPrediosForm() {
  const router = useRouter();
  const [csvText, setCsvText] = React.useState("");
  const [nombreArchivo, setNombreArchivo] = React.useState("");
  const [comentario, setComentario] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<CommitResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!csvText.trim()) {
      setError("Pega el contenido del CSV");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/importaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_entidad: "predio",
          nombre_archivo: nombreArchivo || `predios-${new Date().toISOString().slice(0, 10)}.csv`,
          csv_text: csvText,
          comentario: comentario || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Error al importar");
        return;
      }
      setResult(data as CommitResult);
      setCsvText("");
      setComentario("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-on-surface">
        <Upload className="size-5" aria-hidden="true" />
        Importar predios desde CSV
      </h2>

      <details className="rounded bg-surface-container p-2 text-xs">
        <summary className="cursor-pointer font-medium text-on-surface-variant">
          Ver formato esperado
        </summary>
        <pre className="mt-2 overflow-x-auto rounded bg-surface-container-lowest p-2 font-mono text-[11px]">
{TEMPLATE_CSV}
        </pre>
        <p className="mt-1 text-[10px] text-on-surface-variant">
          Columnas: <code>nombre_predio</code> (requerido), <code>area_ha</code>, <code>id_vereda</code>, <code>id_propietario</code>.
          Separador: <code>;</code> (compatible con Excel). Geometría: asignar después con herramienta de dibujo.
        </p>
      </details>

      <div>
        <label className="mb-1 block text-xs font-medium text-on-surface" htmlFor="csv-nombre">
          Nombre del archivo
        </label>
        <input
          id="csv-nombre"
          type="text"
          value={nombreArchivo}
          onChange={(e) => setNombreArchivo(e.target.value)}
          placeholder="predios-2026-09-08.csv"
          className="w-full rounded border border-outline-variant bg-surface-container-lowest p-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-on-surface" htmlFor="csv-text">
          Contenido del CSV
        </label>
        <textarea
          id="csv-text"
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={8}
          placeholder="Pega aquí el contenido del CSV…"
          className="w-full rounded border border-outline-variant bg-surface-container-lowest p-2 font-mono text-xs focus:border-primary focus:outline-none"
          aria-label="Contenido CSV"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-on-surface" htmlFor="csv-comentario">
          Comentario (opcional)
        </label>
        <input
          id="csv-comentario"
          type="text"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Ej: Carga inicial v1"
          className="w-full rounded border border-outline-variant bg-surface-container-lowest p-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="flex items-center gap-1.5 font-semibold text-primary">
            {result.estado === "COMPLETADO" ? (
              <CheckCircle2 className="size-4" aria-hidden="true" />
            ) : result.estado === "COMPLETADO_CON_ERRORES" ? (
              <AlertTriangle className="size-4 text-amber-700" aria-hidden="true" />
            ) : (
              <XCircle className="size-4 text-red-700" aria-hidden="true" />
            )}
            Importación #{result.id_importacion} — {result.estado}
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>Total: <span className="font-mono">{result.total_filas}</span></li>
            <li>Exitosas: <span className="font-mono text-emerald-700">{result.filas_exitosas}</span></li>
            <li>Con error: <span className="font-mono text-red-700">{result.filas_con_error}</span></li>
          </ul>
          {result.filas_con_error > 0 && (
            <a
              href={`/admin/importaciones/${result.id_importacion}`}
              className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
            >
              Ver detalle de errores →
            </a>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !csvText.trim()}
        className="rounded bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? "Importando…" : "Importar"}
      </button>
    </form>
  );
}
