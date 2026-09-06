import * as React from "react";

/** Logo institucional SIG TERRITORIO — hoja + gota de agua (SVG inline, escala libre). */
export function SigTerritorioLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SIG TERRITORIO logo"
    >
      <rect width="40" height="40" rx="8" fill="#006d37" />
      <path
        d="M11 27C11 19.27 17.27 13 25 13c0 7.732-6.268 14-14 14Z"
        fill="#7efba4"
      />
      <circle cx="26" cy="22" r="4" fill="#a3d4fe" />
    </svg>
  );
}

/** Logo de alianza. Si se pasa `src`, renderiza <img> con el archivo en /public.
 *  Si no, usa un placeholder SVG estilizado (queda como fallback). */
export function PartnerLogo({
  name,
  className,
  src,
}: {
  name: "wwf" | "car" | "natura";
  className?: string;
  src?: string;
}) {
  const palette: Record<typeof name, { primary: string; secondary: string; label: string; abbr: string }> = {
    wwf:   { primary: "#000000", secondary: "#FFFFFF", label: "WWF",          abbr: "W" },
    car:   { primary: "#006d37", secondary: "#FFFFFF", label: "CAR",          abbr: "C" },
    natura: { primary: "#7a4f1d", secondary: "#FFFFFF", label: "Fund. Natura", abbr: "N" },
  };
  const p = palette[name];

  // Si hay imagen real, usarla; conservar el alto del className y dejar ancho auto.
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={p.label}
        className={className}
        style={{ height: "auto", maxHeight: "2rem", width: "auto" }}
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
