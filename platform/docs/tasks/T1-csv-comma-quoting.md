# TAREA: P3-11.b — `csv.ts` debe quotear si el valor tiene coma

```text
TAREA: P3-11.b
TIER: T1
PRIORIDAD: P3
ESTADO: 🟢 listo

OBJETIVO:
  Que `toCsv()` envuelva en comillas cualquier celda de texto que contenga coma,
  aunque el separador sea `;` (prolijidad para Excel en español).

CONTEXTO:
  Hoy `escapeCell()` (src/lib/csv.ts) solo quota si el valor contiene el separador,
  una comilla doble, o un salto de línea. Un texto "x,y" con separador `;` sale sin
  comillas. Ver el TODO histórico en tests/unit/csv.test.ts.

ARCHIVOS (tocar SOLO estos):
  - platform/src/lib/csv.ts
  - platform/tests/unit/csv.test.ts
NO TOCAR:
  - Ningún otro archivo. (El cambio es global a toCsv; es intencional.)

PASOS:
  1) En `escapeCell`, agregá la coma a la condición `needsQuote`:
     `s.includes(",") || s.includes(separator) || s.includes('"') || /[\r\n]/.test(s)`
  2) Actualizá en `tests/unit/csv.test.ts` los tests que hoy afirman que una coma
     NO dispara quoting (busca "comportamiento actual" / "NO se quota"): ahora debe
     quotear. Ej. `"x,y"` con sep `;` → `"x,y"` (con comillas).
  3) Agregá un test que pruebe que un número negativo nativo (-5) NO se quota.

NO HACER:
  - No cambies el separador por defecto (`;`) ni el BOM.
  - No toques la lógica de `neutralizeFormula`.

VALIDACIÓN:
  - cd platform && npm run release:gate
  - Pegá el resumen final (typecheck/lint/test/build).

CRITERIOS DE ACEPTACIÓN:
  AC-01: `toCsv([{a:"x,y"}], …, {separator:";"})` produce `"x,y"` con comillas.
  AC-02: los tests viejos que esperaban lo contrario quedaron actualizados.
  AC-03: `npm run release:gate` → GOAL_COMPLETED = TRUE (local).

ENTREGABLE:
  - Commit `fix(platform): P3-11.b — csv quota celdas con coma`
  - Reporte §0.6
```
