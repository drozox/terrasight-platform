"use client";

// =============================================================================
// ConfirmDialog — diálogo accesible para acciones destructivas.
//
// UX-55 (audit 2026-07-24): antes usabamos `confirm()` nativo de JS para
// eliminar componentes/acciones en /catalogos y descartar alertas en /alertas.
// El modal nativo:
//   - Rompe la estetica (look OS, no del design system SIG TERRITORIO)
//   - No respeta focus trap ni ESC (inconsistente entre browsers)
//   - No es accesible para screen readers (sin aria-label, sin title)
//   - Bloquea el thread del UI thread (mala UX percibida)
//
// Fix: ConfirmDialog wrapper sobre @radix-ui/react-dialog (ya instalado en
// package.json). Pattern: trigger button + controlled open state. El
// dialog title y description se renderizan cuando esta abierto. Los botones
// "Cancelar" y "Confirmar" usan nuestro Button component (color danger).
// =============================================================================

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  /** Estado controlado del dialog. */
  open: boolean;
  /** Callback cuando el dialog se cierra (cancel, ESC, backdrop, X). */
  onOpenChange: (open: boolean) => void;
  /** Titulo del dialog (corto, accion en infinitivo). */
  title: string;
  /** Descripcion del impacto. Default: "Esta accion no se puede deshacer." */
  description?: string;
  /** Label del boton de confirmacion. Default: "Confirmar". */
  confirmLabel?: string;
  /** Label del boton de cancelar. Default: "Cancelar". */
  cancelLabel?: string;
  /** Tono del boton de confirmacion. Default: "danger" (rojo, accion destructiva). */
  confirmVariant?: "danger" | "default";
  /** Callback cuando el usuario confirma. Puede ser async. */
  onConfirm: () => void | Promise<void>;
  /** Si true, desactiva el boton de confirmacion mientras la accion corre. */
  loading?: boolean;
  /** Variant visual segun gravedad. "destructive" = rojo icon. "warning" = amber. */
  tone?: "destructive" | "warning";
};

const TONE_BG: Record<NonNullable<ConfirmDialogProps["tone"]>, string> = {
  destructive: "bg-error/10 text-error",
  warning:     "bg-warning/10 text-warning",
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description = "Esta acción no se puede deshacer.",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "danger",
  onConfirm,
  loading = false,
  tone = "destructive",
}: ConfirmDialogProps) {
  // Refs para autofocus: ESC cierra (Radix lo hace), pero queremos que el
  // boton de cancelar tenga focus al abrir (escape hatch rapido).
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  async function handleConfirm() {
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      // El caller maneja el error (muestra flash, etc). El dialog NO se
      // cierra para que el usuario pueda reintentar.
      console.error("[ConfirmDialog] onConfirm error:", err);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-surface/80 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        />
        <Dialog.Content
          aria-describedby={undefined /* description se setea abajo */}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          )}
        >
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                TONE_BG[tone],
              )}
              aria-hidden="true"
            >
              <AlertTriangle className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-lg font-bold text-on-surface">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-body-sm text-on-surface-variant">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close
              asChild
              aria-label="Cerrar"
            >
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button
                ref={cancelRef}
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => onOpenChange(false)}
                autoFocus
              >
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button
              type="button"
              variant={confirmVariant}
              disabled={loading}
              onClick={handleConfirm}
            >
              {loading ? "Procesando…" : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
