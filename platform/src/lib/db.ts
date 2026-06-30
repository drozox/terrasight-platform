// =============================================================================
// Adaptador PostgreSQL/PostGIS usando `postgres` (postgres-js).
// Notas:
// - Usamos un único cliente por proceso (singleton) y pool simple.
// - Helpers NUMERIC/DATE para convertir valores que vienen como string desde pg
//   en number/Date utilizables desde el front sin casts manuales.
// - Patrón probado en AeroAdmin AFM (commit 175407e).
// =============================================================================

import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://terrasight:terrasight_dev@localhost:5433/convenio_car_wwf";

declare global {
  // eslint-disable-next-line no-var
  var __terraPg: ReturnType<typeof postgres> | undefined;
}

export const sql = global.__terraPg ?? postgres(connectionString, {
  max: Number(process.env.PGPOOL_MAX ?? 10),
  idle_timeout: 30,
  connect_timeout: 10,
  // Mantener tipos nativos (no forzar bigint a number automáticamente)
  transform: { undefined: null },
});

if (process.env.NODE_ENV !== "production") {
  global.__terraPg = sql;
}

// -----------------------------------------------------------------------------
// Helpers de parseo: NUMERIC y BIGINT vienen de Postgres como string.
// Para evitar `Number(x)` por todo el codebase, centralizamos aquí.
// -----------------------------------------------------------------------------

/** Postgres NUMERIC / DECIMAL → number JS. */
export function pgNum(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** Postgres BIGINT → number JS (precaución >2^53). */
export function pgInt(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** Postgres DATE/TIMESTAMP → Date (puede venir como string ISO). */
export function pgDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Texto seguro. */
export function pgText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}
