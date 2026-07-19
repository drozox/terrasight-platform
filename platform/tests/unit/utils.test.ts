// =============================================================================
// Tests para cn / formatInt / formatDecimal / formatHa / formatPct / formatDate.
// =============================================================================

import { describe, it, expect } from "vitest";
import { cn, formatInt, formatDecimal, formatHa, formatPct, formatDate } from "@/lib/utils";

describe("cn (clsx + tailwind-merge)", () => {
  it("concatena multiples clases en un string separado por espacios", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("ignora valores falsy (false, null, undefined)", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("soporta objetos clsx (condicion:className)", () => {
    const out = cn("base", { active: true, disabled: false });
    expect(out).toContain("base");
    expect(out).toContain("active");
    expect(out).not.toContain("disabled");
  });

  it("soporta arrays anidados", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });

  it("tailwind-merge resuelve conflictos (px-2 gana sobre px-4)", () => {
    // tailwind-merge: el último gana para mismas propiedades
    const out = cn("px-2", "px-4");
    expect(out).toBe("px-4");
  });

  it("tailwind-merge no descarta clases no conflictivas", () => {
    const out = cn("text-red-500", "bg-blue-100");
    expect(out).toContain("text-red-500");
    expect(out).toContain("bg-blue-100");
  });
});

describe("formatInt — Intl.NumberFormat es-CO", () => {
  it("1234 → '1.234' (separador de miles es-CO)", () => {
    expect(formatInt(1234)).toBe("1.234");
  });

  it("1234567 → '1.234.567'", () => {
    expect(formatInt(1234567)).toBe("1.234.567");
  });

  it("0 → '0'", () => {
    expect(formatInt(0)).toBe("0");
  });

  it("999 → '999' (sin separador)", () => {
    expect(formatInt(999)).toBe("999");
  });

  it("null → '—' (em dash)", () => {
    expect(formatInt(null)).toBe("—");
  });

  it("undefined → '—'", () => {
    expect(formatInt(undefined)).toBe("—");
  });

  it("NaN → '—'", () => {
    expect(formatInt(NaN)).toBe("—");
  });

  it("redondea: 1.4 → '1', 1.5 → '2'", () => {
    expect(formatInt(1.4)).toBe("1");
    expect(formatInt(1.5)).toBe("2");
  });
});

describe("formatDecimal — Intl.NumberFormat es-CO con N decimales", () => {
  it("1.234567 con 2 decimales → '1,23' (coma decimal es-CO)", () => {
    expect(formatDecimal(1.234567, 2)).toBe("1,23");
  });

  it("1.5 con 2 decimales → '1,50' (rellena con ceros)", () => {
    expect(formatDecimal(1.5, 2)).toBe("1,50");
  });

  it("1.5 con 0 decimales → '2' (redondea)", () => {
    expect(formatDecimal(1.5, 0)).toBe("2");
  });

  it("decimales default (1): 1.234 → '1,2'", () => {
    expect(formatDecimal(1.234)).toBe("1,2");
  });

  it("decimales default (1): 1.05 → '1,1' (redondeo)", () => {
    expect(formatDecimal(1.05)).toBe("1,1");
  });

  it("1234.5 con 1 decimal → '1.234,5' (miles + decimal)", () => {
    expect(formatDecimal(1234.5, 1)).toBe("1.234,5");
  });

  it("null → '—'", () => {
    expect(formatDecimal(null, 2)).toBe("—");
  });

  it("undefined → '—'", () => {
    expect(formatDecimal(undefined, 2)).toBe("—");
  });

  it("NaN → '—'", () => {
    expect(formatDecimal(NaN, 2)).toBe("—");
  });
});

describe("formatHa — formato compacto (>=1000 → 'K')", () => {
  it("1234 → '1,2K' (formato compacto)", () => {
    expect(formatHa(1234)).toBe("1,2K");
  });

  it("999.5 → '999,5' (sin K)", () => {
    expect(formatHa(999.5)).toBe("999,5");
  });

  it("0 → '0,0'", () => {
    expect(formatHa(0)).toBe("0,0");
  });

  it("10000 → '10,0K'", () => {
    expect(formatHa(10000)).toBe("10,0K");
  });

  it("null → '—'", () => {
    expect(formatHa(null)).toBe("—");
  });
});

describe("formatPct — formato porcentaje", () => {
  it("50 con 0 decimales → '50%'", () => {
    expect(formatPct(50)).toBe("50%");
  });

  it("12.345 con 1 decimal → '12,3%'", () => {
    expect(formatPct(12.345, 1)).toBe("12,3%");
  });

  it("null → '—'", () => {
    expect(formatPct(null)).toBe("—");
  });
});

describe("formatDate — Intl.DateTimeFormat es-CO", () => {
  it("Date → string con formato 'DD MMM YYYY' (es-CO)", () => {
    const out = formatDate(new Date("2026-07-19T12:00:00Z"));
    // es-CO produce "19 jul 2026" (Intl usa 'short' month)
    expect(out).toMatch(/19/);
    expect(out).toMatch(/2026/);
    // No validamos el mes exacto porque puede variar entre runtimes (UTC vs local)
    expect(out).not.toBe("—");
  });

  it("string ISO → mismo formato", () => {
    const fromDate = formatDate(new Date("2026-07-19T12:00:00Z"));
    const fromString = formatDate("2026-07-19T12:00:00Z");
    expect(fromString).toBe(fromDate);
  });

  it("null → '—'", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("undefined → '—'", () => {
    expect(formatDate(undefined)).toBe("—");
  });

  it("string invalida → '—'", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });
});
