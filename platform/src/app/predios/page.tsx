import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { Building2 } from "lucide-react";

export default function PrediosPage() {
  return (
    <ModulePlaceholder
      title="Módulo de Predios"
      description="CRUD de predios, propietarios y asociaciones a coberturas, biomas y zonificaciones (POMCA / RFP / Páramos). Próxima fase."
      Icon={Building2}
    />
  );
}
