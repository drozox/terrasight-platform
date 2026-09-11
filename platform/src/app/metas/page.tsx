// =============================================================================
// /metas — REDIRIGE a /metas/convenio
//
// P1-5 (FINAL-CLOSURE-PLAN): unificar la fuente de verdad de metas.
// La implementación vieja (basada en vistas sgs_v_metas_*) está deprecada
// desde Sprint 17 — la nueva está en /metas/convenio (código en
// src/lib/repos/metas-convenio.ts). Esta redirect evita tener 2 páginas
// con números divergentes para el mismo convenio.
// =============================================================================

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function MetasRedirectPage() {
  redirect("/metas/convenio");
}
