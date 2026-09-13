# TAREA: DEEPSEEK-29 — RUNBOOK de operación

```text
TAREA: DEEPSEEK-29
TIER: T1
PRIORIDAD: P2
ESTADO: 🟢 listo

OBJETIVO:
  Crear platform/docs/RUNBOOK.md con el "cómo operar" (deploy, secretos, cron,
  release, re-import de datos, rollback). Sin inventar: solo lo que ya existe.

CONTEXTO:
  El DoD pide "operación reproducible". Hoy está disperso en DEPLOY.md /
  DEEPSEEK-COORDINATION.md. Este runbook centraliza el día-a-día.

ARCHIVOS (tocar SOLO estos):
  - platform/docs/RUNBOOK.md   (NUEVO)
NO TOCAR:
  - código ni otros docs.

PASOS (usá comandos/rutas que EXISTAN; verificá con grep/Test-Path):
  1) Secciones mínimas:
     - **Deploy** (Vercel + Supabase) → remite a DEPLOY.md.
     - **Release gate** → `npm run release:gate` (+ `RUN_E2E=1` para e2e).
     - **Rotar secretos** → remite a docs/REVIEW-GUIDE.md; NUNCA imprimir valores.
     - **Cron anti-pausa Supabase** → `GET /api/health` cada ~25 días.
     - **Backup / re-import GDB** → remite a DEPLOY.md §1.5 y AGENTS.md (§ scripts GDB).
     - **Rollback** → Vercel (Promote previous deployment) + `git revert`.
     - **Monitorización** → `/api/health` (200/503), logs de Vercel.
  2) Cada comando debe existir (grep en package.json / scripts). Si un paso no
     está automatizado, decí "manual" y a quién contactar.

NO HACER:
  - No inventes scripts ni URLs.
  - No incluyas secretos ni placeholders que parezcan reales.

VALIDACIÓN:
  - Verificá que cada comando/ruta citada exista.
  - `git grep -n "TODO\|XXX" platform/docs/RUNBOOK.md` no debe quedar (o justificado).

CRITERIOS DE ACEPTACIÓN:
  AC-01: existe platform/docs/RUNBOOK.md con ≥6 secciones.
  AC-02: todo comando citado existe en el repo.
  AC-03: sin secretos.

ENTREGABLE:
  - Commit `docs(ops): DEEPSEEK-29 — RUNBOOK de operacion`
  - Reporte §0.6
```
