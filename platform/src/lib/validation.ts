// =============================================================================
// Validador de FormData sin dependencias externas.
//
// Diseñado para uso desde Server Actions: extrae + valida + tipifica los campos
// del FormData contra reglas declarativas, devolviendo `{ok, data}` o
// `{ok, message, field}`.
//
// Reglas soportadas:
//   - required
//   - type: "string" | "email" | "number" | "integer" | "boolean" | "enum"
//   - min, max (string length o número)
//   - integer (solo number)
//   - values (solo enum)
// =============================================================================

export type Rule =
  | { name: string; required?: boolean; type: "string"; min?: number; max?: number }
  | { name: string; required?: boolean; type: "email" }
  | { name: string; required?: boolean; type: "number"; min?: number; max?: number; integer?: boolean }
  | { name: string; required?: boolean; type: "boolean" }
  | { name: string; required?: boolean; type: "enum"; values: readonly string[] };

export type ParseResult<T> =
  | { ok: true; data: T; message?: undefined; field?: undefined }
  | { ok: false; message: string; field?: string; data?: undefined };

export function safeParseForm(
  formData: FormData,
  schema: Record<string, Rule>,
): ParseResult<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const rule of Object.values(schema)) {
    const raw = formData.get(rule.name);
    const missing = raw === null || raw === undefined || raw === "";

    // boolean: el checkbox manda "" o null si está off; "on"/true si on.
    if (rule.type === "boolean") {
      const value = !missing && raw !== "false" && raw !== "0";
      if (rule.required && missing) {
        return { ok: false, message: `Campo "${rule.name}" es obligatorio.`, field: rule.name };
      }
      out[rule.name] = value;
      continue;
    }

    if (missing) {
      if (rule.required) {
        return { ok: false, message: `Campo "${rule.name}" es obligatorio.`, field: rule.name };
      }
      out[rule.name] = null;
      continue;
    }

    const valueStr = String(raw);
    if (rule.type === "string") {
      if (rule.min && valueStr.length < rule.min) {
        return { ok: false, message: `"${rule.name}" debe tener al menos ${rule.min} caracteres.`, field: rule.name };
      }
      if (rule.max && valueStr.length > rule.max) {
        return { ok: false, message: `"${rule.name}" no puede tener más de ${rule.max} caracteres.`, field: rule.name };
      }
      out[rule.name] = valueStr;
      continue;
    }

    if (rule.type === "email") {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valueStr)) {
        return { ok: false, message: `"${rule.name}" no parece un email válido.`, field: rule.name };
      }
      out[rule.name] = valueStr.toLowerCase();
      continue;
    }

    if (rule.type === "number") {
      const n = Number(valueStr);
      if (!Number.isFinite(n)) {
        return { ok: false, message: `"${rule.name}" debe ser numérico.`, field: rule.name };
      }
      if (rule.integer && !Number.isInteger(n)) {
        return { ok: false, message: `"${rule.name}" debe ser un entero.`, field: rule.name };
      }
      if (rule.min !== undefined && n < rule.min) {
        return { ok: false, message: `"${rule.name}" debe ser ≥ ${rule.min}.`, field: rule.name };
      }
      if (rule.max !== undefined && n > rule.max) {
        return { ok: false, message: `"${rule.name}" debe ser ≤ ${rule.max}.`, field: rule.name };
      }
      out[rule.name] = n;
      continue;
    }

    if (rule.type === "enum") {
      if (!rule.values.includes(valueStr)) {
        return { ok: false, message: `"${rule.name}" debe ser uno de: ${rule.values.join(", ")}.`, field: rule.name };
      }
      out[rule.name] = valueStr;
      continue;
    }
  }
  return { ok: true, data: out };
}
