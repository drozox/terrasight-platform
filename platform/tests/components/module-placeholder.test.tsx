// =============================================================================
// Tests para ModulePlaceholder — el card de "modulo en construccion" que se
// muestra en /dashboard, /configuracion, etc.
// =============================================================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BarChart3 } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";

describe("<ModulePlaceholder>", () => {
  it("renderiza el titulo y descripcion", () => {
    render(
      <ModulePlaceholder
        title="Dashboard analitico"
        description="Vistas independientes con tablas dinamicas."
        Icon={BarChart3}
      />,
    );
    expect(screen.getByRole("heading", { name: /Dashboard analitico/ })).toBeInTheDocument();
    expect(screen.getByText(/Vistas independientes/)).toBeInTheDocument();
  });

  it("muestra el pill 'Proxima fase · roadmap'", () => {
    render(
      <ModulePlaceholder
        title="Configuracion"
        description="Gestion de usuarios."
        Icon={BarChart3}
      />,
    );
    expect(screen.getByText(/Próxima fase · roadmap/)).toBeInTheDocument();
  });

  it("tiene un CTA 'Pedir esta funcion' con mailto pre-armado", () => {
    render(
      <ModulePlaceholder
        title="X"
        description="Y"
        Icon={BarChart3}
      />,
    );
    const cta = screen.getByRole("link", { name: /Pedir esta función/ });
    expect(cta).toBeInTheDocument();
    const href = cta.getAttribute("href") ?? "";
    expect(href).toContain("mailto:");
    // El subject esta pre-armado con "Solicitar modulo: " — se reemplaza por
    // el nombre del modulo (aqui "X").
    expect(href).toContain("Solicitar%20modulo");
  });

  it("tiene un link 'Volver al dashboard' al home", () => {
    render(
      <ModulePlaceholder
        title="X"
        description="Y"
        Icon={BarChart3}
      />,
    );
    const back = screen.getByRole("link", { name: /Volver al dashboard/ });
    expect(back).toBeInTheDocument();
    expect(back).toHaveAttribute("href", "/");
  });
});
