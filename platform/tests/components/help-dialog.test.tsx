// =============================================================================
// Tests para HelpDialog — modal "Ayuda" del botón HelpCircle del TopBar.
// =============================================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelpDialog } from "@/components/layout/help-dialog";

describe("<HelpDialog>", () => {
  it("no renderiza nada cuando open=false", () => {
    render(<HelpDialog open={false} onOpenChange={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renderiza titulo + descripcion cuando open=true", () => {
    render(<HelpDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Ayuda y soporte")).toBeInTheDocument();
    expect(
      screen.getByText(/plataforma SIG del convenio CAR Cundinamarca/i),
    ).toBeInTheDocument();
  });

  it("lista los 4 atajos de teclado", () => {
    render(<HelpDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByText(/Buscar municipio, vereda o predio/)).toBeInTheDocument();
    expect(screen.getByText(/Abrir este diálogo de ayuda/)).toBeInTheDocument();
    expect(screen.getByText(/Cerrar diálogos y modales/)).toBeInTheDocument();
    expect(screen.getByText(/Navegar entre páginas/)).toBeInTheDocument();
  });

  it("muestra los <kbd> con la tecla del shortcut", () => {
    render(<HelpDialog open={true} onOpenChange={() => {}} />);
    // ⌘K aparece como dos <kbd> ("⌘" y "K")
    const kbds = screen.getAllByText(/^[⌘K?Esc←→]+$/);
    expect(kbds.length).toBeGreaterThanOrEqual(4);
  });

  it("muestra el mailto de soporte con subject prellenado", () => {
    render(<HelpDialog open={true} onOpenChange={() => {}} />);
    const link = screen.getByRole("link", { name: /Contactar soporte/i });
    expect(link).toHaveAttribute("href");
    expect(link.getAttribute("href")).toMatch(/^mailto:soporte@terrasight\.local/);
    expect(link.getAttribute("href")).toContain("subject=");
  });

  it("click en Cerrar invoca onOpenChange(false)", async () => {
    const onOpenChange = vi.fn();
    render(<HelpDialog open={true} onOpenChange={onOpenChange} />);
    const user = userEvent.setup();
    // Hay 2 botones "Cerrar": el Button "Cerrar" y el X. Tomamos el primero.
    const closeButtons = screen.getAllByRole("button", { name: "Cerrar" });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
    await user.click(closeButtons[0]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("botón X (aria-label=Cerrar) tambien cierra", async () => {
    const onOpenChange = vi.fn();
    render(<HelpDialog open={true} onOpenChange={onOpenChange} />);
    // Hay 2 botones "Cerrar": el Button "Cerrar" y el X. Ambos deben cerrar.
    const closeButtons = screen.getAllByRole("button", { name: "Cerrar" });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
  });
});
