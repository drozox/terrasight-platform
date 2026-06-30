import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { Bell } from "lucide-react";

export default function AlertasPage() {
  return (
    <ModulePlaceholder
      title="Alertas y Notificaciones"
      description="Deforestación, niveles hidrométricos, eventos no conformes. Próxima fase."
      Icon={Bell}
    />
  );
}
