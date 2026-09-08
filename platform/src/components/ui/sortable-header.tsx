// =============================================================================
// SortableHeader — UX-80
//
// Header de tabla clickeable que ordena asc/desc manteniendo el resto de los
// searchParams. Server-side sort (los datos se re-ordenan en la query del
// server component padre).
//
// Uso:
//   <SortableHeader field="nombre" currentSort={sort} currentOrder={order}>
//     Nombre
//   </SortableHeader>
// =============================================================================

import Link from "next/link";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SortableHeaderProps {
  field: string;
  currentSort: string;
  currentOrder: "asc" | "desc";
  basePath: string; // ej. "/predios"
  searchParams?: Record<string, string | undefined>;
  className?: string;
  children: React.ReactNode;
}

export function SortableHeader({
  field,
  currentSort,
  currentOrder,
  basePath,
  searchParams = {},
  className,
  children,
}: SortableHeaderProps) {
  const isCurrent = currentSort === field;
  const nextOrder: "asc" | "desc" = isCurrent && currentOrder === "asc" ? "desc" : "asc";

  // Construir URL con nuevo sort/order, preservando otros searchParams
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v !== undefined && v !== "") params.set(k, v);
  }
  params.set("sort", field);
  params.set("order", nextOrder);

  const Icon = !isCurrent ? ChevronsUpDown : currentOrder === "asc" ? ArrowUp : ArrowDown;

  return (
    <Link
      href={`${basePath}?${params.toString()}`}
      className={cn(
        "inline-flex items-center gap-1 hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded",
        isCurrent && "text-primary font-semibold",
        className,
      )}
      aria-sort={isCurrent ? (currentOrder === "asc" ? "ascending" : "descending") : "none"}
    >
      <span>{children}</span>
      <Icon className="size-3" aria-hidden="true" />
    </Link>
  );
}
