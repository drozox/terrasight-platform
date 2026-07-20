// =============================================================================
// Barrel de compatibilidad — `lib/repository.ts`
//
// Tras el split (refactor-2026-07-19), este archivo es un re-exports puro.
// Los 6 client components que importaban values de `@/lib/repository` ahora
// importan de `@/lib/constants` y `@/lib/types`. Los server components
// importan de `@/lib/repos`. Este barrel se mantiene 1 release para no
// romper imports externos (tests helpers, scripts CLI). Será borrado en
// commit 5 (cleanup final).
// =============================================================================

export * from "./repos";
export * from "./types";
export * from "./constants";
