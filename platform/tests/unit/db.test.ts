// =============================================================================
// Tests para pgInt / pgNum / pgText / pgDate — helpers de parseo de Postgres
// (NUMERIC, BIGINT, TEXT, DATE suelen llegar como string desde el driver).
// =============================================================================

import { describe, it, expect } from "vitest";
import { pgInt, pgNum, pgText, pgDate } from "@/lib/db";

describe("pgInt", () => {
  it("number → number (passthrough)", () => {
    expect(pgInt(42)).toBe(42);
  });

  it('"42" string → 42', () => {
    expect(pgInt("42")).toBe(42);
  });

  it('"42.7" string → 42.7 (parsea aunque la intención sea integer)', () => {
    expect(pgInt("42.7")).toBe(42.7);
  });

  it('"abc" no numérico → 0 (fallback default)', () => {
    expect(pgInt("abc")).toBe(0);
  });

  it("null → 0 (fallback default)", () => {
    expect(pgInt(null)).toBe(0);
  });

  it("undefined → 0 (fallback default)", () => {
    expect(pgInt(undefined)).toBe(0);
  });

  it("valor presente no usa fallback (42 con fallback 99 → 42)", () => {
    expect(pgInt(42, 99)).toBe(42);
  });

  it('"42" con fallback 99 → 42', () => {
    expect(pgInt("42", 99)).toBe(42);
  });

  it("null con fallback 99 → 99", () => {
    expect(pgInt(null, 99)).toBe(99);
  });

  it("undefined con fallback 99 → 99", () => {
    expect(pgInt(undefined, 99)).toBe(99);
  });

  it('"abc" con fallback 99 → 99', () => {
    expect(pgInt("abc", 99)).toBe(99);
  });

  it("tipo no soportado (boolean) → fallback", () => {
    expect(pgInt(true as unknown as number)).toBe(0);
    expect(pgInt(true as unknown as number, 7)).toBe(7);
  });

  it("objeto → fallback", () => {
    expect(pgInt({} as unknown as number)).toBe(0);
  });

  it("negativo válido → -5", () => {
    expect(pgInt("-5")).toBe(-5);
  });
});

describe("pgNum", () => {
  it("number → number (passthrough)", () => {
    expect(pgNum(1.5)).toBe(1.5);
  });

  it('"3.14" string → 3.14', () => {
    expect(pgNum("3.14")).toBe(3.14);
  });

  it('"abc" → fallback 0', () => {
    expect(pgNum("abc")).toBe(0);
  });

  it("null → fallback 0", () => {
    expect(pgNum(null)).toBe(0);
  });

  it("null con fallback -1 → -1", () => {
    expect(pgNum(null, -1)).toBe(-1);
  });

  it('"0" string → 0', () => {
    expect(pgNum("0")).toBe(0);
  });

  it('"" string vacio → fallback (Number("") es 0 pero…)', () => {
    // Number("") === 0, por lo que pgNum retorna 0 (no el fallback)
    expect(pgNum("")).toBe(0);
  });
});

describe("pgText", () => {
  it('"hola" → "hola"', () => {
    expect(pgText("hola")).toBe("hola");
  });

  it("null → fallback default ''", () => {
    expect(pgText(null)).toBe("");
  });

  it("undefined → fallback default ''", () => {
    expect(pgText(undefined)).toBe("");
  });

  it("null con fallback 'N/A' → 'N/A'", () => {
    expect(pgText(null, "N/A")).toBe("N/A");
  });

  it("number 42 → '42' (stringificado)", () => {
    expect(pgText(42)).toBe("42");
  });

  it("boolean true → 'true' (stringificado)", () => {
    expect(pgText(true)).toBe("true");
  });

  it('string vacio "" → "" (no es fallback, es el valor real)', () => {
    expect(pgText("")).toBe("");
  });
});

describe("pgDate", () => {
  it("Date object → mismo Date", () => {
    const d = new Date("2026-07-19T12:00:00Z");
    const out = pgDate(d);
    expect(out).toBe(d);
  });

  it('string ISO "2026-07-19T12:00:00Z" → Date equivalente', () => {
    const out = pgDate("2026-07-19T12:00:00Z");
    expect(out).toBeInstanceOf(Date);
    expect((out as Date).toISOString()).toBe("2026-07-19T12:00:00.000Z");
  });

  it("null → null", () => {
    expect(pgDate(null)).toBeNull();
  });

  it("undefined → null", () => {
    expect(pgDate(undefined)).toBeNull();
  });

  it("string invalida → null (no Date inválido)", () => {
    expect(pgDate("not-a-date")).toBeNull();
  });

  it("tipo no soportado (number) → null", () => {
    expect(pgDate(123 as unknown as string)).toBeNull();
  });

  it("string fecha corta '2026-07-19' → Date parseable", () => {
    const out = pgDate("2026-07-19");
    expect(out).toBeInstanceOf(Date);
    expect(Number.isNaN((out as Date).getTime())).toBe(false);
  });
});
