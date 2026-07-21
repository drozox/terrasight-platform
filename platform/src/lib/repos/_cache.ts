// =============================================================================
// Helper de cache para queries del repositorio
//
// Envoltorio tipado de `unstable_cache` (Next 15) usado por todas las
// queries de lectura en `lib/repos/*.ts`. La invalidación se hace por tag
// desde las server actions (`app/*/actions.ts`).
//
// Tags: lista de claves que agrupan queries relacionadas. Por convención
//   usamos nombres de capa (no de función): `dashboard`, `intervenciones`,
//   `predios`, `quebradas`, `monitoreo`, `analisis`, `reportes`,
//   `mapa`, `catalogos:full`, `catalogos:lookup`.
//
// ttl: segundos hasta la revalidación por tiempo. Es un backstop de la
//   invalidación por tag: si una action olvidó llamar `revalidateTag`,
//   el cache expira igual. TTLs típicos: 60s (dashboard/mapa), 120s
//   (reportes), 300s (catálogos).
//
// keyParts: hook opcional para derivar partes de la cache key a partir de
//   los args. Hoy no se usa; queda prevista para queries con args
//   complejos (objetos) que no se serializan bien por default.
//
// Decisiones de diseño:
//   - Preserva la firma `(...args) => Promise<TResult>` para que las pages
//     que hoy hacen `await getDashboardKpis()` no cambien.
//   - `unstable_cache` usa `fn.name` como parte de la cache key. Las
//     funciones se exponen como `export const foo = cached(fooImpl, ...)`.
// =============================================================================

import { unstable_cache } from "next/cache";

export function cached<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  opts: { tags: readonly string[]; ttl: number; keyParts?: (args: TArgs) => readonly string[] }
): (...args: TArgs) => Promise<TResult> {
  return unstable_cache(
    fn,
    [fn.name],
    {
      tags: [...opts.tags],
      revalidate: opts.ttl,
    }
  ) as (...args: TArgs) => Promise<TResult>;
}
