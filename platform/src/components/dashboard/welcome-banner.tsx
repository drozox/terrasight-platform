"use client";

// =============================================================================
// WelcomeBanner — saludo al ingresar. Se muestra UNA vez por sesión
// (sessionStorage) y se puede cerrar con la X.
// =============================================================================

import * as React from "react";
import { X } from "lucide-react";

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
      className="flex items-center justify-between gap-gutter rounded-xl border border-primary/30 bg-primary/5 px-gutter py-md"
    >
      <p className="text-body-md text-on-surface">
        ¡Hola, <span className="font-bold text-primary">{nombre}</span>! Bienvenido a SIG Territorio
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
