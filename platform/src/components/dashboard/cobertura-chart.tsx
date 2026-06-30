import { Card } from "@/components/ui/card";
import { DonutChart } from "./donut-chart";
import { formatDecimal } from "@/lib/utils";
import type { CoberturaTotal } from "@/lib/types";

export function CoberturaChart({
  items,
  title,
  totalLabel,
  totalValue,
}: {
  items: CoberturaTotal[];
  title: string;
  totalLabel: string;
  totalValue: string | number;
}) {
  return (
    <Card className="p-4 xl:col-span-3">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-title-lg font-semibold text-on-surface">{title}</h3>
        <button className="text-label-md font-bold text-primary hover:underline">
          Ver mapa
        </button>
      </div>
      <div className="flex flex-col items-center">
        <DonutChart
          size={144}
          segments={items.map((i) => ({
            label: i.nombre,
            value: i.area > 0 ? i.area : i.porcentaje,
            color: i.color,
          }))}
          centerLabel={totalValue}
          centerSubLabel={totalLabel}
        />
        <div className="mt-4 w-full space-y-2">
          {items.map((i) => (
            <div
              key={i.nombre}
              className="flex items-center justify-between text-body-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    background:
                      i.color === "primary"
                        ? "var(--color-primary)"
                        : i.color === "secondary"
                        ? "var(--color-secondary)"
                        : i.color === "tertiary"
                        ? "var(--color-tertiary)"
                        : "var(--color-outline-variant)",
                  }}
                />
                <span>{i.nombre}</span>
              </div>
              <span className="font-bold">{formatDecimal(i.porcentaje, 0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
