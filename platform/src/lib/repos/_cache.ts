// =============================================================================
// Helper de cache para queries de repositorio (DEBT-3).
//
// Envuelve una función de query con `unstable_cache` de Next 15. Preserva
// tipos. Uso típico:
//
//   const getFooImpl = async (id: number): Promise<Foo> => { ... };
//   export const getFoo = cached(getFooImpl, { tags: ["foo"], ttl: 60 });
//
// `tags` se usan en `revalidateTag(...)` desde las server actions para
// invalidar el cache cuando hay mutaciones. `ttl` es el backstop; el cache
// se refresca principalmente por invalidación explícita.
// =============================================================================

import { unstable_cache } from "next/cache";

export function cached<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  opts: { tags: readonly string[]; ttl: number },
): (...args: TArgs) => Promise<TResult> {
  return unstable_cache(
    fn,
    [fn.name],
    {
      tags: [...opts.tags],
      revalidate: opts.ttl,
    },
  ) as (...args: TArgs) => Promise<TResult>;
}
