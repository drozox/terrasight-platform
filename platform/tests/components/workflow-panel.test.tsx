// =============================================================================
// Tests para WorkflowPanel — render-only de transiciones por rol.
//
// DEEPSEEK-25: no clickeamos transiciones (eso sería integración); solo
// asserts de visibilidad de los botones según (estado, rol).
//
// Patrón de mock de next/navigation copiado de estado-dropdown.test.tsx.
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const { mockRefresh } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
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

import { WorkflowPanel } from "@/components/workflow/workflow-panel";
import type { HistorialEntry } from "@/lib/repos/workflow-types";

const emptyHistorial: HistorialEntry[] = [];

beforeEach(() => {
  mockRefresh.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("WorkflowPanel — render-only de transiciones por rol", () => {
  it("estado=BORRADOR + rol=GESTOR → botón 'Enviar a revisión' visible", () => {
    render(
      <WorkflowPanel
        idPropuesta={1}
        estadoActual="BORRADOR"
        rol="GESTOR"
        email="gestor@car.gov.co"
        historialInicial={emptyHistorial}
      />,
    );
    expect(screen.getByRole("button", { name: /enviar a revisi[oó]n/i })).toBeInTheDocument();
  });

  it("estado=EN_REVISION + rol=ADMIN → 'Aprobar' y 'Rechazar' visibles", () => {
    render(
      <WorkflowPanel
        idPropuesta={2}
        estadoActual="EN_REVISION"
        rol="ADMIN"
        email="admin@car.gov.co"
        historialInicial={emptyHistorial}
      />,
    );
    expect(screen.getByRole("button", { name: /aprobar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rechazar/i })).toBeInTheDocument();
  });

  it("estado=FINALIZADA + rol=ADMIN → sin botones de transición (mensaje de estado terminal)", () => {
    render(
      <WorkflowPanel
        idPropuesta={3}
        estadoActual="FINALIZADA"
        rol="ADMIN"
        email="admin@car.gov.co"
        historialInicial={emptyHistorial}
      />,
    );
    // Sin botones de transición
    expect(screen.queryByRole("button", { name: /aprobar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rechazar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enviar a revisi[oó]n/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /iniciar ejecuci[oó]n/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /finalizar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reabrir como borrador/i })).not.toBeInTheDocument();
    // Mensaje explícito de "no hay transiciones"
    expect(screen.getByText(/No hay transiciones disponibles/i)).toBeInTheDocument();
    expect(screen.getByText(/Estado terminal/i)).toBeInTheDocument();
  });

  it("estado=BORRADOR + rol=ADMIN → sin botones (ADMIN no puede enviar a revisión)", () => {
    // Solo GESTOR puede transicionar BORRADOR → EN_REVISION
    render(
      <WorkflowPanel
        idPropuesta={4}
        estadoActual="BORRADOR"
        rol="ADMIN"
        email="admin@car.gov.co"
        historialInicial={emptyHistorial}
      />,
    );
    expect(screen.queryByRole("button", { name: /enviar a revisi[oó]n/i })).not.toBeInTheDocument();
    expect(screen.getByText(/No hay transiciones disponibles/i)).toBeInTheDocument();
  });

  it("muestra el badge con el label del estado actual", () => {
    render(
      <WorkflowPanel
        idPropuesta={5}
        estadoActual="APROBADA"
        rol="GESTOR"
        email="gestor@car.gov.co"
        historialInicial={emptyHistorial}
      />,
    );
    // El estado APROBADA tiene label "Aprobada"
    expect(screen.getByText(/Aprobada/)).toBeInTheDocument();
    // GESTOR puede "Iniciar ejecución" desde APROBADA
    expect(screen.getByRole("button", { name: /iniciar ejecuci[oó]n/i })).toBeInTheDocument();
  });
});
