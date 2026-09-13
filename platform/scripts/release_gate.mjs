#!/usr/bin/env node
// =============================================================================
// scripts/release_gate.mjs — §21 del FINAL-CLOSURE-PLAN
//
// Corre el gate completo de release y decide GOAL_COMPLETED.
//
// Uso:
//   npm run release:gate
//   DATABASE_URL=... npm run release:gate    # incluye smoke + reconciliación
//
// Reglas:
//   - Si algún check OBLIGATORIO falla → GOAL_COMPLETED = FALSE (exit 1).
//   - Los checks de BD (smoke, reconciliación) solo corren si hay DATABASE_URL;
//     si no, se marcan como SKIP (no bloquean local, pero SÍ en CI porque ahí
//     DATABASE_URL está set).
// =============================================================================

import { spawnSync } from "node:child_process";

const hasDb = !!process.env.DATABASE_URL;

const STEPS = [
  { name: "typecheck",      cmd: "npx tsc --noEmit" },
  { name: "lint",           cmd: "npm run lint" },
  { name: "unit + integración", cmd: "npm test" },
  { name: "build",          cmd: "npm run build" },
  { name: "smoke BD",       cmd: "node scripts/prod_smoke.mjs",       needDb: true },
  { name: "reconciliación", cmd: "node scripts/audit_resultados.mjs", needDb: true },
];

console.log("\n================ RELEASE GATE ================\n");

const results = [];
for (const step of STEPS) {
  if (step.needDb && !hasDb) {
    console.log(`⏭  ${step.name.padEnd(20)} SKIP (sin DATABASE_URL)`);
    results.push({ ...step, status: "skip" });
    continue;
  }
  console.log(`\n▶  ${step.name}  →  ${step.cmd}`);
  const r = spawnSync(step.cmd, { stdio: "inherit", shell: true });
  const ok = r.status === 0;
  console.log(`${ok ? "✅" : "❌"}  ${step.name} ${ok ? "OK" : "FALLÓ"}`);
  results.push({ ...step, status: ok ? "pass" : "fail" });
}

const failed = results.filter((r) => r.status === "fail");
const skipped = results.filter((r) => r.status === "skip");

console.log("\n================ RESUMEN ================");
for (const r of results) {
  const icon = r.status === "pass" ? "✅" : r.status === "fail" ? "❌" : "⏭";
  console.log(`  ${icon} ${r.name}`);
}
console.log();

if (failed.length > 0) {
  console.log(`GOAL_COMPLETED = FALSE  (${failed.length} check(s) fallaron: ${failed.map((f) => f.name).join(", ")})`);
  process.exit(1);
}
if (skipped.length > 0) {
  console.log(`GOAL_COMPLETED = TRUE (local) — con ${skipped.length} check(s) de BD salteados (correr con DATABASE_URL).`);
} else {
  console.log("GOAL_COMPLETED = TRUE");
}
process.exit(0);
