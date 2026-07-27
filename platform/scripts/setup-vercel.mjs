#!/usr/bin/env node
// =============================================================================
// setup-vercel.mjs — One-shot setup para deploy de TerraSight en Vercel
//
// Hace en orden lo que antes era 10+ clicks manuales:
//   1. Verifica auth (gh + vercel)
//   2. Linkea el proyecto a Vercel (si no está linkeado)
//   3. Setea/actualiza las 4 env vars requeridas (idempotente)
//   4. Trigger un deploy de production
//   5. Captura la URL del deploy y la setea como NEXTAUTH_URL
//   6. (Opcional) Intenta configurar un alias `.vercel.app` via API
//
// Uso:
//   node scripts/setup-vercel.mjs                                    # setup completo
//   node scripts/setup-vercel.mjs --alias=terrasight-convenio        # con alias
//   node scripts/setup-vercel.mjs --no-deploy                        # solo env vars
//   node scripts/setup-vercel.mjs --db-url='postgresql://...'        # override DB
//
// Después del setup, los deploys subsiguientes son con `git push` y Vercel
// auto-deploya. Solo re-corré este script si querés cambiar env vars.
//
// Prereqs:
//   - gh auth login (GitHub CLI autenticado como drozox)
//   - npx vercel login (Vercel CLI autenticado, idealmente con GitHub)
//
// Banderas a NO romper:
//   - NEXTAUTH_URL debe ser HTTPS en producción (NextAuth no acepta http)
//   - DATABASE_URL debe incluir `?sslmode=require` para el pooler de Supabase
// =============================================================================

import { execSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const args = process.argv.slice(2);
const flag = (name) => args.find(a => a.startsWith(`--${name}=`))?.split("=")[1];
const hasFlag = (name) => args.includes(`--${name}`);

const ALIAS = flag("alias"); // ej: "terrasight-convenio" (sin .vercel.app)
const SKIP_DEPLOY = hasFlag("no-deploy");
const DB_URL_OVERRIDE = flag("db-url");

const REQUIRED_ENVS = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "AUTH_TRUST_HOST"];

const log = {
  info: (m) => console.log(`[setup] ${m}`),
  ok:   (m) => console.log(`[setup] ✓ ${m}`),
  warn: (m) => console.log(`[setup] ! ${m}`),
  err:  (m) => console.error(`[setup] ✗ ${m}`),
};

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
  } catch (e) {
    return { error: e.message, stdout: e.stdout?.toString() ?? "", stderr: e.stderr?.toString() ?? "" };
  }
}

function v(cmd, args2 = []) {
  return spawnSync("npx", ["vercel", ...args2], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

// =============================================================================
// 1. Auth checks
// =============================================================================
log.info("Verificando autenticación...");

const ghAuth = run("gh auth status 2>&1");
if (ghAuth.error || !ghAuth.includes("Logged in")) {
  log.err("gh CLI no autenticado. Corré: gh auth login");
  process.exit(1);
}
const ghUser = (ghAuth.match(/account (\S+)/) || [])[1];
log.ok(`GitHub: ${ghUser}`);

const vWho = v("whoami");
if (vWho.status !== 0) {
  log.err("Vercel CLI no autenticado. Corré: npx vercel login");
  process.exit(1);
}
const vercelUser = (vWho.stdout || "").trim().split("\n").pop();
log.ok(`Vercel: ${vercelUser}`);

// =============================================================================
// 2. Link project (if not linked)
// =============================================================================
log.info("Verificando link al proyecto Vercel...");

const vDir = run("npx vercel project ls 2>&1");
if (vDir.error || !vDir.includes("terrasight-platform")) {
  log.warn("Proyecto no linkeado. Corriendo `vercel link` (te va a preguntar)...");
  const link = spawnSync("npx", ["vercel", "link", "--yes"], { stdio: "inherit" });
  if (link.status !== 0) {
    log.err("vercel link falló. Reintentá manualmente: npx vercel link");
    process.exit(1);
  }
}
log.ok("Proyecto linkeado");

// =============================================================================
// 3. Set env vars
// =============================================================================
log.info("Sincronizando env vars...");

const DB_URL = DB_URL_OVERRIDE ?? process.env.DATABASE_URL;
if (!DB_URL) {
  log.err("DATABASE_URL no provista. Pasala con --db-url=... o export DATABASE_URL=...");
  process.exit(1);
}
if (!DB_URL.includes("sslmode=require")) {
  log.warn("DATABASE_URL no incluye '?sslmode=require' — agregándolo");
}

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? randomBytes(32).toString("base64");
if (!process.env.NEXTAUTH_SECRET) {
  log.warn("NEXTAUTH_SECRET no estaba en env — generando uno nuevo. GUARDALO: ");
  console.log(`         ${NEXTAUTH_SECRET}`);
}

const values = {
  DATABASE_URL:     DB_URL.includes("sslmode=require") ? DB_URL : `${DB_URL}?sslmode=require`,
  NEXTAUTH_SECRET:  NEXTAUTH_SECRET,
  NEXTAUTH_URL:     "https://PLACEHOLDER.vercel.app", // lo actualizamos después del deploy
  AUTH_TRUST_HOST:  "true",
};

// Setear las 4 envs en los 3 environments (Production, Preview, Development)
for (const [key, value] of Object.entries(values)) {
  if (key === "NEXTAUTH_URL") continue; // este se setea después con el URL real
  for (const env of ["production", "preview", "development"]) {
    const r = v("env", ["add", key, env, value, "--yes"]);
    if (r.status === 0) {
      log.ok(`${key} (${env}) set`);
    } else {
      // Si ya existe, intentar update
      const r2 = v("env", ["update", key, env, value, "--yes"]);
      if (r2.status === 0) log.ok(`${key} (${env}) updated`);
      else log.warn(`${key} (${env}): ${r2.stderr?.split("\n")[0] ?? "unknown"}`);
    }
  }
}

// =============================================================================
// 4. Deploy
// =============================================================================
if (SKIP_DEPLOY) {
  log.info("--no-deploy: salteo el deploy. NEXTAUTH_URL queda con placeholder.");
  log.info("Cuando hagas el primer deploy manualmente, corré:");
  log.info("  npx vercel env add NEXTAUTH_URL production");
  log.info("  <pegar el URL real del deploy>");
  process.exit(0);
}

log.info("Triggereando deploy de production...");
log.info("(Si tu código no está pusheado, esto va a fallar. Hacé `git push` primero.)");

const deploy = spawnSync("npx", ["vercel", "deploy", "--prod", "--yes"], { encoding: "utf8", stdio: "inherit" });
if (deploy.status !== 0) {
  log.err("Deploy falló. Revisá el output arriba.");
  process.exit(1);
}

// =============================================================================
// 5. Capturar URL del deploy y actualizar NEXTAUTH_URL
// =============================================================================
log.info("Capturando URL del deploy...");

const ls = v("ls");
if (ls.status !== 0) {
  log.err("No pude listar deploys. Reintentá manualmente.");
  process.exit(1);
}

// Formato esperado: "https://terrasight-platform-XXXX-drozoxs-projects.vercel.app    Ready    ..."
const urlMatch = (ls.stdout || "").match(/(https:\/\/[^\s]+\.vercel\.app)/);
if (!urlMatch) {
  log.err("No encontré URL de deploy. Output fue:");
  console.log(ls.stdout);
  process.exit(1);
}
const DEPLOY_URL = urlMatch[1];
log.ok(`Deploy URL: ${DEPLOY_URL}`);

// Actualizar NEXTAUTH_URL en los 3 envs
for (const env of ["production", "preview", "development"]) {
  const r = v("env", ["add", "NEXTAUTH_URL", env, DEPLOY_URL, "--yes"]);
  if (r.status !== 0) {
    v("env", ["update", "NEXTAUTH_URL", env, DEPLOY_URL, "--yes"]);
  }
  log.ok(`NEXTAUTH_URL (${env}) = ${DEPLOY_URL}`);
}

// =============================================================================
// 6. (Opcional) Alias
// =============================================================================
if (ALIAS) {
  const aliasUrl = `https://${ALIAS}.vercel.app`;
  log.info(`Configurando alias ${aliasUrl}...`);
  log.warn("Si falla, hacelo manualmente: Vercel → Settings → Domains → Add");
  const r = spawnSync("npx", ["vercel", "alias", "set", DEPLOY_URL, aliasUrl], { stdio: "inherit" });
  if (r.status === 0) {
    log.ok(`Alias configurado: ${aliasUrl}`);
    // Update NEXTAUTH_URL al alias
    for (const env of ["production", "preview", "development"]) {
      v("env", ["add", "NEXTAUTH_URL", env, aliasUrl, "--yes"]) ||
      v("env", ["update", "NEXTAUTH_URL", env, aliasUrl, "--yes"]);
    }
    log.ok(`NEXTAUTH_URL actualizado a ${aliasUrl}`);
  } else {
    log.warn(`Alias no se pudo configurar via CLI. Hacelo manual en el dashboard.`);
  }
}

// =============================================================================
// 7. Resumen final
// =============================================================================
console.log("");
log.ok("SETUP COMPLETO");
console.log("");
console.log("  Deploy URL:        " + DEPLOY_URL);
if (ALIAS) console.log("  Alias:             https://" + ALIAS + ".vercel.app");
console.log("");
console.log("  Próximos pasos:");
console.log("  1. Esperá que Vercel termine el re-deploy (30-60s)");
console.log("  2. Abrí el URL en el browser");
console.log("  3. Login con el admin que ya creaste:");
console.log("     node scripts/create-admin.mjs --email ... --password ...");
console.log("");
console.log("  Deploys futuros: solo `git push origin main` y Vercel auto-deploya.");
console.log("  Si querés cambiar env vars, re-corré este script con los nuevos valores.");
