// =============================================================================
// Shims de tipos para módulos sin @types publicados.
// =============================================================================

declare module "shpjs" {
  // shpjs expone una función `shp(...)` con múltiples firmas posibles:
  //  - shp(geojsonStringOrBuffer)
  //  - shp(shpBuffer, dbfBuffer)         ← esta es la que usamos en geo-import
  //  - shp(geojsonBuffer, options)
  //  - shp(File | Blob | FileList | File[])
  //
  // Tipamos lo mínimo para que tsc no se queje y dejamos `...rest: unknown[]`
  // para las variantes que no cubrimos. Si shpjs rompe en runtime, el cast
  // `as FeatureCollection` del call site es responsabilidad del caller.
  export interface ShpFeatureCollection {
    type: "FeatureCollection";
    features: unknown[];
  }

  interface ShpOptions {
    encoding?: string;
    bbox?: unknown[];
  }

  const shpjs: (
    input: string | ArrayBuffer | File | Blob | FileList | File[] | unknown,
    dbf?: ArrayBuffer | null | undefined,
    options?: ShpOptions,
  ) => Promise<ShpFeatureCollection | Record<string, ShpFeatureCollection>>;

  export default shpjs;
}
