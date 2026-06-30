import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { Wrench } from "lucide-react";

export default function IntervencionesPage() {
  return (
    <ModulePlaceholder
      title="Módulo de Intervenciones"
      description="Catálogo de propuestas (línea, polígono, punto), agrupación por componente/acción y registro de avances. Próxima fase."
      Icon={Wrench}
    />
  );
}
