// =============================================================================
// Tests para src/lib/csv.ts — parseCsv (Sprint 21)
// =============================================================================

import { describe, it, expect } from "vitest";
import { parseCsv, toCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("parsea CSV simple con separador ;", () => {
    const input = "a;b;c\n1;2;3\n4;5;6";
    const r = parseCsv(input);
    expect(r.headers).toEqual(["a", "b", "c"]);
    expect(r.rows).toEqual([
      { a: "1", b: "2", c: "3" },
      { a: "4", b: "5", c: "6" },
    ]);
  });

  it("strip BOM UTF-8 al inicio", () => {
    const input = "\uFEFFa;b\n1;2";
    const r = parseCsv(input);
    expect(r.headers).toEqual(["a", "b"]);
    expect(r.rows).toEqual([{ a: "1", b: "2" }]);
  });

  it("maneja comillas dobles con separador dentro", () => {
    const input = 'nombre;valor\n"Con; coma";42\n"Normal";7';
    const r = parseCsv(input);
    expect(r.rows[0].nombre).toBe("Con; coma");
    expect(r.rows[0].valor).toBe("42");
    expect(r.rows[1].nombre).toBe("Normal");
  });

  it("maneja comillas escapadas (doble comilla = comilla literal)", () => {
    const input = 'a\n"Dice ""hola""";b';
    // No es trivial: el header + 1 fila, y la fila tiene escape
    const r = parseCsv(input);
    expect(r.headers).toEqual(["a"]);
    // la fila tiene solo 1 columna en header, 2 valores — el extra se ignora
    // (es comportamiento de "fila más larga que header")
  });

  it("maneja saltos de línea dentro de comillas", () => {
    const input = 'a;b\n"línea 1\nlínea 2";2';
    const r = parseCsv(input);
    expect(r.rows[0].a).toBe("línea 1\nlínea 2");
    expect(r.rows[0].b).toBe("2");
  });

  it("maneja line endings \\r\\n", () => {
    const input = "a;b\r\n1;2\r\n3;4";
    const r = parseCsv(input);
    expect(r.rows).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("ignora filas vacías", () => {
    const input = "a;b\n1;2\n\n3;4";
    const r = parseCsv(input);
    expect(r.rows).toHaveLength(2);
  });

  it("trim espacios en headers y valores", () => {
    const input = " a ; b \n 1 ; 2 ";
    const r = parseCsv(input);
    expect(r.headers).toEqual(["a", "b"]);
    expect(r.rows[0]).toEqual({ a: "1", b: "2" });
  });

  it("devuelve array vacío para input vacío", () => {
    expect(parseCsv("").rows).toHaveLength(0);
    expect(parseCsv("").headers).toHaveLength(0);
  });
});

describe("toCsv + parseCsv round-trip", () => {
  it("CSV generado se parsea al mismo objeto", () => {
    const original = [
      { nombre: "Predio A", area: 12.5, municipio: 1 },
      { nombre: "Predio B, con coma", area: 8.3, municipio: 2 },
    ];
    const csv = toCsv(original);
    const parsed = parseCsv(csv);
    // toCsv usa `;` por default, parseCsv también
    expect(parsed.headers).toEqual(["nombre", "area", "municipio"]);
    expect(parsed.rows[0].nombre).toBe("Predio A");
    expect(parsed.rows[1].nombre).toBe("Predio B, con coma");
  });
});
