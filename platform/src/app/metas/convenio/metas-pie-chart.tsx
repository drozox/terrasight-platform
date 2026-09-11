"use client";

// =============================================================================
// metas-pie-chart.tsx — Torta de cumplimiento para /metas/convenio
//
// P2-8 (FINAL-CLOSURE-PLAN): Recharts requiere browser (SVG/canvas) y debe
// vivir en un Client Component. Cuando se importa directamente desde un
// Server Component, webpack falla con:
//   "Super expression must either be null or a function"
// al extender `PureComponent` durante la fase de "Collecting page data".
// Este wrapper aísla la torta del server rendering.
// =============================================================================

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export interface PieDatum {
  name: string;
  value: number;
  color: string;
}

export function MetasPieChart({ data }: { data: PieDatum[] }) {
  if (data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          paddingAngle={2}
        >
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 10 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
