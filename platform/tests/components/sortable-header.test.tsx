// =============================================================================
// Tests para SortableHeader (UX-80).
//
// Verifica el href construido (sort + order toggle + preserva searchParams)
// y el atributo aria-sort para accesibilidad.
// =============================================================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SortableHeader } from "@/components/ui/sortable-header";

describe("<SortableHeader>", () => {
  it("campo activo en asc → link toggle a desc con aria-sort=ascending", () => {
    render(
      <SortableHeader
        field="nombre"
        currentSort="nombre"
        currentOrder="asc"
        basePath="/predios"
      >
        Nombre
      </SortableHeader>,
    );
    const link = screen.getByRole("link", { name: /Nombre/ });
    expect(link).toBeInTheDocument();
    // toggle: asc → desc
    expect(link.getAttribute("href")).toContain("sort=nombre");
    expect(link.getAttribute("href")).toContain("order=desc");
    expect(link.getAttribute("aria-sort")).toBe("ascending");
  });

  it("campo activo en desc → link toggle a asc", () => {
    render(
      <SortableHeader
        field="nombre"
        currentSort="nombre"
        currentOrder="desc"
        basePath="/predios"
      >
        Nombre
      </SortableHeader>,
    );
    const link = screen.getByRole("link", { name: /Nombre/ });
    // toggle: desc → asc
    expect(link.getAttribute("href")).toContain("sort=nombre");
    expect(link.getAttribute("href")).toContain("order=asc");
    expect(link.getAttribute("aria-sort")).toBe("descending");
  });

  it("campo NO activo → link propone order=asc con aria-sort=none", () => {
    render(
      <SortableHeader
        field="nombre"
        currentSort="otro"
        currentOrder="asc"
        basePath="/predios"
      >
        Nombre
      </SortableHeader>,
    );
    const link = screen.getByRole("link", { name: /Nombre/ });
    expect(link.getAttribute("href")).toContain("sort=nombre");
    expect(link.getAttribute("href")).toContain("order=asc");
    expect(link.getAttribute("aria-sort")).toBe("none");
  });

  it("preserva searchParams existentes (ej. vereda=V1)", () => {
    render(
      <SortableHeader
        field="nombre"
        currentSort="nombre"
        currentOrder="asc"
        basePath="/predios"
        searchParams={{ vereda: "V1" }}
      >
        Nombre
      </SortableHeader>,
    );
    const link = screen.getByRole("link", { name: /Nombre/ });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain("vereda=V1");
    expect(href).toContain("sort=nombre");
    expect(href).toContain("order=desc");
  });

  it("omite searchParams con valor undefined o vacío", () => {
    render(
      <SortableHeader
        field="nombre"
        currentSort="nombre"
        currentOrder="asc"
        basePath="/predios"
        searchParams={{ vereda: undefined, municipio: "" }}
      >
        Nombre
      </SortableHeader>,
    );
    const link = screen.getByRole("link", { name: /Nombre/ });
    const href = link.getAttribute("href") ?? "";
    expect(href).not.toContain("vereda=");
    expect(href).not.toContain("municipio=");
    expect(href).toContain("sort=nombre");
  });

  it("acepta className extra y se aplica", () => {
    const { container } = render(
      <SortableHeader
        field="nombre"
        currentSort="nombre"
        currentOrder="asc"
        basePath="/predios"
        className="custom-class"
      >
        Nombre
      </SortableHeader>,
    );
    const link = container.querySelector("a");
    expect(link?.className).toContain("custom-class");
  });
});
