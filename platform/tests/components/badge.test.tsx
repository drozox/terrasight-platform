// =============================================================================
// Tests para Badge (cva variants).
//
// Verifica que el variant agrega la clase de color correspondiente y que
// className extra se concatena correctamente.
// =============================================================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("<Badge>", () => {
  it("variant=success → clase text-success", () => {
    render(<Badge variant="success">OK</Badge>);
    const badge = screen.getByText("OK");
    expect(badge.className).toContain("text-success");
  });

  it("variant=warning → clase text-warning", () => {
    render(<Badge variant="warning">Alerta</Badge>);
    const badge = screen.getByText("Alerta");
    expect(badge.className).toContain("text-warning");
  });

  it("variant=error → clase text-error", () => {
    render(<Badge variant="error">Error</Badge>);
    const badge = screen.getByText("Error");
    expect(badge.className).toContain("text-error");
  });

  it("variant=info → clase text-info", () => {
    render(<Badge variant="info">Info</Badge>);
    const badge = screen.getByText("Info");
    expect(badge.className).toContain("text-info");
  });

  it("sin variant (default) → clase text-primary (defaultVariants)", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge.className).toContain("text-primary");
  });

  it("className extra se concatena al variant", () => {
    render(
      <Badge variant="success" className="extra-class">
        OK
      </Badge>,
    );
    const badge = screen.getByText("OK");
    expect(badge.className).toContain("text-success");
    expect(badge.className).toContain("extra-class");
  });

  it("variant=outline → clase de borde (no text-{color})", () => {
    render(<Badge variant="outline">Outline</Badge>);
    const badge = screen.getByText("Outline");
    expect(badge.className).toContain("border");
  });
});
