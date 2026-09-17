"use client";

// =============================================================================
// map-symbology.tsx — simbología del mapa por ACTIVIDAD/GRUPO (INICIO).
//   - Puntos: ícono distinto por actividad (Cosecha, Compostaje, Estación, Obra).
//   - Líneas: color por actividad (Cerco=verde, Aislamiento=marrón, Conectividad=azul).
//   - Polígonos: color por grupo (Silvopastoril / Conectividad / Agroforestal).
// =============================================================================

import L from "leaflet";

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// --- Líneas ---
const LINE_BY_ACTIVIDAD: Array<[RegExp, string]> = [
  [/cerco|cerca viva/i, "#2e7d32"],                    // verde
  [/aislamiento|alambre/i, "#7a4a00"],                 // marrón
  [/conectividad|relictos|franja/i, "#1f6feb"],        // azul
];

export function lineColor(actividad: string): string {
  for (const [re, color] of LINE_BY_ACTIVIDAD) if (re.test(actividad)) return color;
  return "#006d37";
}

// --- Polígonos por grupo ---
const POLY_BY_ACTIVIDAD: Array<[RegExp, string]> = [
  [/arboles dispersos|banco de proteína|banco de proteinas/i, "#2f6388"],   // Silvopastoril (Natura azul)
  [/pastos arbolados|alta densidad|rastrojos/i, "#006d37"],                  // Conectividad (CAR verde oscuro)
  [/bosques comestibles/i, "#27ae60"],                                       // Agroforestal (WWF verde claro)
];

export function polygonColor(actividad: string): string {
  for (const [re, color] of POLY_BY_ACTIVIDAD) if (re.test(actividad)) return color;
  return "#7a4a00";
}

// --- Puntos ---
const EMOJI_BY_ACTIVIDAD: Array<[RegExp, string]> = [
  [/cosecha|agua lluvia/i, "💧"],
  [/compost/i, "♻️"],
  [/estacion|limnimet/i, "📊"],
  [/captacion/i, "🔧"],
  [/bebedero|saladero|panel|percha|tanque/i, "🛠️"],
];

function emojiFor(actividad: string): string {
  for (const [re, emoji] of EMOJI_BY_ACTIVIDAD) if (re.test(actividad)) return emoji;
  return "📍";
}

const iconCache = new Map<string, L.DivIcon>();

export function pointIcon(actividad: string): L.DivIcon {
  const key = normalize(actividad);
  const cached = iconCache.get(key);
  if (cached) return cached;
  const emoji = emojiFor(actividad);
  const icon = L.divIcon({
    html: `<div style="
        display:flex;align-items:center;justify-content:center;
        width:26px;height:26px;border-radius:9999px;
        background:#ffffff;border:2px solid #006d37;
        box-shadow:0 1px 4px rgba(0,0,0,.35);font-size:14px;line-height:1;
      ">${emoji}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    className: "leaflet-svg-marker",
  });
  iconCache.set(key, icon);
  return icon;
}
