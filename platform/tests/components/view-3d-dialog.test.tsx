// =============================================================================
// Tests para View3DDialog — el modal "Coming soon" del botón 3D del search bar.
// =============================================================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { View3DDialog } from "@/components/map/view-3d-dialog";

describe("<View3DDialog>", () => {
  it("no renderiza el contenido cuando open=false", () => {
    render(<View3DDialog open={false} onOpenChange={() => {}} />);
    // Cuando open=false, Radix Dialog no monta el portal.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renderiza el titulo y la lista de features cuando open=true", () => {
    render(<View3DDialog open={true} onOpenChange={() => {}} />);
    // role=dialog lo pone Radix.
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/Vista 3D/);
    // Las 5 features que el modal promete.
    expect(dialog).toHaveTextContent(/Modelo de terreno/);
    expect(dialog).toHaveTextContent(/Cobertura forestal/);
    expect(dialog).toHaveTextContent(/Red hidrográfica/);
    expect(dialog).toHaveTextContent(/Comparativa temporal/);
    expect(dialog).toHaveTextContent(/Rotación libre/);
  });

  it("el SVG mockup del territorio tiene el titulo accesible", () => {
    render(<View3DDialog open={true} onOpenChange={() => {}} />);
    // role=img + aria-label en el SVG del mockup.
    const mockup = screen.getByRole("img", { name: /Mockup de la vista 3D/ });
    expect(mockup).toBeInTheDocument();
  });

  it("el CTA de mailto tiene subject pre-armado", () => {
    render(<View3DDialog open={true} onOpenChange={() => {}} />);
    const cta = screen.getByRole("link", { name: /Pedir acceso anticipado/ });
    expect(cta).toBeInTheDocument();
    expect(cta.getAttribute("href")).toContain("mailto:");
    expect(cta.getAttribute("href")).toContain("vista%203D");
  });

  it("llama onOpenChange(false) cuando se clickea Cerrar", async () => {
    const user = userEvent.setup();
    let closedWith: boolean | null = null;
    render(
      <View3DDialog
        open={true}
        onOpenChange={(o) => {
          closedWith = o;
        }}
      />,
    );
    // Hay 2 botones: el icon X (aria-label="Cerrar") y el "Cerrar" del
    // footer (visible text). Usamos el footer button que es el unico con
    // class "outline" (el icon X no tiene variant).
    const allButtons = screen.getAllByRole("button", { name: /Cerrar/ });
    const footerBtn = allButtons.find((b) => b.textContent === "Cerrar")!;
    await user.click(footerBtn);
    expect(closedWith).toBe(false);
  });
});
