import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { Activity } from "lucide-react";

export default function MonitoreoPage() {
  return (
    <ModulePlaceholder
      title="Monitoreo Ambiental"
      description="Seguimiento de obras de captación, estaciones limnimétricas, captaciones de agua lluvia y beneficiarios. Próxima fase."
      Icon={Activity}
    />
  );
}
