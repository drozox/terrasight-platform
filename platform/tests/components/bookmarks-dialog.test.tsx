// =============================================================================
// Tests para BookmarksDialog — modal "Marcadores guardados" del botón Bookmark
// del MapSearchBar (mockup "Próximamente" con preview de la lista).
// =============================================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookmarksDialog } from "@/components/map/bookmarks-dialog";

describe("<BookmarksDialog>", () => {
  it("no renderiza cuando open=false", () => {
    render(<BookmarksDialog open={false} onOpenChange={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renderiza titulo + descripcion cuando open=true", () => {
    render(<BookmarksDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(/Marcadores guardados · Próxima fase/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Guarda vistas del mapa/i),
    ).toBeInTheDocument();
  });

  it("muestra 3 marcadores de preview con coordenadas", () => {
    render(<BookmarksDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByText(/PNN Chingaza · Sector Centro/)).toBeInTheDocument();
    expect(screen.getByText(/Vereda El Salitre · Predio #14/)).toBeInTheDocument();
    expect(screen.getByText(/Río Bogotá · Km 32/)).toBeInTheDocument();
    // Coordenadas con notación N/W
    expect(screen.getByText(/4\.45°N, 73\.65°W/)).toBeInTheDocument();
  });

  it("muestra las 4 features del roadmap (guardar, compartir, exportar, historial)", () => {
    render(<BookmarksDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByText(/Guarda la vista actual con un nombre/)).toBeInTheDocument();
    expect(screen.getByText(/Comparte marcadores con tu equipo/)).toBeInTheDocument();
    expect(screen.getByText(/Exporta marcadores a KML o GeoJSON/)).toBeInTheDocument();
    expect(screen.getByText(/Historial de las últimas 10 vistas/)).toBeInTheDocument();
  });

  it("el CTA mailto incluye subject prellenado", () => {
    render(<BookmarksDialog open={true} onOpenChange={() => {}} />);
    const link = screen.getByRole("link", { name: /Pedir esta función/i });
    expect(link.getAttribute("href")).toMatch(/^mailto:producto@terrasight\.local/);
    expect(link.getAttribute("href")).toContain("subject=");
  });

  it("click en Cerrar invoca onOpenChange(false)", async () => {
    const onOpenChange = vi.fn();
    render(<BookmarksDialog open={true} onOpenChange={onOpenChange} />);
    const user = userEvent.setup();
    // Hay 2 botones "Cerrar" (el Button outlined + el X). Tomamos el primero.
    const closeButtons = screen.getAllByRole("button", { name: "Cerrar" });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
    await user.click(closeButtons[0]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("indica honestamente que los datos son preview (no reales)", () => {
    render(<BookmarksDialog open={true} onOpenChange={() => {}} />);
    expect(
      screen.getByText(/Vista previa \(sin datos aún\)/),
    ).toBeInTheDocument();
  });
});
