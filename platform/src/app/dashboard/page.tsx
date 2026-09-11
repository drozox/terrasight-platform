// =============================================================================
// /dashboard — REDIRIGE a / (el dashboard real vive en el root)
//
// P2-7 (FINAL-CLOSURE-PLAN): el dashboard real (KPIs, mapa prominente, panels
// con Suspense) está implementado en src/app/page.tsx (Sprint 18.5 / Sprint
// 23). El placeholder "Dashboard Analítico" era residual y nunca se llenó.
// Esta redirect mantiene cualquier link externo funcional.
// =============================================================================

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DashboardRedirectPage() {
  redirect("/");
}
