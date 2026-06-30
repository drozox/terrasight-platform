import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { BarChart3 } from "lucide-react";

export default function DashboardPage() {
  return (
    <ModulePlaceholder
      title="Dashboard Analítico"
      description="Vistas independientes con tablas dinámicas, comparadores por componente y series temporales. Próxima fase."
      Icon={BarChart3}
    />
  );
}
