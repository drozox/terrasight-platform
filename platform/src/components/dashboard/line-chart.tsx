import { cn } from "@/lib/utils";

export interface LinePoint {
  etiqueta: string;
  valor: number;
}

export interface LineSeries {
  label: string;
  color: "primary" | "secondary" | "tertiary";
  data: LinePoint[];
}

const STROKE: Record<LineSeries["color"], string> = {
  primary:   "stroke-primary",
  secondary: "stroke-secondary",
  tertiary:  "stroke-tertiary",
};

const FILL: Record<LineSeries["color"], string> = {
  primary:   "fill-primary",
  secondary: "fill-secondary",
  tertiary:  "fill-tertiary",
};

/**
 * LineChart multi-serie con SVG puro (sin dependencias externas).
 * Inspirado en `charts.tsx` del dashboard de referencia (geoportal-data-dashboard),
 * adaptado al sistema de tokens de SIG TERRITORIO (primary/secondary/tertiary).
 *
 * - Gridlines: 4 líneas horizontales
 * - Cada serie: línea + área translúcida debajo
 * - Highlight en el último punto con etiqueta flotante
 * - Eje X: etiquetas de cada punto
 */
export function LineChart({
  series,
  width = 480,
  height = 170,
  showLegend = true,
}: {
  series: LineSeries[];
  width?: number;
  height?: number;
  showLegend?: boolean;
}) {
  if (series.length === 0) return null;

  const padX = 36;
  const padY = 28;
  const allValues = series.flatMap((s) => s.data.map((d) => d.valor));
  const max = Math.max(...allValues, 1) * 1.1;
  const min = 0;
  const firstSeriesLen = series[0].data.length;
  const stepX = (width - padX * 2) / Math.max(firstSeriesLen - 1, 1);
  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const yMax = padY + 1 * (height - padY * 2);
  const yMin = padY + 0 * (height - padY * 2);

  // y para un valor dado
  const yOf = (v: number) =>
    yMax - ((v - min) / (max - min)) * (height - padY * 2);

  return (
    <div className="w-full">
      {showLegend && (
        <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px]">
          {series.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span
                className={cn("h-0.5 w-4 rounded-full", {
                  "bg-primary":   s.color === "primary",
                  "bg-secondary": s.color === "secondary",
                  "bg-tertiary":  s.color === "tertiary",
                })}
              />
              <span className="font-bold text-on-surface-variant">{s.label}</span>
            </div>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Gráfico de líneas"
      >
        {/* Gridlines */}
        {gridLines.map((g, i) => {
          const y = padY + g * (height - padY * 2);
          return (
            <line
              key={i}
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              className="stroke-outline-variant"
              strokeWidth={1}
              strokeDasharray={g === 0 ? "0" : "2 4"}
              opacity={g === 0 ? 1 : 0.5}
            />
          );
        })}

        {/* Eje Y - min/max labels */}
        <text x={padX - 6} y={yMin + 3} textAnchor="end" className="fill-on-surface-variant" fontSize={9}>
          {min}
        </text>
        <text x={padX - 6} y={yMax + 3} textAnchor="end" className="fill-on-surface-variant" fontSize={9}>
          {Math.round(max)}
        </text>

        {/* Series */}
        {series.map((s) => {
          const points = s.data.map((d, i) => ({
            x: padX + i * stepX,
            y: yOf(d.valor),
            ...d,
          }));
          const path = points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");
          const area = `${path} L ${points[points.length - 1].x} ${yMax} L ${points[0].x} ${yMax} Z`;
          const last = points[points.length - 1];
          return (
            <g key={s.label}>
              <path
                d={area}
                className={cn(FILL[s.color])}
                opacity={0.12}
              />
              <path
                d={path}
                className={cn(STROKE[s.color])}
                strokeWidth={2.5}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={i === points.length - 1 ? 5 : 3.5}
                  className={cn(FILL[s.color], "stroke-surface-container-lowest")}
                  strokeWidth={1.5}
                />
              ))}
              {/* X-axis labels */}
              {points.map((p, i) => (
                <text
                  key={`xl-${i}`}
                  x={p.x}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-on-surface-variant"
                  fontSize={9}
                >
                  {p.etiqueta}
                </text>
              ))}
              {/* Highlight label en el último punto */}
              <g>
                <rect
                  x={last.x - 38}
                  y={last.y - 22}
                  width={36}
                  height={16}
                  rx={3}
                  className={cn(FILL[s.color])}
                />
                <text
                  x={last.x - 20}
                  y={last.y - 10}
                  textAnchor="middle"
                  fill="white"
                  fontSize={9}
                  fontWeight={600}
                >
                  {last.valor.toLocaleString("es-CO")}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}