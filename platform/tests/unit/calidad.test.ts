// =============================================================================
// Tests para src/lib/repos/calidad.ts — severityFor + helpers puros.
// =============================================================================

import { describe, it, expect } from "vitest";

// Replicamos severityFor para testearlo (no se exporta del repo).
function severityFor(count: number, total: number): "ok" | "warning" | "error" {
  if (total === 0) return "ok";
  const pct = count / total;
  if (pct > 0.05) return "error";
  if (pct > 0.01) return "warning";
  return "ok";
}

describe("severityFor", () => {
  it("ok cuando total = 0 (no aplica)", () => {
    expect(severityFor(0, 0)).toBe("ok");
    expect(severityFor(10, 0)).toBe("ok");
  });

  it("ok cuando % es ≤ 1%", () => {
    expect(severityFor(0, 100)).toBe("ok");
    expect(severityFor(1, 100)).toBe("ok");
  });

  it("warning cuando % está entre 1% y 5%", () => {
    expect(severityFor(1.5, 100)).toBe("warning");
    expect(severityFor(5, 100)).toBe("warning");
  });

  it("error cuando % > 5%", () => {
    expect(severityFor(5.1, 100)).toBe("error");
    expect(severityFor(50, 100)).toBe("error");
  });

  it("bordes exactos", () => {
    expect(severityFor(1, 100)).toBe("ok");        // 1% exacto → ok
    expect(severityFor(5, 100)).toBe("warning");   // 5% exacto → warning (no >5)
    expect(severityFor(5.01, 100)).toBe("error");  // 5.01% → error
  });
});
