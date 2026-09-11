"use client";

import { cn } from "@/lib/utils";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

const COLOR_MAP: Record<string, string> = {
  primary: "stroke-primary",
  secondary: "stroke-secondary",
  tertiary: "stroke-tertiary",
  outline: "stroke-outline-variant",
  success: "stroke-success",
  warning: "stroke-warning",
  error: "stroke-error",
  info: "stroke-info",
};

export function DonutChart({
  segments,
  size = 144,
  centerLabel,
  centerSubLabel,
}: {
  segments: DonutSegment[];
  size?: number;
  centerLabel: string | number;
  centerSubLabel: string;
}) {
  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative flex" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="transform-gpu"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          className="stroke-surface-variant"
          strokeWidth={16}
        />
        {segments.map((s, i) => {
          const dash = (s.value / total) * circumference;
          const dashGap = circumference - dash;
          const dashOffset = -offset;
          offset += dash;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              className={cn(COLOR_MAP[s.color] ?? "stroke-primary")}
              strokeWidth={16}
              strokeDasharray={`${dash} ${dashGap}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 800ms" }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-on-surface">{centerLabel}</span>
        <span className="text-[10px] font-bold uppercase text-on-surface-variant">
          {centerSubLabel}
        </span>
      </div>
    </div>
  );
}
