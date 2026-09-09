// =============================================================================
// Tests para src/lib/repos/search.ts — validación de inputs y sanitización.
// El query real se valida E2E (requiere pg_trgm + unaccent extension).
// =============================================================================

import { describe, it, expect } from "vitest";

// Replicamos el escape de LIKE patterns que se usa en searchAll.
function escapeLikePattern(q: string): string {
  return q.replace(/[%_\\]/g, (c) => "\\" + c);
}

describe("escapeLikePattern", () => {
  it("escapa % para que no se vuelva wildcard", () => {
    expect(escapeLikePattern("100%")).toBe("100\\%");
  });

  it("escapa _ para que no se vuelva wildcard de 1 char", () => {
    expect(escapeLikePattern("user_name")).toBe("user\\_name");
  });

  it("escapa backslash", () => {
    expect(escapeLikePattern("path\\to\\file")).toBe("path\\\\to\\\\file");
  });

  it("no toca caracteres normales", () => {
    expect(escapeLikePattern("guatavita")).toBe("guatavita");
    expect(escapeLikePattern("Cerca viva")).toBe("Cerca viva");
  });

  it("maneja tildes sin escapar (unaccent() los normaliza aparte)", () => {
    expect(escapeLikePattern("Sesquilé")).toBe("Sesquilé");
  });
});

describe("validación de q en /api/search", () => {
  function isValidQuery(q: string | null | undefined): boolean {
    if (!q) return false;
    const trimmed = q.trim();
    return trimmed.length >= 2 && trimmed.length <= 100;
  }

  it("rechaza null/undefined/empty", () => {
    expect(isValidQuery(null)).toBe(false);
    expect(isValidQuery(undefined)).toBe(false);
    expect(isValidQuery("")).toBe(false);
    expect(isValidQuery("  ")).toBe(false);
  });

  it("rechaza < 2 chars", () => {
    expect(isValidQuery("a")).toBe(false);
    expect(isValidQuery(" z ")).toBe(false);
  });

  it("acepta 2+ chars hasta 100", () => {
    expect(isValidQuery("gu")).toBe(true);
    expect(isValidQuery("guatavita")).toBe(true);
  });

  it("rechaza > 100 chars", () => {
    expect(isValidQuery("a".repeat(101))).toBe(false);
  });
});
