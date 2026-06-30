import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { Settings } from "lucide-react";

export default function ConfiguracionPage() {
  return (
    <ModulePlaceholder
      title="Configuración"
      description="Gestión de usuarios, roles, capas base, parámetros del convenio y backups. Próxima fase."
      Icon={Settings}
    />
  );
}
