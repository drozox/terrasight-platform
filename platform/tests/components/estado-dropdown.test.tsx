// =============================================================================
// Tests para EstadoIntervencionDropdown — cliente (HU-TC-04).
// Cubre: badge estático vs select editable, llamada a la action, confirm()
// cancelado, router.refresh en éxito, alert en error.
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";

// Mocks hoisted: vi.hoisted garantiza que las refs existan antes de los vi.mock
const { mockAction, mockRefresh, mockConfirm, mockAlert } = vi.hoisted(() => ({
  mockAction: vi.fn(),
  mockRefresh: vi.fn(),
  mockConfirm: vi.fn(() => true),
  mockAlert: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

vi.mock("@/app/intervenciones/actions", () => ({
  cambiarEstadoIntervencionAction: mockAction,
}));

import { EstadoIntervencionDropdown } from "@/app/intervenciones/estado-dropdown";

beforeEach(() => {
  mockAction.mockReset();
  mockRefresh.mockReset();
  mockConfirm.mockReset();
  mockAlert.mockReset();
  mockConfirm.mockReturnValue(true);
  // happy-dom expone window.confirm/alert con la firma tipada estándar
  window.confirm = mockConfirm;
  window.alert = mockAlert;
});

afterEach(() => {
  cleanup();
});

describe("EstadoIntervencionDropdown — modo solo-lectura (canEdit=false)", () => {
  it("renderiza badge con el estado y NO renderiza <select>", () => {
    render(
      <EstadoIntervencionDropdown
        idPropuesta={42}
        estado="Pendiente"
        canEdit={false}
      />,
    );
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("snapshot del badge con estado 'En ejecución' tiene la clase warning", () => {
    const { container } = render(
      <EstadoIntervencionDropdown
        idPropuesta={1}
        estado="En ejecución"
        canEdit={false}
      />,
    );
    const badge = container.querySelector("span");
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain("warning");
    // No debe tener la clase primary
    expect(badge?.className).not.toContain("text-primary");
  });

  it("snapshot del badge con estado 'Finalizada' tiene la clase primary", () => {
    const { container } = render(
      <EstadoIntervencionDropdown
        idPropuesta={1}
        estado="Finalizada"
        canEdit={false}
      />,
    );
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("primary");
  });

  it("snapshot del badge con estado 'Pendiente' tiene clase neutral", () => {
    const { container } = render(
      <EstadoIntervencionDropdown
        idPropuesta={1}
        estado="Pendiente"
        canEdit={false}
      />,
    );
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("on-surface-variant");
  });
});

describe("EstadoIntervencionDropdown — modo editable (canEdit=true)", () => {
  it("renderiza <select> con las 3 opciones", () => {
    render(
      <EstadoIntervencionDropdown
        idPropuesta={7}
        estado="Pendiente"
        canEdit={true}
      />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe("SELECT");
    const options = Array.from(select.querySelectorAll("option"));
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.value)).toEqual([
      "Pendiente",
      "En ejecución",
      "Finalizada",
    ]);
  });

  it("el select tiene defaultValue = estado actual", () => {
    render(
      <EstadoIntervencionDropdown
        idPropuesta={7}
        estado="En ejecución"
        canEdit={true}
      />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("En ejecución");
  });

  it("al cambiar el select y confirmar → llama a la action y refresca el router", async () => {
    mockAction.mockResolvedValue({ ok: true, message: "ok" });
    render(
      <EstadoIntervencionDropdown
        idPropuesta={7}
        estado="Pendiente"
        canEdit={true}
      />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "Finalizada" } });

    // El onChange es async — esperamos a que la microtask de la Promise se resuelva
    await vi.waitFor(() => {
      expect(mockAction).toHaveBeenCalledTimes(1);
    });
    const fd = mockAction.mock.calls[0][0] as FormData;
    expect(fd.get("idPropuesta")).toBe("7");
    expect(fd.get("estado")).toBe("Finalizada");
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("si confirm() = false → no llama a la action ni refresca", async () => {
    mockConfirm.mockReturnValue(false);
    render(
      <EstadoIntervencionDropdown
        idPropuesta={7}
        estado="Pendiente"
        canEdit={true}
      />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "Finalizada" } });

    // Esperar a que la promesa del handler (que retorna early) se asiente
    await new Promise((r) => setTimeout(r, 0));

    expect(mockAction).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("si la action retorna ok:false → muestra alert y revierte el select", async () => {
    mockAction.mockResolvedValue({
      ok: false,
      message: "No autorizado",
    });
    render(
      <EstadoIntervencionDropdown
        idPropuesta={7}
        estado="Pendiente"
        canEdit={true}
      />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "Finalizada" } });

    await vi.waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("No autorizado");
    });
    expect(mockRefresh).not.toHaveBeenCalled();
    // El handler hace e.target.value = estado (revierte)
    expect(select.value).toBe("Pendiente");
  });

  it("si el nuevo estado es igual al actual → no llama confirm ni action", async () => {
    render(
      <EstadoIntervencionDropdown
        idPropuesta={7}
        estado="Pendiente"
        canEdit={true}
      />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "Pendiente" } });

    await new Promise((r) => setTimeout(r, 0));

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockAction).not.toHaveBeenCalled();
  });
});
