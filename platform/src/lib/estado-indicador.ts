// =============================================================================
// estado-indicador.ts — Semáforo RAG único de los indicadores del convenio.
//
// Metodología (documentada en la UI):
//   ≥ 100%  → cumplida  (verde)
//   50–99%  → en curso  (ámbar)
//   < 50%   → atrasada  (rojo)
//
// Fuente única de colores/etiquetas para MetasStrip, RightPanel y AlertasMetas.
// =============================================================================

export type EstadoIndicador = "cumplida" | "en_curso" | "atrasada";

export function estadoDePct(pct: number): EstadoIndicador {
  if (pct >= 100) return "cumplida";
  if (pct >= 50) return "en_curso";
  return "atrasada";
}

export const ESTADO_LABEL: Record<EstadoIndicador, string> = {
  cumplida: "Cumplida",
  en_curso: "En curso",
  atrasada: "Atrasada",
};

export const ESTADO_BAR: Record<EstadoIndicador, string> = {
  cumplida: "bg-success",
  en_curso: "bg-warning",
  atrasada: "bg-error",
};

export const ESTADO_TEXT: Record<EstadoIndicador, string> = {
  cumplida: "text-success",
  en_curso: "text-warning",
  atrasada: "text-error",
};

export const ESTADO_CHIP: Record<EstadoIndicador, string> = {
  cumplida: "bg-success/10 text-success",
  en_curso: "bg-warning/10 text-warning",
  atrasada: "bg-error-container text-on-error-container",
};

export const METODOLOGIA_SEMAFORO =
  "Semáforo: ≥100% cumplida · 50–99% en curso · <50% atrasada";
