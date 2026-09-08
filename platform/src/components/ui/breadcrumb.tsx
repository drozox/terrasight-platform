// =============================================================================
// Breadcrumb — UX-63
//
// Componente reutilizable para drill-downs. Acepta una lista de items con
// label + href opcional (el último item no debe tener href — es la página
// actual y se renderiza como texto plano, no como link).
//
// Uso:
//   <Breadcrumb items={[
//     { label: "Metas del convenio", href: "/metas/convenio" },
//     { label: "GUATAVITA" },
//   ]} />
// =============================================================================

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-on-surface-variant flex-wrap">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const isFirst = idx === 0;
        return (
          <span key={`${item.label}-${idx}`} className="inline-flex items-center gap-1.5">
            {idx > 0 && <ChevronRight className="size-3.5 opacity-60" aria-hidden="true" />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="inline-flex items-center gap-1 hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
              >
                {isFirst && <Home className="size-3.5" aria-hidden="true" />}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span
                className="text-on-surface font-medium"
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
