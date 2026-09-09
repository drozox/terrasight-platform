// =============================================================================
// Tests para src/lib/repos/workflow.ts — state machine + transiciones
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  ESTADOS,
  ESTADO_LABEL,
  ESTADO_COLOR,
  getTransiciones,
  getTransicion,
  type EstadoPropuesta,
  type RolUsuario,
} from "@/lib/repos/workflow";

describe("ESTADOS (6 valores del workflow)", () => {
  it("contiene los 6 estados del workflow", () => {
    expect(ESTADOS).toEqual([
      "BORRADOR",
      "EN_REVISION",
      "APROBADA",
      "EN_EJECUCION",
      "FINALIZADA",
      "RECHAZADA",
    ]);
  });

  it("ESTADO_LABEL tiene label para todos los estados", () => {
    for (const e of ESTADOS) {
      expect(ESTADO_LABEL[e]).toBeTruthy();
      expect(ESTADO_LABEL[e].length).toBeGreaterThan(0);
    }
  });

  it("ESTADO_COLOR tiene color para todos los estados", () => {
    for (const e of ESTADOS) {
      expect(ESTADO_COLOR[e]).toBeTruthy();
    }
  });
});

describe("getTransiciones", () => {
  it("BORRADOR + GESTOR → solo EN_REVISION", () => {
    const t = getTransiciones("BORRADOR", "GESTOR");
    expect(t).toHaveLength(1);
    expect(t[0].to).toBe("EN_REVISION");
  });

  it("BORRADOR + ADMIN/ANALISTA → ninguna (no pueden enviar a revisión)", () => {
    expect(getTransiciones("BORRADOR", "ADMIN")).toHaveLength(0);
    expect(getTransiciones("BORRADOR", "ANALISTA")).toHaveLength(0);
  });

  it("EN_REVISION + ADMIN → APROBADA + RECHAZADA", () => {
    const t = getTransiciones("EN_REVISION", "ADMIN");
    const tos = t.map((x) => x.to).sort();
    expect(tos).toEqual(["APROBADA", "RECHAZADA"]);
  });

  it("EN_REVISION + GESTOR → ninguna (no puede aprobarse a sí mismo)", () => {
    expect(getTransiciones("EN_REVISION", "GESTOR")).toHaveLength(0);
  });

  it("APROBADA + GESTOR → solo EN_EJECUCION", () => {
    const t = getTransiciones("APROBADA", "GESTOR");
    expect(t).toHaveLength(1);
    expect(t[0].to).toBe("EN_EJECUCION");
  });

  it("EN_EJECUCION + GESTOR → FINALIZADA + BORRADOR (re-abrir)", () => {
    const t = getTransiciones("EN_EJECUCION", "GESTOR");
    const tos = t.map((x) => x.to).sort();
    expect(tos).toEqual(["BORRADOR", "FINALIZADA"]);
  });

  it("RECHAZADA + GESTOR → solo BORRADOR (re-abrir)", () => {
    const t = getTransiciones("RECHAZADA", "GESTOR");
    expect(t).toHaveLength(1);
    expect(t[0].to).toBe("BORRADOR");
  });

  it("FINALIZADA → ninguna (estado terminal)", () => {
    expect(getTransiciones("FINALIZADA", "ADMIN")).toHaveLength(0);
    expect(getTransiciones("FINALIZADA", "ANALISTA")).toHaveLength(0);
    expect(getTransiciones("FINALIZADA", "GESTOR")).toHaveLength(0);
  });
});

describe("getTransicion", () => {
  it("devuelve la transición si existe", () => {
    const t = getTransicion("BORRADOR", "EN_REVISION");
    expect(t).toBeDefined();
    expect(t?.roles).toContain("GESTOR");
  });

  it("devuelve undefined si la transición no existe", () => {
    expect(getTransicion("BORRADOR", "FINALIZADA")).toBeUndefined();
    expect(getTransicion("FINALIZADA", "BORRADOR")).toBeUndefined();
  });

  it("RECHAZADA requiere comentario", () => {
    const t = getTransicion("EN_REVISION", "RECHAZADA");
    expect(t?.requiresComment).toBe(true);
  });

  it("APROBADA no requiere comentario", () => {
    const t = getTransicion("EN_REVISION", "APROBADA");
    expect(t?.requiresComment).toBeFalsy();
  });
});

describe("invariantes de la state machine", () => {
  // Cada from debe tener al menos 1 transición saliente
  it("todos los estados no-terminales tienen transiciones salientes", () => {
    const outgoing = new Set<string>();
    for (const e of ESTADOS) {
      for (const r of ["ADMIN", "ANALISTA", "GESTOR"] as RolUsuario[]) {
        for (const t of getTransiciones(e, r)) {
          outgoing.add(e);
        }
      }
    }
    // FINALIZADA es terminal
    expect(outgoing.has("BORRADOR")).toBe(true);
    expect(outgoing.has("EN_REVISION")).toBe(true);
    expect(outgoing.has("APROBADA")).toBe(true);
    expect(outgoing.has("EN_EJECUCION")).toBe(true);
    expect(outgoing.has("RECHAZADA")).toBe(true);
    // FINALIZADA puede no tener (terminal)
  });

  // Toda transición "to" debe ser un estado válido
  it("todas las transiciones llegan a estados válidos", () => {
    for (const e of ESTADOS) {
      for (const r of ["ADMIN", "ANALISTA", "GESTOR"] as RolUsuario[]) {
        for (const t of getTransiciones(e, r)) {
          expect(ESTADOS).toContain(t.to);
        }
      }
    }
  });

  // No debe haber self-loops (transición X → X)
  it("no hay self-loops", () => {
    for (const e of ESTADOS) {
      for (const r of ["ADMIN", "ANALISTA", "GESTOR"] as RolUsuario[]) {
        for (const t of getTransiciones(e, r)) {
          expect(t.from).not.toBe(t.to);
        }
      }
    }
  });
});
