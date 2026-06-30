import { Card } from "@/components/ui/card";
import { IconLeaf, IconDrop, IconForest } from "@/components/icons";

const CONFIG = {
  C1: {
    label: "COMPONENTE 1",
    desc: "Conservación del recurso hídrico y adaptación al cambio climático",
    Icon: IconLeaf,
    accent: "primary",
    bg: "bg-primary/10",
    text: "text-primary",
    border: "bg-primary",
  },
  C2: {
    label: "COMPONENTE 2",
    desc: "Manejo integral del ciclo del agua y restauración de suelos",
    Icon: IconDrop,
    accent: "secondary",
    bg: "bg-secondary/10",
    text: "text-secondary",
    border: "bg-secondary",
  },
  C3: {
    label: "COMPONENTE 3",
    desc: "Planificación predial participativa y reconversión productiva",
    Icon: IconForest,
    accent: "tertiary",
    bg: "bg-tertiary/10",
    text: "text-tertiary",
    border: "bg-tertiary",
  },
} as const;

export function ComponentRibbon() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {(Object.keys(CONFIG) as Array<keyof typeof CONFIG>).map((k) => {
        const c = CONFIG[k];
        return (
          <Card
            key={k}
            className="group relative cursor-pointer overflow-hidden p-4 transition-shadow hover:shadow-md"
          >
            <div
              className={`absolute inset-y-0 left-0 w-1 ${c.border}`}
              aria-hidden
            />
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${c.bg} ${c.text}`}
              >
                <c.Icon className="size-8" />
              </div>
              <div>
                <h3 className={`mb-0.5 text-label-lg font-bold ${c.text}`}>{c.label}</h3>
                <p className="line-clamp-2 text-body-sm text-on-surface-variant">
                  {c.desc}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
