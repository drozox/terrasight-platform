// =============================================================================
// Crea el primer (o siguientes) usuarios administradores.
//
// Uso:
//   node scripts/create-admin.mjs --email admin@car.gov.co --nombre "Ana Maria" --password "Secreta123!" --rol ADMIN
//
// Flags opcionales:
//   --rol ADMIN | ANALISTA | GESTOR    (default: ADMIN)
//
// El script:
//   1. Lee credenciales de CLI o variables de entorno
//   2. Valida formato
//   3. Hashea con bcrypt
//   4. Inserta o actualiza en `sgs_adm_usuario`
// =============================================================================

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import postgres from "postgres";
import bcrypt from "bcryptjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = argv[i + 1];
      args[k] = v;
      i++;
    }
  }
  return args;
}

async function ask(rl, prompt, hidden = false) {
  // Node no tiene input hidden portable sin TTY; caemos a readline normal.
  // Para contraseña, aceptamos de env o CLI.
  return rl.question(prompt);
}

const args = parseArgs(process.argv.slice(2));

let email = args.email;
let nombre = args.nombre;
let password = args.password;
let rol = (args.rol ?? "ADMIN").toUpperCase();

if (!email || !nombre || !password) {
  const rl = createInterface({ input, output });
  email    = email    || await ask(rl, "Email: ");
  nombre   = nombre   || await ask(rl, "Nombre completo: ");
  if (!password) {
    process.stdout.write("Contraseña: ");
    password = await ask(rl, "");
    process.stdout.write("\n");
  }
  rol = rol || (await ask(rl, "Rol (ADMIN | ANALISTA | GESTOR) [ADMIN]: ")).toUpperCase() || "ADMIN";
  rl.close();
}

if (!["ADMIN", "ANALISTA", "GESTOR"].includes(rol)) {
  console.error(`Rol inválido: ${rol}. Permitidos: ADMIN | ANALISTA | GESTOR`);
  process.exit(2);
}

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error(`Email inválido: ${email}`);
  process.exit(2);
}

if (!password || password.length < 8) {
  console.error("La contraseña debe tener al menos 8 caracteres.");
  process.exit(2);
}

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://terrasight:terrasight_dev@localhost:5433/convenio_car_wwf";

const sql = postgres(connectionString, { max: 2 });

try {
  const passwordHash = await bcrypt.hash(password, 10);
  const inserted = await sql`
    INSERT INTO sgs_adm_usuario (email, password_hash, nombre, id_rol)
    SELECT ${email.toLowerCase()}, ${passwordHash}, ${nombre}, r.id_rol
    FROM sgs_adm_rol r
    WHERE r.nombre = ${rol}
    ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          nombre        = EXCLUDED.nombre,
          id_rol        = EXCLUDED.id_rol,
          activo        = TRUE,
          actualizado_en = now()
    RETURNING id_usuario, email, nombre, creado_en;
  `;
  const row = inserted[0];
  console.log("[create-admin] usuario guardado:", {
    id: row.id_usuario,
    email: row.email,
    nombre: row.nombre,
    rol,
  });
  console.log("[create-admin] ya podés iniciar sesión en /login");
  process.exitCode = 0;
} catch (err) {
  console.error("[create-admin] error:", err.message);
  if (/relation .* does not exist/.test(err.message)) {
    console.error(
      "Pista: ¿ejecutaste `psql -f scripts/db/init/03-auth-schema.sql`?",
    );
  }
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 1 });
}
