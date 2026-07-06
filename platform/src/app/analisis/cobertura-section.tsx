// =============================================================================
// Cobertura vegetal — wrapper del chart existente con datos uniformes.
// =============================================================================

import { CoberturaChart } from "@/components/dashboard/cobertura-chart";
import type { CoberturaTotal } from "@/lib/types";
import { formatDecimal } from "@/lib/utils";

export function CoberturaSection({ data }: { data: CoberturaTotal[] }) {
  const totalHa = data.reduce((acc, i) => acc + (i.area > 0 ? i.area : 0), 0);
  return (
    <div>
      <p className="mb-3 text-body-sm text-on-surface-variant">
        Distribución porcentual de cobertura vegetal. Si los datos no están
        cargados en <code className="font-mono text-[11px]">sgs_rel_predio_cobertura</code>,
        se muestra una distribución de referencia.
      </p>
      <CoberturaChart
        items={data}
        title="Cobertura vegetal"
        totalLabel="ha totales"
        totalValue={formatDecimal(totalHa, 1)}
      />
    </div>
  );
}
