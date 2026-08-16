// =============================================================================
// Tests para ConfirmDialog — modal accesible para acciones destructivas.
// =============================================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

describe("<ConfirmDialog>", () => {
  it("no renderiza nada cuando open=false", () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={() => {}}
        title="Eliminar?"
        onConfirm={() => {}}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renderiza title + description + buttons cuando open=true", () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Eliminar componente C1"
        description="Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={() => {}}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/Eliminar componente C1/);
    expect(dialog).toHaveTextContent(/Esta accion no se puede deshacer\./);
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("el boton Cancelar llama onOpenChange(false)", async () => {
    const user = userEvent.setup();
    let lastValue: boolean | null = null;
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={(o) => { lastValue = o; }}
        title="Eliminar?"
        onConfirm={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(lastValue).toBe(false);
  });

  it("el boton Confirmar llama onConfirm y luego onOpenChange(false) si OK", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    let lastValue: boolean | null = null;
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={(o) => { lastValue = o; }}
        title="Eliminar?"
        onConfirm={onConfirm}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    // Tras onConfirm exitoso, el dialog se cierra (onOpenChange(false)).
    expect(lastValue).toBe(false);
  });

  it("NO cierra el dialog si onConfirm rechaza (retry-friendly)", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue(new Error("network"));
    let lastValue: boolean | null = null;
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={(o) => { lastValue = o; }}
        title="Eliminar?"
        onConfirm={onConfirm}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    // El dialog NO se cierra para que el usuario pueda reintentar.
    expect(lastValue).toBe(null);
  });

  it("loading=true deshabilita ambos botones y muestra 'Procesando...'", () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Eliminar?"
        onConfirm={() => {}}
        loading={true}
      />,
    );
    // El confirm label cambia a "Procesando..."
    const confirmBtn = screen.getByRole("button", { name: "Procesando…" });
    expect(confirmBtn).toBeDisabled();
    // El cancel button sigue con label "Cancelar" y esta disabled.
    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    expect(cancelBtn).toBeDisabled();
  });

  it("el tone destructive pinta el icono en color error", () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Eliminar?"
        onConfirm={() => {}}
        tone="destructive"
      />,
    );
    // Radix Dialog renderiza en un portal fuera del container de React,
    // asi que revisamos document.body directamente. El icono container
    // tiene bg-error/10 en tone=destructive.
    expect(document.body.innerHTML).toMatch(/bg-error\/10/);
  });
});
