"use client";

// =============================================================================
// PrintButton — botón "Imprimir / PDF" del módulo de reportes.
//
// Necesita `"use client"` porque su `onClick` llama a `window.print()`,
// que es una API exclusiva del navegador. No se puede pasar un `onClick`
// (función) desde un Server Component, así que este wrapper encapsula la
// lógica de impresión y el Server Component padre solo le pasa props
// serializables (variant, size, children).
// =============================================================================

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

type Props = Omit<ButtonProps, "onClick">;

export function PrintButton({ children, ...rest }: Props) {
  return (
    <Button
      {...rest}
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
    >
      {children}
    </Button>
  );
}
