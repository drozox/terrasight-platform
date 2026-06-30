import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { FileText } from "lucide-react";

export default function ReportesPage() {
  return (
    <ModulePlaceholder
      title="Reportes"
      description="Los 10 reportes ya escritos en SQL (Consultas_Reportes.sql / Vistas_Principales.sql) listos para exportar a PDF/CSV. Próxima fase."
      Icon={FileText}
    />
  );
}
