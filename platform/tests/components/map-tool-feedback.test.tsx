// =============================================================================
// Tests para MapToolFeedback — toast inline que aparece cuando se selecciona
// un tool del MapTools (medir, seleccionar, dibujar, marcadores).
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MapToolFeedback } from "@/components/map/map-tool-feedback";

describe("<MapToolFeedback>", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("no renderiza nada cuando tool=null", () => {
    const { container } = render(
      <MapToolFeedback tool={null} onClose={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renderiza el titulo del tool cuando se pasa", () => {
    render(<MapToolFeedback tool="measure" onClose={() => {}} />);
    expect(screen.getByText(/Medir distancia/)).toBeInTheDocument();
    expect(screen.getByText(/Próxima fase/)).toBeInTheDocument();
  });

  it("renderiza la descripcion especifica por tool", () => {
    const { rerender } = render(<MapToolFeedback tool="draw" onClose={() => {}} />);
    expect(screen.getByText(/Anotaciones temporales/)).toBeInTheDocument();

    rerender(<MapToolFeedback tool="markers" onClose={() => {}} />);
    expect(screen.getByText(/Guarda la vista actual/)).toBeInTheDocument();
  });

  it("role=status + aria-live=polite para accesibilidad", () => {
    render(<MapToolFeedback tool="select" onClose={() => {}} />);
    const region = screen.getByRole("status");
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("auto-dismiss a los 6s llama onClose", () => {
    const onClose = vi.fn();
    render(<MapToolFeedback tool="measure" onClose={onClose} />);

    // Antes de los 6s, no llama.
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onClose).not.toHaveBeenCalled();

    // A los 6s, llama.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("el boton X (aria-label=Cerrar) llama onClose", () => {
    const onClose = vi.fn();
    render(<MapToolFeedback tool="measure" onClose={onClose} />);
    screen.getByRole("button", { name: "Cerrar" }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
