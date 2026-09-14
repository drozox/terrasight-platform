# TAREA: DEEPSEEK-71 (F4) — Enriquecer la ficha de predio

```text
TAREA: DEEPSEEK-71
TIER: T1
PRIORIDAD: P1
ESTADO: 🟢 listo

OBJETIVO:
  Que /predios/[id] muestre: (a) el polígono del predio en un mapa, (b) las
  intervenciones del predio, (c) los datos ambientales Fase 6.

CONTEXTO:
  Hoy predio-detail.tsx muestra ~9 campos y un aside "Próximas funciones".
  Existen repos: getPredioById, getPrediosGeoJSON (trae el polígono), y en
  fase6.ts: getPredioAnalisisCompleto(id) → { indicador, ambiental, hidrico,
  intervencion, coberturas, biomas, paramos, pomcas, rfps }.
  Para intervenciones del predio: si no existe un repo, agregá
  `listIntervencionesByPredio(id_predio)` en src/lib/repos/propuestas.ts
  (SELECT de sgs_pro_propuesta + acción/componente WHERE id_predio = $1).

ARCHIVOS (tocar SOLO estos + 1 nuevo):
  - platform/src/app/predios/[id]/page.tsx
  - platform/src/app/predios/[id]/predio-detail.tsx
  - platform/src/app/predios/[id]/predio-mapa.tsx   (NUEVO)
  - platform/src/lib/repos/propuestas.ts  (solo si hace falta el repo)
NO TOCAR:
  - mapa-client / geojson / metas-convenio.

PASOS:
  1) `predio-mapa.tsx`: client component con `dynamic(..., {ssr:false})` que
     recibe el Feature GeoJSON del predio y lo pinta con react-leaflet
     (`<GeoJSON>`), centrado en su centroid (use @turf/bbox o promedio simple,
     soportando MultiPolygon).
  2) En la page, cargá `getPredioAnalisisCompleto(id)` y las intervenciones, y
     pasalas a `PredioDetail`.
  3) En `predio-detail.tsx`: mostrá el mapa arriba; sección "Intervenciones del
     predio" (tabla: id, actividad, componente/acción, estado, link a /intervenciones/[id]);
     sección "Ambiental (Fase 6)": coberturas/bioma/páramo/POMCA/RFP + areas.
  4) Quitá el aside "Próximas funciones".

NO HACER:
  - No cambies el formulario de edición ni las acciones.

VALIDACIÓN:
  - cd platform && npx tsc --noEmit && npm run lint
  - npx vitest run tests/components

CRITERIOS DE ACEPTACIÓN:
  AC-01: /predios/[id] muestra el polígono en mapa (o placeholder si no hay geom).
  AC-02: lista las intervenciones del predio con link a su ficha.
  AC-03: muestra al menos cobertura + bioma + páramo/POMCA/RFP.
  AC-04: tsc 0 errors, lint 0 errors.

ENTREGABLE:
  - Commit `feat(predios): DEEPSEEK-71 — ficha con mapa + intervenciones + Fase 6`
  - Reporte §0.6.
```
