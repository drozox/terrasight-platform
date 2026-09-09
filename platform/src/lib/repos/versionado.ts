// =============================================================================
// versionado — snapshots de metas del convenio + comparaciones
//
// Sprint 22 (P1 del plan v1.0). Habilita:
//   - crearSnapshotMetas(fechaCorte, descripcion) — captura el cálculo actual
//   - listarSnapshots() — historial
//   - compararSnapshots(idA, idB) — diff con deltas
//   - eliminarSnapshot(id) — solo ADMIN
//
// Los snapshots se guardan como JSONB en sgs_adm_meta_snapshot con UNIQUE
// en fecha_corte (1 snapshot por día). Esto permite comparaciones históricas
// sin tener que recargar la BD con datos viejos.
// =============================================================================

import { sql, pgInt, pgText } from "../db";
import { getMetasConvenio, type IndicadorKey } from "./metas-convenio";

export interface MetaSnapshot {
  id_snapshot: number;
  fecha_corte: string;          // YYYY-MM-DD
  descripcion: string | null;
  snapshot: Record<string, { actual: number; meta: number; pct: number; cumplida: boolean }>;
  usuario: string;
  created_at: string;
}

export interface MetaComparacion {
  id_comparacion: number;
  snapshot_a: MetaSnapshot;
  snapshot_b: MetaSnapshot;
  diff: Array<{
    key: IndicadorKey;
    label: string;
    antes: number;
    despues: number;
    delta: number;
  }>;
  usuario: string;
  created_at: string;
}

/** Crea un snapshot del estado actual de las metas en la fecha dada. */
export async function crearSnapshotMetas(opts: {
  fechaCorte: string;     // YYYY-MM-DD
  descripcion?: string;
  usuario: string;
}): Promise<{ id_snapshot: number; ya_existia: boolean }> {
  // Calcular metas actuales
  const metas = await getMetasConvenio();

  // Verificar si ya existe
  const existing = await sql<Array<{ id_snapshot: number }>>`
    SELECT id_snapshot FROM sgs_adm_meta_snapshot WHERE fecha_corte = ${opts.fechaCorte}::date
  `;
  if (existing.length > 0) {
    return { id_snapshot: pgInt(existing[0].id_snapshot), ya_existia: true };
  }

  // Crear nuevo
  const rows = await sql<Array<{ id_snapshot: number }>>`
    INSERT INTO sgs_adm_meta_snapshot (fecha_corte, descripcion, snapshot, usuario)
    VALUES (${opts.fechaCorte}::date, ${opts.descripcion ?? null}, ${JSON.stringify(metas)}, ${opts.usuario})
    RETURNING id_snapshot
  `;
  return { id_snapshot: pgInt(rows[0].id_snapshot), ya_existia: false };
}

export async function listarSnapshots(limit = 30): Promise<MetaSnapshot[]> {
  const rows = await sql<Array<{
    id_snapshot: number;
    fecha_corte: string;
    descripcion: string | null;
    snapshot: unknown;
    usuario: string;
    created_at: string;
  }>>`
    SELECT id_snapshot, fecha_corte, descripcion, snapshot, usuario, created_at
    FROM sgs_adm_meta_snapshot
    ORDER BY fecha_corte DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id_snapshot: pgInt(r.id_snapshot),
    fecha_corte: r.fecha_corte,
    descripcion: r.descripcion,
    snapshot: r.snapshot as MetaSnapshot["snapshot"],
    usuario: r.usuario,
    created_at: r.created_at,
  }));
}

export async function getSnapshot(id: number): Promise<MetaSnapshot | null> {
  const rows = await sql<Array<{
    id_snapshot: number;
    fecha_corte: string;
    descripcion: string | null;
    snapshot: unknown;
    usuario: string;
    created_at: string;
  }>>`
    SELECT id_snapshot, fecha_corte, descripcion, snapshot, usuario, created_at
    FROM sgs_adm_meta_snapshot
    WHERE id_snapshot = ${id}
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id_snapshot: pgInt(r.id_snapshot),
    fecha_corte: r.fecha_corte,
    descripcion: r.descripcion,
    snapshot: r.snapshot as MetaSnapshot["snapshot"],
    usuario: r.usuario,
    created_at: r.created_at,
  };
}

export async function eliminarSnapshot(id: number): Promise<boolean> {
  const rows = await sql<Array<{ id_snapshot: number }>>`
    DELETE FROM sgs_adm_meta_snapshot WHERE id_snapshot = ${id} RETURNING id_snapshot
  `;
  return rows.length > 0;
}

/** Compara dos snapshots y devuelve los deltas por indicador. */
export async function compararSnapshots(
  idA: number,
  idB: number,
  usuario: string,
): Promise<MetaComparacion | null> {
  const [a, b] = await Promise.all([getSnapshot(idA), getSnapshot(idB)]);
  if (!a || !b) return null;

  const INDICADORES: { key: IndicadorKey; label: string }[] = [
    { key: "cercos_vivos",       label: "C1A1 · Cercos vivos" },
    { key: "alambre",            label: "C1A1 · Alambre" },
    { key: "conectividad",       label: "C1A2 · Conectividad" },
    { key: "silvopastoril",      label: "C1A2 · Silvopastoril" },
    { key: "agroforestal",       label: "C1A2 · Agroforestal" },
    { key: "cosecha",            label: "C2A1 · Cosecha de agua" },
    { key: "compostaje",         label: "C2A1 · Compostaje" },
    { key: "estaciones",         label: "C2A2 · Estaciones" },
    { key: "obras_captacion",    label: "C2A2 · Obras" },
    { key: "predios_c3",         label: "C3 · Predios" },
  ];

  const diff = INDICADORES.map((ind) => {
    const va = a.snapshot[ind.key]?.actual ?? 0;
    const vb = b.snapshot[ind.key]?.actual ?? 0;
    return {
      key: ind.key,
      label: ind.label,
      antes: va,
      despues: vb,
      delta: vb - va,
    };
  });

  // Persistir la comparación
  const rows = await sql<Array<{ id_comparacion: number }>>`
    INSERT INTO sgs_adm_meta_comparacion (id_snapshot_a, id_snapshot_b, diff, usuario)
    VALUES (${idA}, ${idB}, ${JSON.stringify(diff)}, ${usuario})
    RETURNING id_comparacion
  `;

  return {
    id_comparacion: pgInt(rows[0].id_comparacion),
    snapshot_a: a,
    snapshot_b: b,
    diff,
    usuario,
    created_at: new Date().toISOString(),
  };
}
