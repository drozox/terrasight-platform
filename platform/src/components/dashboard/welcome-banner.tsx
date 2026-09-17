"use client";

// =============================================================================
// WelcomeBanner — saludo al ingresar. Se muestra UNA vez por sesión
// (sessionStorage) y se puede cerrar con la X.
// =============================================================================

import * as React from "react";
import { Info, X } from "lucide-react";

const KEY = "inicio.welcome.shown";

export function WelcomeBanner({ nombre }: { nombre: string }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  function close() {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/[0.04] px-5 py-4"
    >
      <p className="flex items-center gap-2.5 text-[15px] text-on-surface">
        <Info className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span>
          ¡Hola, <span className="font-semibold text-primary">{nombre}</span>! Bienvenido a SIG Territorio
        </span>
      </p>
      <button
        type="button"
        onClick={close}
        aria-label="Cerrar saludo"
        title="Cerrar"
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
