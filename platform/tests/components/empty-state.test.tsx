// =============================================================================
// Tests para EmptyState component.
//
// Patron: render con happy-dom + Testing Library, asserts sobre el DOM
// resultante (texto, role, classes). happy-dom es mas liviano que jsdom
// y suficiente para componentes que no usan APIs del browser.
// =============================================================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Inbox, FileWarning } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

describe("<EmptyState>", () => {
  it("renderiza titulo, descripcion y role=status", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Sin resultados"
        description="No hay datos para mostrar."
      />,
    );
    // role=status le da semantica a screen readers (region live)
    const region = screen.getByRole("status");
    expect(region).toBeInTheDocument();
    expect(region).toHaveTextContent(/Sin resultados/);
    expect(region).toHaveTextContent(/No hay datos para mostrar\./);
  });

  it("renderiza el eyebrow arriba del titulo cuando se pasa", () => {
    render(
      <EmptyState
        icon={Inbox}
        eyebrow="Convenio CAR · WWF"
        title="Sin predios"
        description="Empezá cargando el primero."
      />,
    );
    const region = screen.getByRole("status");
    // El eyebrow tiene estilo uppercase + tracking + fuente-bold — el
    // texto tal cual esta en el DOM.
    expect(region).toHaveTextContent(/Convenio CAR/);
  });

  it("renderiza el icono como decorativo (aria-hidden)", () => {
    const { container } = render(
      <EmptyState
        icon={FileWarning}
        title="Sin alertas"
        description="No hay."
      />,
    );
    // El icono es un SVG de Lucide con aria-hidden. Verificamos que el
    // contenedor tiene aria-hidden en el icono box.
    const iconBox = container.querySelector('[aria-hidden="true"]');
    expect(iconBox).toBeInTheDocument();
  });

  it("renderiza CTA como link cuando se pasa href", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Vacio"
        description="Cargá datos."
        action={{ label: "Crear primero", href: "/nuevo" }}
      />,
    );
    const link = screen.getByRole("link", { name: /Crear primero/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/nuevo");
  });

  it("renderiza CTA como button cuando se pasa onClick sin href", () => {
    const clicks: string[] = [];
    render(
      <EmptyState
        icon={Inbox}
        title="Vacio"
        description="Cargá datos."
        action={{ label: "Refrescar", onClick: () => clicks.push("clicked") }}
      />,
    );
    const btn = screen.getByRole("button", { name: /Refrescar/ });
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(clicks).toEqual(["clicked"]);
  });

  it("NO renderiza CTA si no se pasa action", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Vacio"
        description="No hay accion."
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    // No deberia haber ningun <button> dentro del region role=status.
    const region = screen.getByRole("status");
    expect(region.querySelector("button")).toBeNull();
  });

  it("respeta size y tone via classes CSS (no afecta el DOM semantico)", () => {
    const { container } = render(
      <EmptyState
        icon={Inbox}
        title="Vacio"
        description="Vacio"
        size="sm"
        tone="warning"
      />,
    );
    // tone=warning -> bg-warning/10 text-warning esta en el icono box
    expect(container.innerHTML).toContain("bg-warning/10");
  });
});
