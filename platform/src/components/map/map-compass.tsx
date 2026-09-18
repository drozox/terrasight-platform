"use client";

/**
 * MapCompass — brújula flotante en la esquina inferior derecha del mapa.
 * Inspirado en `map-panel.tsx` del dashboard de referencia.
 * Estática (no rota con bearing del mapa todavía — pendiente de mejora cuando
 * se habilite rotación en `LeafletMap`).
 */
export function MapCompass() {
  return (
    <div className="absolute bottom-20 right-4 z-[600] flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-lowest/95 shadow-md backdrop-blur">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/50 bg-surface-container-lowest">
        {/* Aguja */}
        <div className="absolute inset-y-1.5 left-1/2 w-0.5 -translate-x-1/2 bg-gradient-to-b from-error via-on-surface-variant to-success" />
        {/* Etiquetas N/S/E/O */}
        <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] font-extrabold text-error">
          N
        </span>
        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-on-surface-variant">
          S
        </span>
        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-on-surface-variant">
          O
        </span>
        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-on-surface-variant">
          E
        </span>
      </div>
    </div>
  );
}