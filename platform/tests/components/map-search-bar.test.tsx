// =============================================================================
// Tests para MapSearchBar — input de búsqueda + debounce.
// (Los botones 3D y Marcadores se eliminaron en el acotamiento — ver ALCANCE.md.)
// =============================================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MapSearchBar } from "@/components/map/map-search-bar";

// next/navigation mock
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

describe("<MapSearchBar>", () => {
  it("renderiza el input de búsqueda con placeholder correcto", () => {
    render(<MapSearchBar />);
    const input = screen.getByPlaceholderText(/Buscar municipio/i);
    expect(input).toBeInTheDocument();
  });

  it("NO incluye botones fuera de alcance (3D, Marcadores, Layers)", () => {
    render(<MapSearchBar />);
    expect(
      screen.queryByRole("button", { name: /Ver vista 3D/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Marcadores/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Capas$/i }),
    ).not.toBeInTheDocument();
  });

  it("muestra Loader2 mientras el usuario tipea (debounce UX-29)", async () => {
    render(<MapSearchBar />);
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/Buscar municipio/i);

    await user.type(input, "Ching");
    // Loader2 tiene aria-label="Buscando" durante el debounce
    expect(screen.getByLabelText(/Buscando/i)).toBeInTheDocument();
  });

  it("typing + submit no rompe (el input mantiene su valor)", async () => {
    render(<MapSearchBar initialQuery="" />);
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/Buscar municipio/i);

    await user.type(input, "Chingaza");
    await user.keyboard("{Enter}");

    expect((input as HTMLInputElement).value).toBe("Chingaza");
  });
});
