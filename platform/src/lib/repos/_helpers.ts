// =============================================================================
// Helpers compartidos por los repos (server-only)
//
// Este archivo NO se exporta desde el barrel `lib/repos/index.ts`. Solo
// pueden importarlo los archivos `./predios.ts`, `./quebradas.ts`, etc.
// que viven en el mismo directorio.
// =============================================================================

// -----------------------------------------------------------------------------
// withFallback — ejecuta una consulta contra Postgres y, si falla (BD caída,
// sin Docker, modo demo), retorna el fallback. Permite que la UI siempre se
// renderice incluso sin infraestructura levantada.
// -----------------------------------------------------------------------------
export async function withFallback<T>(
  label: string,
  query: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await query();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[terrasight] DB query "${label}" failed, using demo data:`,
        (err as Error).message,
      );
    }
    return fallback;
  }
}

// -----------------------------------------------------------------------------
// Validación de teléfono (privada hasta commit 5, donde se borra).
// Se usa en `crearPropietario`, `actualizarPropietario`,
// `crearBeneficiario`, `actualizarBeneficiario`. Como cruza 2 dominios
// (predios y monitoreo/beneficiarios) y no puede vivir en `constants.ts`
// (que es client-safe), vive acá hasta su deprecación.
// -----------------------------------------------------------------------------
export const TELEFONO_REGEX = /^[\d\s\-\+\(\)]{7,20}$/;

export function isValidTelefono(t: string): boolean {
  return TELEFONO_REGEX.test(t);
}
