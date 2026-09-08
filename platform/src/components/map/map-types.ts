// =============================================================================
// MapInteraction — discriminated union para herramientas del mapa
//
// Sprint 18 — herramientas SIG. Reemplaza el antiguo `MapToolKey` (union de
// strings) por un type con `kind` + payload. Permite:
//   - type narrowing con `switch (interaction.kind)`
//   - payload tipado por herramienta (los puntos de medición, el centro del buffer, etc.)
//   - añadir nuevas herramientas sin tocar los componentes que no las usan
//
// Cada interaction.kind corresponde a una herramienta del MapTools toolbar.
// "none" es el estado idle (ninguna herramienta activa).
// =============================================================================

/** [lng, lat] — orden GeoJSON/PostGIS. */
export type LngLat = [number, number];

export type MapInteraction =
  | { kind: "none" }
  | { kind: "measure-distance"; points: LngLat[] }
  | { kind: "measure-area"; points: LngLat[] }
  | { kind: "identify"; lastClick: LngLat | null }
  | { kind: "buffer"; center: LngLat | null; distanceMeters: number }
  | { kind: "select-rectangle"; start: LngLat | null; end: LngLat | null };

/** True si la interacción requiere clicks en el mapa. */
export function interactionClicksOnMap(
  interaction: MapInteraction,
): interaction is Extract<MapInteraction, { kind: "measure-distance" | "measure-area" | "identify" | "buffer" | "select-rectangle" }> {
  return interaction.kind !== "none";
}
