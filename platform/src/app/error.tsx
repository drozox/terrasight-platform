"use client";

// =============================================================================
// /app/error.tsx — Error boundary global del dashboard
//
// DEBUG-2026-09-11: Captura "Application error: a client-side exception" y
// muestra el stack trace real para diagnóstico. Reemplaza el error UI
// genérico de Next.js. Reemplazar por un UI más friendly cuando se cierre
// el debug.
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
    // Log al servidor/console para diagnóstico
    console.error("[APP ERROR]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-container-lowest p-6">
      <div className="max-w-2xl rounded-2xl border border-error/30 bg-surface-container-low p-6 shadow-lg">
        <h1 className="mb-3 text-2xl font-bold text-error">
          🐛 Application error (debug mode)
        </h1>
        <p className="mb-4 text-sm text-on-surface-variant">
          Este UI es temporal para capturar el error exacto. Reemplazá este archivo por un UI amigable cuando se cierre el debug.
        </p>
        <div className="mb-4 rounded-lg bg-surface-container p-3 text-xs">
          <div className="mb-2 font-mono font-bold text-on-surface">
            <strong>Message:</strong> {error.message || "(empty)"}
          </div>
          {error.digest && (
            <div className="mb-2 font-mono text-on-surface-variant">
              <strong>Digest:</strong> {error.digest}
            </div>
          )}
          {error.stack && (
            <details className="font-mono text-[10px] text-on-surface-variant">
              <summary className="cursor-pointer">Stack trace</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary hover:bg-primary/90"
          >
            Reintentar
          </button>
          <Link
            href="/login"
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-bold text-on-surface hover:bg-surface-container"
          >
            Ir a /login
          </Link>
        </div>
      </div>
    </main>
  );
}
