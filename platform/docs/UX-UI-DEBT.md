# Deuda UX/UI — SIG TERRITORIO

Pendientes identificados en la revisión de UX/UI. No bloquean el entregable;
se abordan en fases de pulido.

| # | Tema | Detalle | Impacto | Prioridad |
|---|------|---------|---------|-----------|
| UX-D1 | **Logo pesado** | `public/logos/sig-territorio.png` pesa ~878 KB. Convertir a SVG/WebP (<20 KB) con `width/height` explícitos (evita CLS) y `loading="lazy"`. | Medio (performance) | Alta |
| UX-D2 | **Escala tipográfica** | Uso extensivo de `text-[10px]` / `text-[11px]` ad-hoc. Definir escala en tokens (`text-caption`, `text-body-sm`) y aplicarla. | Medio (consistencia/legibilidad) | Alta |
| UX-D3 | **Contraste de textos pequeños** | `text-on-surface-variant` a 10–11 px puede no cumplir AA. Subir tamaño o oscurecer el token. | Medio (accesibilidad) | Alta |
| UX-D4 | **Accesibilidad del mapa** | Controles Leaflet, popups y herramientas no son operables por teclado ni tienen `aria-label`. | Alto (accesibilidad) | Media |
| UX-D5 | **Estados vacíos** | Varias secciones (tablas, donuts, top municipios) quedan en blanco sin datos. Añadir mensaje/ilustración. | Bajo (percepción) | Media |
| UX-D6 | **Ruta `/dashboard`** | `login/page.tsx` redirige por defecto a `/dashboard`; verificar que la ruta exista (el home es `/`). | Alto si falla | Alta |
| UX-D7 | **Iconos mixtos** | SVG propios + `lucide-react` con grosores distintos. Unificar a una sola familia. | Bajo (consistencia) | Baja |
| UX-D8 | **Formato de números** | `toLocaleString("es-CO")` no se aplica en todos los textos. Centralizar en `formatInt/formatHa/formatKm`. | Bajo | Media |
| UX-D9 | **Performance GIS** | Capas pesadas (drenajes ~11 MB) en GeoJSON. Evaluar MVT / `ST_Simplify` para que el zoom sea fluido. | Alto (performance) | Media |

## Notas de metodología (ya documentado en la UI)
- Semáforo de metas: **≥100%** cumplida · **50–99%** en curso · **<50%** atrasada
  (`src/lib/estado-indicador.ts`).
- KPIs del `SummaryBar` son complementarios a los del panel derecho (sin duplicar).
