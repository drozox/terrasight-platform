// =============================================================================
// /analisis — REDIRIGE a /mapa.
//
// El análisis espacial (buffer, selección por rectángulo, identificar, medir)
// vive ahora DENTRO del visor `/mapa` (herramientas del toolbar). Esta página
// quedó fuera de alcance (ver docs/ALCANCE.md) y se mantiene la ruta por
// compatibilidad de links externos.
// =============================================================================

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AnalisisRedirectPage() {
  redirect("/mapa");
}
