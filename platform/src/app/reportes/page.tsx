import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { FileText } from "lucide-react";
import { requireRole } from "@/lib/auth-guard";

export default async function ReportesPage() {
  await requireRole(["ADMIN", "ANALISTA"] as const);
  return (
    <ModulePlaceholder
      title="Reportes"
      description="Los 10 reportes ya escritos en SQL (Consultas_Reportes.sql / Vistas_Principales.sql) listos para exportar a PDF/CSV. Próxima fase."
      Icon={FileText}
    />
  );
}
