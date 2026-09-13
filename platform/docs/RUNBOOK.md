# RUNBOOK — Operación de SIG TERRITORIO

> Guía operativa para el día-a-día del proyecto. Si algo se rompe o se quiere
> cambiar, este es el primer documento a consultar. **Sin secretos.**
>
> Fuente de verdad por sección:
> - **Deploy / rollback / Vercel** → [`DEPLOY.md`](../DEPLOY.md)
> - **Migraciones / DB** → [`DEPLOY.md`](../DEPLOY.md) §1.4
> - **Re-import GDB** → [`DEPLOY.md`](../DEPLOY.md) §1.5.b y [`AGENTS.md`](../AGENTS.md)
> - **Rotar secretos** → [`REVIEW-GUIDE.md`](./REVIEW-GUIDE.md)
> - **Coordinación multiagente** → [`DEEPSEEK-COORDINATION.md`](./DEEPSEEK-COORDINATION.md)

---

## 1. Deploy

**Proveedor:** Vercel (frontend) + Supabase (Postgres/PostGIS).

### 1.1. Primer deploy (cuenta nueva)
Ver [`DEPLOY.md`](../DEPLOY.md) §1-2 (TL;DR automatizado y paso a paso manual).
Tiempo estimado: 10-15 min.

### 1.2. Deploys siguientes
Push a `main` → Vercel auto-deploya. Verificar en el dashboard que el build
queda verde y la URL pública responde 200.

### 1.3. Variables de entorno (Vercel)
Las 4 críticas:
- `DATABASE_URL` (pooler 6543)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `AUTH_TRUST_HOST=true`

> **PRO TIP**: marcadas para Production + Preview + Development. Si una PR
> falla por env, revisar esto primero.

---

## 2. Release gate (pre-merge)

Comando local:
```bash
npm run release:gate
```

Equivale a: typecheck + lint + unit + integration + (opcional) e2e.

Para incluir e2e (más lento, recomendado en CI):
```bash
RUN_E2E=1 npm run release:gate
```

> **Regla**: T0 (DeepSeek) corre el gate completo al integrar un lote paralelo.
> Cada T1 corre solo `npx tsc --noEmit` + su test puntual.

---

## 3. Rotar secretos

**Cuándo**: ante sospecha de exposición (commits a remote público, leak en
logs, etc.) o cada 90 días como política.

### 3.1. Password de Supabase
**Acción del owner** (no automatizable desde código):
1. Dashboard de Supabase → Settings → Database → Reset password.
2. Actualizar `.env.local` con el nuevo valor.
3. Actualizar las env vars en Vercel (Production + Preview + Development).
4. Re-deploy.
5. (Opcional) Documentar fecha de rotación en [`REVIEW-GUIDE.md`](./REVIEW-GUIDE.md).

### 3.2. `NEXTAUTH_SECRET`
1. Generar uno nuevo: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
2. Reemplazar en Vercel env vars.
3. Re-deploy.

> **Importante**: rotar este secret **invalida todas las sesiones** activas.
> Los usuarios tendrán que volver a login.

### 3.3. PAT de GitHub
**Acción del owner** desde la web de GitHub. Si se rota: actualizar el remote
local con `git remote set-url origin https://[NEW_PAT]@github.com/...`.

> Nunca committear PATs. Nunca imprimirlos en logs. Si se ven en chat/commit,
> rotar inmediatamente.

---

## 4. Cron anti-pausa Supabase

El free tier de Supabase pausa el proyecto tras 1 semana de inactividad.
El cliente CAR no entra todos los días → riesgo de pausa.

**Solución**: cron que haga `GET /api/health` cada ~25 días.

- **Endpoint**: `/api/health` (público, devuelve `{ ok: true, db: "up" }`).
- **Frecuencia recomendada**: cada 25 días.
- **Proveedor sugerido**: Vercel Cron (free tier incluye 2 crons).
- **Config**: ver [`DEPLOY.md`](../DEPLOY.md) §5 (Limitaciones del free tier).

> **Manual**: si la BD ya se pausó, hay que reactivarla desde el dashboard
> de Supabase (un click) — no es automatizable.

---

## 5. Backup / re-import GDB

### 5.1. Backup de la BD
Supabase free tier NO incluye backups automáticos. El backup es responsabilidad
del owner: usar `pg_dump` con la connection string directa (puerto 5432).

**Manual** (no automatizado en este proyecto):
```bash
# Setear el DATABASE_URL (Direct connection, puerto 5432, no el pooler)
pg_dump --no-owner --no-acl -Fc -f backup.dump "$DATABASE_URL"
```

### 5.2. Re-import GDB (Phase 6 / 7)
**Solo si la BD se borra o se quiere re-poblar desde el GDB del cliente.**

Pipeline completo: [`DEPLOY.md`](../DEPLOY.md) §1.5.b.

Resumen:
1. `node scripts/migrate.mjs --no-seed` (aplica las 37 migraciones).
2. `py C:\dev\scratch\extract_phase6_tables.py` (genera los CSV/GeoJSON).
3. `node scripts/import_phase6_lookups.mjs` (cobertura, RFP, POMCA).
4. `node scripts/import_phase6.mjs` (5 junction + 5 indicator).
5. `node scripts/import_propuesta.mjs` (las 1,381 propuestas).
6. `node scripts/audit_resultados.mjs` (verificación 10/10 PASS).

> **Tiempo estimado**: 30-60 min para el pipeline completo desde cero.
>
> **Riesgo**: si los CSV del GDB cambiaron (nuevas versiones del cliente),
> hay que regenerarlos. Contacto: dev (single contributor) o cliente.

---

## 6. Rollback

### 6.1. Rollback de código (Vercel)
1. Vercel dashboard → Deployments.
2. Click en el deployment anterior al que queremos volver.
3. **Promote to Production** (3 puntos → Promote).

> Vercel mantiene historial completo de deploys; cualquier versión previa
> puede volver a producción en 1 click.

### 6.2. Rollback de código (git)
Si el bug se introdujo en un commit específico:
```bash
git revert <commit-hash>   # genera un commit que deshace los cambios
git push origin main        # Vercel auto-deploya el revert
```

### 6.3. Rollback de DB (manual, peligroso)
**No automatizado**. Supabase free tier no tiene "restore from backup". Si la
BD se rompió por una migración:
1. **`git revert` de la migración** (commit de la migración, no de su
   aplicación) → nueva migración que hace el DROP / ALTER inverso.
2. Aplicar con `node scripts/migrate.mjs`.

> **Nunca** borrar archivos `scripts/db/init/NN-*.sql` ya aplicados: el
> script `migrate.mjs` registra los ya aplicados y los skipea, pero perder
> el archivo complica la auditoría.

---

## 7. Monitorización

### 7.1. Health check
- **Endpoint**: `/api/health`
- **Status esperado**: 200 con `{ ok: true, db: "up" }`.
- **Status de error**: 503 con `{ ok: false, db: "down", error: "..." }`.
- **Causas comunes de 503**: BD pausada, migración pendiente, pool
  agotado.

### 7.2. Logs
- **Vercel**: dashboard → Logs (Runtime + Build).
- **Supabase**: dashboard → Logs → Postgres.

### 7.3. Tests de regresión
Antes de tocar código de un módulo crítico (auth, DB, workflow):
1. `npx tsc --noEmit`
2. `npx vitest run tests/unit`
3. `npx vitest run tests/integration` (requiere DATABASE_URL)
4. (opcional, CI) `npm run test:e2e`

---

## 8. Smoke post-deploy (manual)

Después de un deploy a producción, el owner debe verificar manualmente:

| Ruta | Esperado |
|---|---|
| `/` | 200, mapa visible, sidebar con links |
| `/login` | 200, form de auth visible |
| `/dashboard` (con sesión) | 200, KPIs visibles |
| `/mapa` (con sesión) | 200, Leaflet carga tiles OSM |
| `/metas/convenio` (con sesión) | 200, 10 indicadores visibles |
| `/api/health` | 200 JSON |

Si alguna ruta falla → rollback inmediato (§6.1).

---

## 9. Contactos y ownership

| Área | Owner |
|---|---|
| Código + infra + BD | Dev (single contributor) |
| Producto + UX + cliente | Dev (también PM) |
| Datos del cliente (GDB, KPIs) | Cliente CAR Cundinamarca |
| Deploy + Vercel | Dev |
| Supabase project | Owner de la cuenta de Supabase |
| GitHub repo | Owner del repo `drozox/terrasight-platform` |

---

## 10. Comandos frecuentes (cheat sheet)

```bash
# Build / dev
npm run dev                # dev server (puerto 3000; usar -- -p 3001 si 3000 está ocupado)
npm run build              # build producción
npm run lint               # ESLint
npm run release:gate       # gate completo (typecheck + lint + test + build)
RUN_E2E=1 npm run release:gate   # gate con e2e

# Tests
npm test                   # vitest (unit + integration si hay DATABASE_URL)
npm run test:e2e           # playwright

# DB
npm run db:migrate         # aplica 37 migraciones (idempotente)
npm run db:migrate:dry     # dry-run
npm run db:migrate:no-seed # sin seed demo

# Auditoría
npm run audit:resultados   # reconcilia global == drill-down de metas
node scripts/db-state.mjs  # estado actual de todas las tablas

# Deploy
git push origin main       # auto-deploy a Vercel
```
