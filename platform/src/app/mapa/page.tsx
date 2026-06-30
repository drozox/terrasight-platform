import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { Map as MapIcon } from "lucide-react";

export default function MapaPage() {
  return (
    <ModulePlaceholder
      title="Visor Geográfico 2D / 3D"
      description="Mapa interactivo a pantalla completa con todas las capas (límites administrativos, hidrografía, áreas protegidas, cobertura vegetal, uso del suelo). Próxima fase."
      Icon={MapIcon}
    />
  );
}
