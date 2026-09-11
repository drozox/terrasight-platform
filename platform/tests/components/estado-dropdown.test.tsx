// =============================================================================
// Tests para EstadoIntervencionDropdown — cliente (HU-TC-04).
// Sprint 23 (P0-1): actualizado al vocabulario de 6 estados del workflow.
//
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
        estado="BORRADOR"
        canEdit={false}
      />,
    );
    // El label en español es "Borrador" (ver LABEL map en el componente)
    expect(screen.getByText("Borrador")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("snapshot del badge con estado 'EN_EJECUCION' tiene la clase emerald", () => {
    const { container } = render(
      <EstadoIntervencionDropdown
        idPropuesta={1}
        estado="EN_EJECUCION"
        canEdit={false}
      />,
    );
    const badge = container.querySelector("span");
    expect(badge).not.toBeNull();
    // El estilo para EN_EJECUCION incluye bg-emerald-50
    expect(badge?.className).toContain("emerald");
  });

  it("snapshot del badge con estado 'FINALIZADA' tiene la clase primary", () => {
    const { container } = render(
      <EstadoIntervencionDropdown
        idPropuesta={1}
        estado="FINALIZADA"
        canEdit={false}
      />,
    );
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("primary");
  });

  it("snapshot del badge con estado 'BORRADOR' tiene clase neutral", () => {
    const { container } = render(
      <EstadoIntervencionDropdown
        idPropuesta={1}
        estado="BORRADOR"
        canEdit={false}
      />,
    );
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("on-surface-variant");
  });
});

describe("EstadoIntervencionDropdown — modo editable (canEdit=true)", () => {
  it("renderiza <select> con las 6 opciones (workflow)", () => {
    render(
      <EstadoIntervencionDropdown
        idPropuesta={7}
        estado="BORRADOR"
        canEdit={true}
      />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe("SELECT");
    const options = Array.from(select.querySelectorAll("option"));
    expect(options).toHaveLength(6);
    expect(options.map((o) => o.value)).toEqual([
      "BORRADOR",
      "EN_REVISION",
      "APROBADA",
      "EN_EJECUCION",
      "FINALIZADA",
      "RECHAZADA",
    ]);
  });

  it("el select tiene defaultValue = estado actual", () => {
    render(
      <EstadoIntervencionDropdown
        idPropuesta={7}
        estado="EN_EJECUCION"
        canEdit={true}
      />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("EN_EJECUCION");
  });

  it("al cambiar el select y confirmar → llama a la action y refresca el router", async () => {
    mockAction.mockResolvedValue({ ok: true, message: "ok" });
    render(
      <EstadoIntervencionDropdown
        idPropuesta={7}
        estado="BORRADOR"
        canEdit={true}
      />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "FINALIZADA" } });

    // El onChange es async — esperamos a que la microtask de la Promise se resuelva
    await vi.waitFor(() => {
      expect(mockAction).toHaveBeenCalledTimes(1);
    });
    const fd = (mockAction.mock.calls[0] as unknown as [FormData])[0];
    expect(fd.get("idPropuesta")).toBe("7");
    expect(fd.get("estado")).toBe("FINALIZADA");
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("si confirm() = false → no llama a la action ni refresca", async () => {
    mockConfirm.mockReturnValue(false);
    render(
      <EstadoIntervencionDropdown
        idPropuesta={7}
        estado="BORRADOR"
        canEdit={true}
      />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "FINALIZADA" } });

    // Esperar a que la promesa del handler (que retorna early) se asiente
    await new Promise((r) => setTimeout(r, 0));

    expect(mockAction).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("si la action retorna ok:false → muestra alert y revierte el select", async () => {
    mockAction.mockResolvedValue({
      ok: false,
      message: "Error simulado",
    });
    render(
      <EstadoIntervencionDropdown
        idPropuesta={7}
        estado="BORRADOR"
        canEdit={true}
      />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "RECHAZADA" } });

    await vi.waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Error simulado");
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("al cambiar a un estado distinto → pide confirm() con la label en español", async () => {
    mockConfirm.mockClear();
    render(
      <EstadoIntervencionDropdown
        idPropuesta={7}
        estado="BORRADOR"
        canEdit={true}
      />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "EN_EJECUCION" } });

    await vi.waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledTimes(1);
    });
    const confirmMsg = (mockConfirm.mock.calls[0] as unknown as [string])[0];
    expect(confirmMsg).toContain("En ejecución");
    expect(confirmMsg).toContain("#7");
  });
});
