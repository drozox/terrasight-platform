// =============================================================================
// Timeline histórico de avances de la intervención (HU-IC-04).
// Componente presentacional — no tiene estado.
//
// Muestra una línea vertical con dots, fecha formateada (es-CO), % de avance
// en badge, nota (si hay) y autor del registro.
// =============================================================================

import * as React from "react";
import { Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AvancePropuesta } from "@/lib/types";

const FMT_FECHA = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatFechaAvance(d: Date): string {
  try {
    return FMT_FECHA.format(d);
  } catch {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
}

function badgeVariant(pct: number): "primary" | "secondary" | "tertiary" | "outline" {
  if (pct >= 100) return "primary";
  if (pct >= 75) return "secondary";
  if (pct >= 25) return "tertiary";
  return "outline";
}

export function Timeline({ avances }: { avances: AvancePropuesta[] }) {
  if (avances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-on-surface-variant">
        <Clock className="size-8 opacity-30" />
        <p className="text-body-sm font-semibold">Sin registros de avance todavía</p>
        <p className="text-[11px]">
          Cuando un gestor actualice el porcentaje, el evento aparecerá acá.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative ml-2">
      {/* Línea vertical conectora */}
      <span
        aria-hidden
        className="absolute left-[7px] top-2 bottom-2 w-px bg-outline-variant"
      />
      {avances.map((a, i) => (
        <li key={a.idAvance} className="relative flex gap-3 pb-4 last:pb-0">
          {/* Dot */}
          <span
            aria-hidden
            className="z-10 mt-1.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-surface-container-lowest"
            data-first={i === 0 ? "true" : "false"}
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <time
                dateTime={a.createdAt.toISOString()}
                className="font-mono text-[11px] text-on-surface-variant"
              >
                {formatFechaAvance(a.createdAt)}
              </time>
              <Badge variant={badgeVariant(a.avancePct)}>
                {a.avancePct}%
              </Badge>
            </div>
            {a.nota && (
              <p className="mt-1 whitespace-pre-wrap text-body-sm text-on-surface">
                {a.nota}
              </p>
            )}
            {a.autorEmail && (
              <p className="mt-1 flex items-center gap-1 text-[10px] text-on-surface-variant">
                <User className="size-3" />
                {a.autorEmail}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
