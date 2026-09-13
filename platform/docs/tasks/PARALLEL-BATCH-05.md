# PARALLEL BATCH 05 — 2 cards (entregables del cierre)

> **Para MiniMax (T1).** Este lote es corto: son los **documentos entregables**
> del cierre. El grueso del cierre es T0/owner (esquema + deploy).
> Ver [`../PLAN-CIERRE-HOY.md`](../PLAN-CIERRE-HOY.md).

## Batch (2 cards, archivos disjuntos)

| # | Card | Archivo |
|---|------|---------|
| 1 | [T1-doc-modelo-datos.md](./T1-doc-modelo-datos.md) | `platform/docs/MODELO-DATOS.md` (nuevo) |
| 2 | [T1-doc-entregable-objetivos.md](./T1-doc-entregable-objetivos.md) | `platform/docs/ENTREGABLE-OBJETIVOS.md` (nuevo) |

## Reglas
1. Rama propia `t1/<slug>`; commit solo de tu archivo; una card = un commit = reporte §0.6.
2. `npx tsc --noEmit` no aplica (solo docs); verificá que cada tabla/ruta citada exista.
3. No toques código ni otros docs.
4. **Autoverificación**: en el reporte incluí `git log --oneline -1` y el `Test-Path` de tu archivo.

## Zona reservada a T0
`scripts/db/init/3[6-7]-*`, `src/lib/repos/metas-convenio.ts`, `.github/workflows/ci.yml`,
`scripts/ci-migrate.sh`, `src/lib/auth.ts`, `src/lib/auth-guard.ts`, `src/components/layout/sidebar.tsx`.

---

## PROMPT LISTO PARA PEGAR A MINIMAX

```text
Repo: C:\Users\agFab\OneDrive\Documents\GitHub\TG-Nikoll
Ejecutá las 2 cards de platform/docs/tasks/PARALLEL-BATCH-05.md (1 agente por card).

Reglas:
- Rama propia t1/<slug>. Commit SOLO de tu archivo (git add <path>).
- Son docs: verificá que cada tabla/ruta/colmna citada EXISTA en el repo (grep).
- No toques código.
- Reporte §0.6 con: git log --oneline -1 + Test-Path de tu archivo.

Al terminar, avisá a T0.
```
