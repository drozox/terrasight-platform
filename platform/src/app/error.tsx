"use client";

// =============================================================================
// /app/error.tsx — Error boundary global del dashboard
//
// P3 (FINAL-CLOSURE-PLAN): el UI de debug temporal (2026-09-11) se reemplazó
// por uno production-safe. Ya NO se muestra `error.message` ni el stack trace
// al usuario (evita información disclosure de rutas/estructura interna).
// Se sigue logueando en consola para diagnóstico y se expone el `digest`
// (id opaco) para correlacionar con los logs del servidor.
// =============================================================================

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log para diagnóstico (consola del browser / captura del servidor).
    console.error("[APP ERROR]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-container-lowest p-6">
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-low p-6 text-center shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-on-surface">
          Algo salió mal
        </h1>
        <p className="mb-5 text-body-sm text-on-surface-variant">
          No pudimos cargar esta sección. Podés reintentar o volver al inicio.
          Si el problema persiste, contactá al administrador.
        </p>
        {error.digest && (
          <p className="mb-5 font-mono text-[11px] text-on-surface-variant">
            Código de referencia: {error.digest}
          </p>
        )}
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary hover:bg-primary/90"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-bold text-on-surface hover:bg-surface-container"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
