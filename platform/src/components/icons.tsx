import * as React from "react";
import { cn } from "@/lib/utils";

/** SIG Territorio — frailejón oficial, recreado en SVG inline.
 *  Roseta de hojas oliva + 3 flores amarillas. Nítido a cualquier tamaño,
 *  sin depender de un PNG pesado. */
export function SigTerritorioLogo({ className }: { className?: string }) {
  const leaf = "#5E6F2E";
  const flower = "#F5C400";
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="SIG Territorio"
    >
      {/* Hojas (roseta) */}
      <g fill={leaf}>
        {/* centro */}
        <path d="M50 85 Q43 64 50 42 Q57 64 50 85 Z" />
        {/* internas */}
        <path d="M50 85 Q40 70 36 52 Q46 70 50 85 Z" />
        <path d="M50 85 Q60 70 64 52 Q54 70 50 85 Z" />
        {/* medias */}
        <path d="M50 85 Q34 76 22 60 Q36 72 50 85 Z" />
        <path d="M50 85 Q66 76 78 60 Q64 72 50 85 Z" />
        {/* bajas */}
        <path d="M50 85 Q32 84 12 78 Q30 76 50 85 Z" />
        <path d="M50 85 Q68 84 88 78 Q70 76 50 85 Z" />
        {/* tronco */}
        <path d="M46.5 84 L53.5 84 L52.5 98 L47.5 98 Z" />
      </g>
      {/* Tallos */}
      <g stroke={leaf} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M50 43 L50 31" />
        <path d="M45 45 Q42 38 40 31" />
        <path d="M55 45 Q58 38 60 31" />
      </g>
      {/* Flores */}
      <g fill={flower}>
        <circle cx="50" cy="24" r="6.6" />
        <circle cx="38.5" cy="27" r="6" />
        <circle cx="61.5" cy="25.5" r="6" />
      </g>
    </svg>
  );
}

/** DEEPSEEK-F6: logo de aliado. Renderiza <img> con el archivo real en /public/logos/.
 *  Si no se pasa `src`, usa un placeholder SVG estilizado (fallback). */
export function PartnerLogo({
  name,
  className,
  src,
}: {
  name: "wwf" | "car" | "natura" | "sig-territorio";
  className?: string;
  src?: string;
}) {
  const palette: Record<typeof name, { primary: string; secondary: string; label: string; abbr: string }> = {
    wwf:   { primary: "#000000", secondary: "#FFFFFF", label: "WWF",                   abbr: "W" },
    car:   { primary: "#006d37", secondary: "#FFFFFF", label: "CAR Cundinamarca",      abbr: "C" },
    natura: { primary: "#7a4f1d", secondary: "#FFFFFF", label: "Fundación Natura",      abbr: "N" },
    "sig-territorio": { primary: "#006d37", secondary: "#FFFFFF", label: "SIG TERRITORIO", abbr: "S" },
  };
  const p = palette[name];

  // Si hay imagen real, usarla; el tamaño lo define el className.
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={p.label}
        className={cn("object-contain", className)}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 100 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={p.label}
    >
      <rect width="100" height="32" rx="4" fill={p.secondary} />
      <circle cx="14" cy="16" r="10" fill={p.primary} />
      <text
        x="14"
        y="20"
        textAnchor="middle"
        fill={p.secondary}
        fontFamily="Hanken Grotesk, sans-serif"
        fontSize="12"
        fontWeight="700"
      >
        {p.abbr}
      </text>
      <text
        x="58"
        y="20"
        textAnchor="middle"
        fill={p.primary}
        fontFamily="Hanken Grotesk, sans-serif"
        fontSize="10"
        fontWeight="700"
        letterSpacing="0.05em"
      >
        {p.label.toUpperCase()}
      </text>
    </svg>
  );
}

export function IconLeaf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11 20A7 7 0 0 1 4 13c0-5 5-9 9-9 0 9-2 16-2 16Z" />
      <path d="M2 22s2-1 4-1 5 1 7 1 5-1 7-1" />
    </svg>
  );
}

export function IconDrop({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2s7 8 7 13a7 7 0 1 1-14 0c0-5 7-13 7-13Z" />
    </svg>
  );
}

export function IconForest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2 6 10h3l-3 4h3l-3 4h12l-3-4h3l-3-4h3L12 2Z" />
      <path d="M12 18v4" />
    </svg>
  );
}

export function IconUpload({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export function IconWarn({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function IconArrowUp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="17 11 12 6 7 11" />
      <polyline points="17 18 12 13 7 18" />
    </svg>
  );
}
