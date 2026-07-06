import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { Activity } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";

export default async function MonitoreoPage() {
  await requireRole(["ADMIN", "GESTOR"] as const);
  return (
    <ModulePlaceholder
      title="Monitoreo Ambiental"
      description="Seguimiento de obras de captación, estaciones limnimétricas, captaciones de agua lluvia y beneficiarios. Próxima fase."
      Icon={Activity}
    />
  );
}
