import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { Settings } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guard";

export default async function ConfiguracionPage() {
  await requireAdmin();
  return (
    <ModulePlaceholder
      title="Configuración"
      description="Gestión de usuarios, roles, capas base, parámetros del convenio y backups. Próxima fase."
      Icon={Settings}
    />
  );
}
