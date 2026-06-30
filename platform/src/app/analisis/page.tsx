import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { PieChart } from "lucide-react";

export default function AnalisisPage() {
  return (
    <ModulePlaceholder
      title="Análisis Espacial"
      description="Cruces CLC × Bioma × POMCA, buffers y overlays. Próxima fase."
      Icon={PieChart}
    />
  );
}
