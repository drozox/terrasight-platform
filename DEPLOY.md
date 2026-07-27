# Deploy en Vercel + Supabase (free tier)

Guia paso a paso para desplegar TerraSight en produccion con cuentas free.

## TL;DR (automatizado)

```powershell
# 1. Supabase: crear proyecto + copiar pooled connection string
# 2. Local:
$env:DATABASE_URL='postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require'
cd platform
node scripts/migrate.mjs
node scripts/setup-vercel.mjs --alias=terrasight-convenio
# 3. Vercel dashboard: Settings → Domains → Add (alias si el CLI no lo hizo)
# 4. Local:
node scripts/create-admin.mjs --email admin@car.gov.co --nombre "Admin" --password "PassFuerte123!" --rol ADMIN
```

Listo. Tiempo total: 10-15 minutos.

> El script `setup-vercel.mjs` automatiza auth, env vars, deploy y captura del URL real (que antes era 10+ clicks manuales). Si algo falla, fallback al paso a paso manual de abajo.

---

## TL;DR (manual)

1. Crear cuenta + proyecto en **Supabase** (PostGIS 3.5 preinstalado).
2. Aplicar las migraciones SQL via `node scripts/migrate.mjs`.
3. Crear cuenta + proyecto en **Vercel**, linkear al repo `drozox/terrasight-platform`.
4. Setear 4 env vars en Vercel.
5. Deploy automatico.
6. Crear primer admin user.

Tiempo total: 15-20 minutos.

---

## 1. Supabase (BD con PostGIS)

### 1.1. Crear cuenta + proyecto

1. Ir a https://supabase.com/dashboard y crear cuenta (con GitHub es 1 click).
2. **New project**:
   - Name: `terrasight-convenio`
   - Database Password: generar uno fuerte (16+ chars) y **guardarlo en lugar seguro** (1Password / Bitwarden). Lo vas a necesitar para el connection string.
   - Region: **South America (Sao Paulo)** — mas cerca de Colombia, menor latencia.
   - Plan: **Free** (500 MB BD, 2 GB bandwidth/mes).
3. Esperar ~2 min a que el proyecto se aprovisione.

### 1.2. Verificar PostGIS

PostGIS viene **preinstalado** en Supabase free tier. Verificar:

1. Ir a **SQL Editor** en el dashboard.
2. Correr:
   ```sql
   SELECT PostGIS_Version();
   ```
3. Debe devolver `3.5.x USE_GEOS=1 USE_PROJ=1 ...`. Si no, el proyecto esta mal provisionado.

### 1.3. Obtener connection strings

1. Ir a **Settings -> Database**.
2. En **Connection string**, copiar las DOS:
   - **Direct connection** (puerto 5432): para migraciones y admin. Formato: `postgresql://postgres.[ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`
   - **Transaction pooler** (puerto 6543): para runtime de la app. Formato: `postgresql://postgres.[ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`

> **OJO**: el password que pones al crear el proyecto es el que va en la URL. Si lo pierdes, hay que resetear desde el dashboard.

### 1.4. Aplicar las 9 migraciones

Las migraciones viven en `platform/scripts/db/init/`. El script `migrate.mjs` las aplica en orden.

**Desde tu maquina local** (con el repo clonado):

```bash
# 1. Setear el DATABASE_URL (la "Direct connection" de Supabase, puerto 5432)
$env:DATABASE_URL="postgresql://postgres.[ref]qwerty:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# 2. Dry-run para ver que va a hacer
cd platform
node scripts/migrate.mjs --dry-run

# 3. Aplicar de verdad
node scripts/migrate.mjs
```

> Reemplaza `[ref]qwerty` y `[PASSWORD]` con los tuyos. **OJO**: si tu password tiene caracteres especiales (`!`, `#`, `$`, etc.), escapalos o usa comillas. El `postgres-js` los maneja, pero el shell puede confundirse.

**Alternativa via SQL Editor** (si tenes problemas con el script):

1. Ir a **SQL Editor** en Supabase.
2. Abrir cada archivo en orden:
   - `01-schema.sql` -> Run
   - `02-datos-ejemplo.sql` -> Run (opcional, solo si queres seed demo)
   - `03-auth-schema.sql` -> Run
   - `04-intervencion-estado.sql` -> Run
   - `05-catalogos-unique.sql` -> Run
   - `06-propuesta-avance.sql` -> Run
   - `07-monitoreo-punto.sql` -> Run
   - `08-cat-secundarios.sql` -> Run
   - `09-propuesta-avance-es-backfill.sql` -> Run
3. Verificar que no haya errores en ninguno.

### 1.5. Verificar que las migraciones corrieron

En SQL Editor:

```sql
-- 32 tablas
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
-- debe dar 32

-- 10 propuestas demo
SELECT count(*) FROM sgs_pro_propuesta;

-- 10 predios
SELECT count(*) FROM sgs_pre_predio;

-- 6 acciones
SELECT count(*) FROM sgs_com_accion;

-- 5 alertas (DEBT-5)
SELECT count(*) FROM sgs_amb_alerta;
```

> **Nota**: el `02-datos-ejemplo.sql` actual carga **10 propuestas / 10 predios / 7 municipios** (no 151/2458 como en versiones iniciales del doc). La app funciona con este subset para demo; el cliente CAR Cundinamarca carga los datos reales despues del deploy.

---

## 2. Vercel (hosting del Next.js)

### 2.1. Crear cuenta + linkear repo

1. Ir a https://vercel.com y crear cuenta (con GitHub).
2. **Add New -> Project** -> buscar `drozox/terrasight-platform` -> **Import**.

### 2.2. Configurar el proyecto

Vercel auto-detecta que es Next.js. Dejar todo por default excepto:

| Campo | Valor |
|---|---|
| Framework Preset | Next.js |
| Build Command | `next build` (default) |
| Output Directory | `.next` (default) |
| Install Command | `npm ci` (default) |
| Node.js Version | 22.x (Vercel lo detecta del `.nvmrc` o `package.json` engines) |

### 2.3. Environment Variables (CRITICO)

Click en **Environment Variables** y agregar:

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.[ref]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require` | **Transaction pooler** (puerto 6543), con `?sslmode=require`. La usa `postgres-js` en runtime. |
| `NEXTAUTH_SECRET` | Un string random de 32+ chars. **REGENERALO, no uses el del .env local.** | Generar con: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `NEXTAUTH_URL` | `https://terrasight-convenio.vercel.app` (o tu dominio custom si lo tenes) | La URL publica de Vercel. Vercel te la da despues del primer deploy. |
| `AUTH_TRUST_HOST` | `true` | Para que NextAuth confie en el proxy de Vercel. |

> **PRO TIP**: marca las 4 como disponibles para **Production**, **Preview** y **Development**. Asi las PR branches tambien funcionan.

### 2.4. Deploy

1. Click **Deploy**.
2. Vercel hace `npm ci && next build` (tarda 1-3 min la primera vez).
3. Si todo OK, te da la URL publica: `https://terrasight-convenio-[hash].vercel.app`.
4. **Volve a Vercel -> Settings -> Environment Variables** y actualiza `NEXTAUTH_URL` con la URL real (sin el hash de preview).
5. Re-deploy (Deployments -> ... -> Redeploy).

---

## 3. Post-deploy: crear primer admin

Una vez que el deploy esta verde:

**Opcion A: desde tu maquina local** (recomendado)

```bash
cd platform
$env:DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
node scripts/create-admin.mjs --email admin@car.gov.co --nombre "Ana Maria" --password "SecretaFuerte123!" --rol ADMIN
```

**Opcion B: via SQL Editor** (si no podes correr el script)

```sql
-- 1. Generar el hash bcrypt desde Node:
--    node -e "console.log(require('bcryptjs').hashSync('SecretaFuerte123!', 10))"
-- 2. Pegar el hash abajo:

INSERT INTO sgs_adm_usuario (email, password_hash, nombre, id_rol, activo)
SELECT 'admin@car.gov.co', '<HASH_BCRYPT_AQUI>', 'Ana Maria', r.id_rol, TRUE
FROM sgs_adm_rol r WHERE r.nombre = 'ADMIN'
ON CONFLICT (email) DO UPDATE 
  SET password_hash = EXCLUDED.password_hash, 
      actualizado_en = now();
```

---

## 4. Verificacion end-to-end

1. Abrir la URL de Vercel en el browser.
2. Verificar que carga la pagina de login.
3. Loguearse con el admin creado.
4. Ir a **Dashboard** -> deberian verse los KPIs (2.458 predios, 151 propuestas, etc.).
5. Ir a **Mapa** -> deberia renderizar el visor Leaflet con los predios GeoJSON.
6. Ir a **Catalogos** -> deberian verse los 3 componentes (C1, C2, C3) y las 6 acciones (A1/A2 por cada uno).
7. Ir a **Reportes** -> seleccionar R1 -> ver datos + boton Export CSV funciona.
8. Verificar el CSV: separador `;`, BOM UTF-8, tildes correctas en Excel.

Si todo OK: **listo para entregar al cliente CAR Cundinamarca**.

---

## 5. Limitaciones del free tier (a tener en cuenta)

| Servicio | Limitacion | Impacto TerraSight |
|---|---|---|
| Supabase BD | 500 MB | OK para MVP (~50 MB con seed). Cuidado si el cliente sube muchos SHP. |
| Supabase BD | Pausa tras 1 semana de inactividad | **CRITICO**: el cliente CAR no entrara todos los dias. Si el proyecto se pausa, hay que reactivarlo manualmente desde el dashboard. |
| Supabase Bandwidth | 2 GB/mes | Suficiente para 5-10 usuarios concurrentes. |
| Vercel Bandwidth | 100 GB/mes | Sobra. |
| Vercel Build | 45 min/mes | Cada deploy gasta 1-2 min. ~20 deploys/mes. OK. |
| Vercel Serverless | 10s timeout por request | Las queries mas pesadas del repository (R7 con 2303 vias) demoran ~20ms en local. En Vercel deberia estar bien, pero si alguna query supera 10s hay que optimizarla. |

**Accion recomendada para el cliente**: configurar un cron mensual (Vercel Cron free incluye 2 crons) que haga un GET a `/dashboard` o `/` cada 25 dias para evitar la pausa de Supabase.

---

## 6. Troubleshooting comun

### "Connection refused" en Vercel
- El `DATABASE_URL` apunta a `localhost:5433` (la BD local). Hay que cambiarlo por el de Supabase.

### "NEXTAUTH_URL" error en login
- `NEXTAUTH_URL` no coincide con la URL publica. Actualizar y re-deploy.

### Mapas en blanco
- El cliente (Leaflet) carga tiles de OpenStreetMap por HTTPS. Si Vercel no tiene salida a internet (raro), no cargan. Verificar `https://a.tile.openstreetmap.org/` en network tab.

### Migrations ya aplicadas
- Si re-corre `migrate.mjs`, las migraciones idempotentes (con `IF NOT EXISTS`) skippean. Las que no son idempotentes (ej. INSERT de seed) van a fallar con `duplicate key`. Usar `--no-seed` para re-aplicar sin el seed.

### PostGIS queries lentas en Vercel
- Free tier de Supabase tiene 2 GB de RAM. Queries pesadas con `ST_Intersects` + varias tablas grandes pueden tardar. Revisar `EXPLAIN ANALYZE` en SQL Editor. Considerar pre-agregar vistas materializadas (futuro sprint).

---

## 7. Proximos pasos post-deploy

1. **Custom domain** (ej. `terrasight.car.gov.co`): Vercel -> Settings -> Domains. DNS CNAME al target de Vercel.
2. **GitHub Actions CI** (`.github/workflows/ci.yml`): ya esta configurado, va a correr en cada PR.
3. **Sprint 13 — Auth ampliado**: reset por email, MFA TOTP, export CSV de auditoria.
4. **Sprint 14 — Configuracion**: `/configuracion` real (capas base, umbrales, backups).