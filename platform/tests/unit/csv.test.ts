// =============================================================================
// Tests para toCsv y slugFilename — CSV RFC-4180 con separador ;, BOM opcional.
// =============================================================================

import { describe, it, expect } from "vitest";
import { toCsv, slugFilename } from "@/lib/csv";

describe("toCsv — filas vacias y headers", () => {
  it("rows vacios con columns explícitas → solo header (sin trailing lineEnding)", () => {
    const out = toCsv(
      [] as Array<Record<string, string | number>>,
      [{ key: "col1", header: "col1" }, { key: "col2", header: "col2" }],
      { bom: false, lineEnding: "\r\n" },
    );
    // lines = ["col1;col2"]; .join("\r\n") con 1 item NO agrega trailing
    expect(out).toBe("col1;col2");
  });

  it("rows vacios con columns explícitas y BOM ON → empieza con \\uFEFF", () => {
    const out = toCsv(
      [] as Array<Record<string, string | number>>,
      [{ key: "a", header: "A" }, { key: "b", header: "B" }],
      { lineEnding: "\r\n" },
    );
    expect(out).toBe("\uFEFFA;B");
  });

  it("rows vacios sin columns → string vacio (con BOM si bom:true)", () => {
    const out = toCsv([], undefined, { bom: true });
    expect(out).toBe("\uFEFF");
  });

  it("rows vacios sin columns y bom:false → string vacio", () => {
    const out = toCsv([], undefined, { bom: false });
    expect(out).toBe("");
  });
});

describe("toCsv — derivacion automatica de columns desde rows[0]", () => {
  it("sin columns explícitas, usa las keys del primer row", () => {
    const out = toCsv(
      [{ a: 1, b: 2 }],
      undefined,
      { bom: false, lineEnding: "\r\n" },
    );
    // lines = ["a;b", "1;2"]; .join("\r\n") sin trailing separator
    expect(out).toBe("a;b\r\n1;2");
  });

  it("segunda columna vacia cuando la key no está en la fila", () => {
    const out = toCsv(
      [{ a: 1 }] as Array<Record<string, string | number>>,
      [{ key: "a", header: "A" }, { key: "b", header: "B" }],
      { bom: false, lineEnding: "\r\n" },
    );
    expect(out).toBe("A;B\r\n1;");
  });
});

describe("toCsv — quoting RFC 4180 (comportamiento real)", () => {
  // P3-11.b: la implementación quota cuando el valor contiene el
  // separator, una coma (`,`), una '"' o un salto de línea. Antes
  // una coma suelta NO disparaba quoting con separator ';' — ahora sí,
  // para prolijidad (si el archivo se re-exporta con separator ',').

  it("número negativo nativo (-5) NO se quota (es number, no string)", () => {
    // P3-11.b: verificar que el nuevo check de coma no afecta a los
    // numbers nativos (que pasan por String(value) pero NO por
    // neutralizeFormula, y NO contienen una coma literal).
    const out = toCsv(
      [{ a: -5 }],
      [{ key: "a", header: "a" }],
      { bom: false, lineEnding: "\r\n" },
    );
    expect(out).toBe("a\r\n-5");
  });

  it("valor con el MISMO separator (;) → envuelve en quotes", () => {
    const out = toCsv(
      [{ a: "x;y" }],
      [{ key: "a", header: "a" }],
      { bom: false, lineEnding: "\r\n" },
    );
    expect(out).toBe('a\r\n"x;y"');
  });

  it("valor con solo coma → se quota (P3-11.b: prolijidad para Excel en español)", () => {
    const out = toCsv(
      [{ a: "x,y" }],
      [{ key: "a", header: "a" }],
      { bom: false, lineEnding: "\r\n" },
    );
    expect(out).toBe('a\r\n"x,y"');
  });

  it("valor con comilla doble → duplica la comilla interna y envuelve", () => {
    const out = toCsv(
      [{ a: 'z"q' }],
      [{ key: "a", header: "a" }],
      { bom: false, lineEnding: "\r\n" },
    );
    expect(out).toBe('a\r\n"z""q"');
  });

  it("valor con separator + comilla → quoting + escape completo", () => {
    const out = toCsv(
      [{ a: "x;y", b: 'z"q' }],
      [{ key: "a", header: "a" }, { key: "b", header: "b" }],
      { bom: false, lineEnding: "\r\n" },
    );
    expect(out).toBe('a;b\r\n"x;y";"z""q"');
  });

  it("valor con coma + comilla → ambos disparan quoting", () => {
    const out = toCsv(
      [{ a: "x,y", b: 'z"q' }],
      [{ key: "a", header: "a" }, { key: "b", header: "b" }],
      { bom: false, lineEnding: "\r\n" },
    );
    expect(out).toBe('a;b\r\n"x,y";"z""q"');
  });

  it("valor con salto de linea → envuelve en quotes", () => {
    const out = toCsv(
      [{ a: "line1\nline2" }],
      [{ key: "a", header: "a" }],
      { bom: false, lineEnding: "\r\n" },
    );
    expect(out).toBe('a\r\n"line1\nline2"');
  });

  it("valor con \\r\\n → envuelve en quotes (sin romper el CRLF del lineEnding)", () => {
    const out = toCsv(
      [{ a: "a\r\nb" }],
      [{ key: "a", header: "a" }],
      { bom: false, lineEnding: "\r\n" },
    );
    expect(out).toBe('a\r\n"a\r\nb"');
  });

  it("con separator custom (',') → la coma sí dispara quoting", () => {
    const out = toCsv(
      [{ a: "x,y" }],
      [{ key: "a", header: "a" }],
      { bom: false, separator: ",", lineEnding: "\r\n" },
    );
    expect(out).toBe('a\r\n"x,y"');
  });
});

describe("toCsv — separador y lineEnding configurables", () => {
  it("separator custom (coma) en lugar de ;", () => {
    const out = toCsv(
      [{ a: 1, b: 2 }],
      undefined,
      { bom: false, separator: ",", lineEnding: "\n" },
    );
    expect(out).toBe("a,b\n1,2");
  });

  it("lineEnding \\n por defecto (no se rompe con BOM)", () => {
    const out = toCsv([{ a: 1 }], undefined, { bom: true });
    // BOM + header + \n + data (sin trailing)
    expect(out).toBe("\uFEFFa\n1");
  });
});

describe("toCsv — valores null/undefined/number/boolean", () => {
  it("null y undefined → string vacio (sin quoting)", () => {
    const out = toCsv(
      [{ a: null, b: undefined }],
      [{ key: "a", header: "a" }, { key: "b", header: "b" }],
      { bom: false, lineEnding: "\r\n" },
    );
    expect(out).toBe("a;b\r\n;");
  });

  it("number y boolean → stringificados sin quoting", () => {
    const out = toCsv(
      [{ a: 42, b: true }],
      [{ key: "a", header: "a" }, { key: "b", header: "b" }],
      { bom: false, lineEnding: "\r\n" },
    );
    expect(out).toBe("a;b\r\n42;true");
  });
});

describe("toCsv — multiples filas", () => {
  it("2 filas + header", () => {
    const out = toCsv(
      [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ],
      undefined,
      { bom: false, lineEnding: "\r\n" },
    );
    expect(out).toBe("a;b\r\n1;2\r\n3;4");
  });
});

describe("toCsv — mitigación de inyección de fórmulas (P3-11)", () => {
  it.each(["=1+1", "+SUM(A1)", "-2+3", "@cmd", "\tfoo", "\rbar"])(
    "neutraliza celda que empieza con %j anteponiendo apóstrofo",
    (payload) => {
      const out = toCsv(
        [{ a: payload }],
        [{ key: "a", header: "a" }],
        { bom: false, lineEnding: "\r\n" },
      );
      expect(out).toContain("'");
    },
  );

  it("el ejemplo '=1+1' sale como texto '=1+1 (no como fórmula)", () => {
    const out = toCsv(
      [{ a: "=1+1" }],
      [{ key: "a", header: "a" }],
      { bom: false, lineEnding: "\r\n" },
    );
    expect(out).toBe("a\r\n'=1+1");
  });

  it("texto normal NO se altera", () => {
    const out = toCsv(
      [{ a: "hola mundo" }],
      [{ key: "a", header: "a" }],
      { bom: false, lineEnding: "\r\n" },
    );
    expect(out).toBe("a\r\nhola mundo");
  });

  it("número negativo nativo NO se prefija (no es string)", () => {
    const out = toCsv(
      [{ a: -5 }],
      [{ key: "a", header: "a" }],
      { bom: false, lineEnding: "\r\n" },
    );
    expect(out).toBe("a\r\n-5");
  });
});

describe("slugFilename", () => {
  it('genera formato "<slug>-YYYY-MM-DD.<ext>"', () => {
    const out = slugFilename("Reporte R1", "csv");
    expect(out).toMatch(/^reporte-r1-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("lowercase + guiones en lugar de espacios", () => {
    const out = slugFilename("Mi Reporte Semanal", "pdf");
    // No asumimos exactamente la fecha: verificamos solo el slug inicial.
    expect(out.startsWith("mi-reporte-semanal-")).toBe(true);
    expect(out.endsWith(".pdf")).toBe(true);
  });

  it("caracteres especiales y acentos: lowercase + sin acentos", () => {
    const out = slugFilename("Café & Té", "csv");
    // NFD + strip combining + non-alnum → "-"
    expect(out.startsWith("cafe-te-")).toBe(true);
  });

  it("colapsa guiones repetidos y recorta al inicio/fin", () => {
    const out = slugFilename("  Hola   Mundo  ", "txt");
    // "  hola   mundo  " → "hola-mundo" (sin guiones al inicio/fin, sin duplicados)
    expect(out.startsWith("hola-mundo-")).toBe(true);
  });

  it("simbolos → guion (no se escapan, se reemplazan)", () => {
    const out = slugFilename("Año/2026!", "json");
    // "año/2026!" → nfd-strip → "ano/2026!" → "ano-2026-"
    expect(out.startsWith("ano-2026-")).toBe(true);
    expect(out.endsWith(".json")).toBe(true);
  });
});
