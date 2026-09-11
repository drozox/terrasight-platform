// =============================================================================
// Tipos compartidos entre repositorio y componentes
//
// Este archivo es la única fuente de tipos client-safe. Las funciones SQL
// viven en `lib/repos/*.ts` (server-only, importan `db`).
// Cualquier tipo aquí puede ser importado desde componentes cliente y
// server sin arrastrar el cliente nativo de Postgres al bundle del browser.
// =============================================================================

// -----------------------------------------------------------------------------
// Dashboard / Home
// -----------------------------------------------------------------------------

export type DashboardKpis = {
  predios: number;
  propuestas: number;
  propuestasEjecucion: number;
  hectareasPredios: number;
  hectareasPropuestas: number;
  hectareasPropuestasEjecucion: number;
  hectareasPropuestasPoligono: number;
}

export type ComponenteTotal = {
  nombre: string; // "C1" | "C2" | "C3"
  total: number;
  linea: number;
  poligono: number;
  punto: number;
  porcentaje: number;
}

export type CoberturaTotal = {
  nombre: string;
  area: number;
  porcentaje: number;
  color: "primary" | "secondary" | "tertiary" | "outline";
}

export type IntervencionReciente = {
  id: number;
  tipo: string;
  actividad: string;
  nombrePredio: string;
  codigoPredio: string;
  municipio: string;
  componente: string;
  accion: string;
  hectareas: number | null;
  longitud: number | null;
  /**
   * Porcentaje de avance real (0-100) o `null` si la propuesta no tiene
   * ningún evento manual registrado. La UI muestra "Avance no registrado"
   * cuando es `null` y una barra con color según el threshold cuando hay
   * valor.
   */
  avance: number | null;
  /** Estado de la propuesta — usa el vocabulario del workflow (6 valores). */
  estado: EstadoIntervencion;
}

export type Alerta = {
  id: number;
  tipo: "error" | "warning" | "info";
  titulo: string;
  descripcion: string;
  fecha: string;
}

export type FooterKpis = {
  municipios: number;
  veredas: number;
  predios: number;
  hectareasIntervenidas: number;
  quebradas: number;
}

export type MapProperties = {
  id: number;
  nombre: string;
  codigo: string;
  areaHa: number;
  componente: string;
}

export type MapFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: MapProperties;
}

export type MapFeatureCollection = {
  type: "FeatureCollection";
  features: MapFeature[];
}

export type PredioMini = {
  id: number;
  nombre: string;
  lon: number;
  lat: number;
}

export type PredioPorMunicipio = {
  id_municipio: number;
  nombre_municipio: string;
  predios: number;
  hectareas: number;
}

export type SerieTemporal = {
  etiqueta: string; // "2024", "Q1 2025", "Bosque Natural", "La Calera"
  valor: number;
}

// -----------------------------------------------------------------------------
// Predios (HU-TC-01, HU-TC-07, HU-TC-08)
// -----------------------------------------------------------------------------

export type PredioFull = {
  idPredio: number;
  nombrePredio: string;
  areaHa: number;
  cedulaCatastral: string;
  cedulaAnt: string;
  longitudCentroide: number;
  latitudCentroide: number;
  nucleoPredial: string;
  observaciones: string;
  perimetro: number;
  idPropietario: number;
  idVereda: number;
}

export type PropietarioMini = {
  idPropietario: number;
  nombreRazonSocial: string;
}

export type PropietarioFull = {
  idPropietario: number;
  nombreRazonSocial: string;
  telefono: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  /** # de predios que dependen de este propietario (pre-check eliminar). */
  totalPredios: number;
}

export type PropietarioInput = {
  nombreRazonSocial: string;
  telefono?: string;
}

export type VeredaMini = {
  idVereda: number;
  nombreVereda: string;
  idMunicipio: number;
  nombreMunicipio: string;
}

export type VeredaFull = {
  idVereda: number;
  nombreVereda: string;
  codigoAdministrativo: string;
  poblacionEstimada: number;
  idMunicipio: number;
  nombreMunicipio: string | null;
  departamento: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  /** # de predios que dependen de esta vereda (pre-check eliminar). */
  totalPredios: number;
}

export type VeredaInput = {
  nombreVereda: string;
  codigoAdministrativo: string;
  poblacionEstimada?: number;
  idMunicipio: number;
}

// -----------------------------------------------------------------------------
// Quebradas (HU-TC-02, HU-TC-06, HU-TC-09)
// -----------------------------------------------------------------------------

export type QuebradaFull = {
  idQuebrada: number;
  nombreQuebrada: string;
  area: number;
  latitud: number;
  longitud: number;
  idMunicipio: number | null;
  idMicrocuenca: number | null;
}

export type MunicipioMini = {
  idMunicipio: number;
  nombreMunicipio: string;
}

export type MunicipioFull = {
  idMunicipio: number;
  nombreMunicipio: string;
  codigoAdministrativo: string;
  departamento: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  /** # de veredas que dependen de este municipio (pre-check eliminar). */
  totalVeredas: number;
  /** # de predios indirectos via veredas (pre-check eliminar). */
  totalPredios: number;
}

export type MunicipioInput = {
  nombreMunicipio: string;
  codigoAdministrativo: string;
  departamento: string;
}

export type MicrocuencaFull = {
  idMicrocuenca: number;
  nombreMicrocuenca: string;
  codigo: string;
  area: number;
  latitud: number;
  longitud: number;
  nombreUsuarios: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  /** # de quebradas que dependen de esta microcuenca (pre-check eliminar). */
  totalQuebradas: number;
}

export type MicrocuencaInput = {
  nombreMicrocuenca: string;
  codigo: string;
  area?: number;
  latitud?: number;
  longitud?: number;
  nombreUsuarios?: string;
}

// -----------------------------------------------------------------------------
// Beneficiarios (HU-TC-10, HU-MO-01..03)
// -----------------------------------------------------------------------------

export type BeneficiarioFull = {
  idUsuario: number;
  nombre: string;
  telefono: string;
  vereda: string;
  municipio: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  /** # de relaciones sgs_rel_propuesta_punto_usuario (pre-check eliminar). */
  totalRelaciones: number;
}

export type BeneficiarioMini = {
  idUsuario: number;
  nombre: string;
  telefono: string;
  vereda: string;
  municipio: string;
}

export type BeneficiarioInput = {
  nombre: string;
  telefono?: string;
  vereda?: string;
  municipio?: string;
}

// -----------------------------------------------------------------------------
// Propuestas / Intervenciones (HU-TC-04, HU-IC-01..04)
// -----------------------------------------------------------------------------

/**
 * Alias histórico: `EstadoIntervencion` = `EstadoPropuesta` (workflow 6 estados, Sprint 20).
 * La columna `sgs_pro_propuesta.estado` (migration 33) usa el vocabulario nuevo en MAYÚSCULAS.
 * Mantenemos el nombre viejo como alias para no romper imports.
 */
export type EstadoIntervencion =
  | "BORRADOR"
  | "EN_REVISION"
  | "APROBADA"
  | "EN_EJECUCION"
  | "FINALIZADA"
  | "RECHAZADA";

export type PropuestaSimple = {
  idPropuesta: number;
  tipo: "punto" | "linea" | "poligono";
  actividad: string;
  hectareas: number | null;
  longitudM: number | null;
}

export type AvancePropuesta = {
  idAvance: number;
  idPropuesta: number;
  avancePct: number;
  nota: string;
  idUsuario: number | null;
  autorEmail: string | null;
  /**
   * TRUE si la fila fue sembrada por el backfill de la migración 06
   * (valores 20/75/100 derivados del tipo). Las queries de "último avance
   * real" filtran `WHERE es_backfill = FALSE`; el Timeline oculta estas
   * filas para no mostrar "Backfill inicial" como primer evento.
   */
  esBackfill: boolean;
  createdAt: Date;
}

// Tipos GeoJSON mínimos (no importamos @types/geojson para no sumar deps).
export type GeoJSONLineString = {
  type: "LineString";
  coordinates: [number, number][];
}

export type GeoJSONPolygon = {
  type: "Polygon";
  coordinates: [number, number][][];
}

export type PuntoGeom = {
  lat: number;
  lon: number;
  tipoPunto: string;
  descripcion: string;
}

export type LineaGeom = {
  longitudM: number;
  /**
   * `sgs_pro_propuesta_linea` no tiene columna de área; queda en 0 para
   * uniformidad de tipo con `PoligonoGeom` y poder mostrar la métrica en
   * una misma card del front.
   */
  areaHa: number;
  geojson: GeoJSONLineString;
}

export type PoligonoGeom = {
  areaHa: number;
  geojson: GeoJSONPolygon;
}

interface IntervencionCompletaBase {
  id: number;
  tipo: "punto" | "linea" | "poligono";
  actividad: string;
  estado: EstadoIntervencion;
  // Joins (nullable: la propuesta podría no tener predio/municipio/etc.)
  predio: { id: number; nombre: string; codigo: string; areaHa: number } | null;
  vereda: { id: number; nombre: string } | null;
  municipio: { id: number; nombre: string; departamento: string } | null;
  accion: { id: number; nombre: string; componente: string } | null;
  quebrada: { id: number; nombre: string } | null;
  // Avance (HU-IC-04)
  /**
   * Porcentaje de avance real del último evento manual, o `null` si la
   * propuesta no tiene ningún evento registrado. La UI distingue ambos
   * casos ("Avance no registrado" vs barra con %).
   */
  avancePctActual: number | null;
  avances: AvancePropuesta[];
}

export type IntervencionCompleta =
  | (IntervencionCompletaBase & { tipo: "punto"; geom: PuntoGeom | null })
  | (IntervencionCompletaBase & { tipo: "linea"; geom: LineaGeom | null })
  | (IntervencionCompletaBase & { tipo: "poligono"; geom: PoligonoGeom | null });

// -----------------------------------------------------------------------------
// Catálogos (HU-TC-03, HU-TC-05)
// -----------------------------------------------------------------------------

export type ComponenteLookup = {
  idComponente: number;
  nombre: string;
}

export type AccionLookup = {
  idAccion: number;
  nombre: string;
  idComponente: number;
  nombreComponente: string;
}

// `COMPONENTES_VALIDOS` y `ACCIONES_VALIDAS` viven en `lib/constants.ts`
// (values client-safe). Los tipos derivados van acá:
export type ComponenteValido = "C1" | "C2" | "C3";
export type AccionValida = "A1" | "A2";

export type ComponenteFull = {
  idComponente: number;
  nombre: ComponenteValido;
  createdAt: Date | null;
  updatedAt: Date | null;
  totalAcciones: number;
  totalPropuestas: number;
}

export type AccionFull = {
  idAccion: number;
  nombre: AccionValida;
  idComponente: number;
  nombreComponente: ComponenteValido;
  createdAt: Date | null;
  updatedAt: Date | null;
  totalPropuestas: number;
}

// -----------------------------------------------------------------------------
// Análisis espacial (HU-AA-02..04)
// -----------------------------------------------------------------------------

export type BufferTarget = "quebrada" | "propuesta";

export type BufferResultTipo = "predio" | "quebrada" | "propuesta";

export type BufferResultItem = {
  tipo: BufferResultTipo;
  id: number;
  nombre: string;
  distanciaM: number | null;
  areaHa: number | null;
  longitudM: number | null;
  centroidLat: number | null;
  centroidLon: number | null;
}

export type MatrizFila = {
  municipio: string;
  C1: { numPropuestas: number; hectareas: number };
  C2: { numPropuestas: number; hectareas: number };
  C3: { numPropuestas: number; hectareas: number };
  totalNumPropuestas: number;
  totalHectareas: number;
}

export type CoberturaMunicipioFila = {
  municipio: string;
  totalHa: number;
  totalPredios: number;
  porCobertura: Array<{
    nombre: string;
    ha: number;
    predios: number;
    porcentaje: number;
  }>;
}

export type BoundingBox = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export type IntersectionResult = {
  bbox: BoundingBox;
  areaHaBbox: number | null;
  numPredios: number;
  totalAreaPrediosHa: number;
  numPropuestas: number;
  predios: Array<{
    idPredio: number;
    nombre: string;
    areaHaBdr: number;
    centroideLat: number;
    centroideLon: number;
    componente: string | null;
  }>;
  propuestas: Array<{
    idPropuesta: number;
    tipo: "punto" | "linea" | "poligono";
    actividad: string;
    estado: string;
    hectareas: number | null;
    longitudM: number | null;
  }>;
}

// -----------------------------------------------------------------------------
// Reportes (HU-CO-04)
// -----------------------------------------------------------------------------

export type ReporteTipo =
  | "R1" | "R2" | "R3" | "R4" | "R5"
  | "R6" | "R7" | "R8" | "R9" | "R10";

export type ReporteR1Fila = {
  idPredio: number;
  nombrePredio: string;
  areaHa: number;
  propietario: string;
  telefonoPropietario: string;
  nombreVereda: string;
  nombreMunicipio: string;
  departamento: string;
  cedulaCatastral: string;
  observaciones: string;
}

export type ReporteR2Fila = {
  idPredio: number;
  nombrePredio: string;
  areaHa: number;
  coberturas: string;
  biomas: string;
  totalCoberturas: number;
  totalBiomas: number;
}

export type ReporteR3Fila = {
  componente: string;
  accion: string;
  totalPropuestas: number;
  propuestasLinea: number;
  propuestasPoligono: number;
  propuestasPunto: number;
  tiposPresentes: string;
}

export type ReporteR4Fila = {
  idPredio: number;
  nombrePredio: string;
  idPropuesta: number;
  tipo: string;
  actividad: string;
  componente: string;
  accion: string;
  nombreQuebrada: string;
  detalleEspecifico: string;
  /** % de avance real (0-100) o `null` si la propuesta no tiene evento manual. */
  avancePct: number | null;
}

export type ReporteR5Fila = {
  idPropPunto: number;
  actividad: string;
  tipoPunto: string;
  este: number | null;
  norte: number | null;
  nombreQuebrada: string;
  usuariosBeneficiarios: string;
  totalUsuarios: number;
  /** % de avance real (0-100) o `null` si la propuesta no tiene evento manual. */
  avancePct: number | null;
}

export type ReporteR6Fila = {
  idPredio: number;
  nombrePredio: string;
  zonificacionPomca: string;
  zonificacionRfp: string;
  paramos: string;
}

export type ReporteR7Fila = {
  nombreMunicipio: string;
  departamento: string;
  totalVias: number;
  totalDrenajesSimples: number;
  totalDrenajesDobles: number;
  tiposVia: string;
  estadosDrenajeSimple: string;
  tiposDrenajeDoble: string;
}

export type ReporteR8Fila = {
  componente: string;
  prediosConPropuestas: number;
  totalPropuestas: number;
  linea: number;
  poligono: number;
  punto: number;
}

export type ReporteR9Fila = {
  idQuebrada: number;
  nombreQuebrada: string;
  area: number | null;
  nombreMunicipio: string;
  totalPropuestas: number;
  propuestasLinea: number;
  propuestasPoligono: number;
  propuestasPunto: number;
}

export type ReporteR10Fila = {
  biomaIavh: string;
  totalPredios: number;
  areaTotalHa: number;
  areaPromedioHa: number;
  predios: string;
}

// -----------------------------------------------------------------------------
// Admin / Auditoría (HU-AD-02, HU-AD-04)
// -----------------------------------------------------------------------------

export type UsuarioAdmin = {
  idUsuario: number;
  email: string;
  nombre: string;
  /** Importado de `lib/auth`: ADMIN | ANALISTA | GESTOR */
  rol: import("./auth").RolSistema;
  activo: boolean;
  ultimoAccesoEn: Date | null;
  creadoEn: Date;
}

export type AuditEvento =
  | "LOGIN_OK"
  | "LOGIN_FAIL"
  | "LOGOUT"
  | "ACCESS_DENY"
  | "ACCOUNT_LOCKED";

export type AuditEvent = {
  idEvento: string;
  ocurridoEn: Date;
  idUsuario: number | null;
  emailUsado: string | null;
  evento: AuditEvento;
  recurso: string | null;
  ip: string | null;
  userAgent: string | null;
  exitoso: boolean;
  detalle: string | null;
  /** Para la UI: nombre del usuario si existe */
  nombreUsuario: string | null;
}

export type AuditFiltros = {
  evento?: AuditEvento | null;
  idUsuario?: number | null;
  emailLike?: string | null;
  limit?: number;
  offset?: number;
}

// -----------------------------------------------------------------------------
// Monitoreo (HU-MO-01..03)
// -----------------------------------------------------------------------------

// `TIPOS_PUNTO` vive en `lib/constants.ts` (value client-safe). El tipo
// derivado va acá para mantener el árbol de tipos puro.
export type TipoPunto =
  | "obra_captacion"
  | "estacion_limnimetrica"
  | "bebedero"
  | "tanque"
  | "panel_solar";

export type MonitoreoPunto = {
  idPropPunto: number;
  idPropuesta: number;
  actividad: string;
  descripcion: string;
  tipoPunto: TipoPunto;
  tipoObra: number;
  estructuraAnclaje: boolean;
  nivelComplejidad: string;
  idEstacionOriginal: string;
  codTipo: string;
  codigoCaj: string;
  este: number;
  norte: number;
  lon: number | null; // ST_X(geom::geometry)
  lat: number | null; // ST_Y(geom::geometry)
  idQuebrada: number | null;
  nombreQuebrada: string | null;
  idPredio: number;
  codigoPredio: string;
  nombrePredio: string;
  nombreMunicipio: string | null;
  nombreVereda: string | null;
  idAccion: number;
  nombreAccion: string;
  idComponente: number;
  nombreComponente: string;
  estadoPropuesta: EstadoIntervencion; // viene de sgs_pro_propuesta.estado
  totalBeneficiarios: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export type MonitoreoKpis = {
  totalPuntos: number;
  porTipo: Record<TipoPunto, number>;
  totalBeneficiarios: number;
  porComponente: Record<string, number>;
}

// -----------------------------------------------------------------------------
// Metas por Componente/Acción (S5.M — sprint 5, paralelo a S5 Reportes)
//
// Una `MetaResumen` es una meta del convenio: "12 km de cercos vivos en C1A1",
// "79 cosecha de agua en C2A1", etc. La página /metas las muestra como
// progress bars. `pct` se computa en el repo (current/meta * 100), capping
// a 100 para la barra (los % >100 se muestran como "超额" en el futuro).
// -----------------------------------------------------------------------------
export type MetaResumen = {
  componente: string;
  accion: string;
  metaKey: string;
  metaLabel: string;
  metaValue: number;
  metaUnit: string;
  currentValue: number;
  currentUnit: string;
  countPropuestas: number;
  pct: number;
};

export type MetasGlobal = {
  totalMetas: number;
  metasCumplidas: number;
  sumCurrent: number;
  sumMeta: number;
  pct: number;
};

export type MunicipioIntervenido = {
  idMunicipio: number;
  nombreMunicipio: string;
  departamento: string;
  numPropuestas: number;
  numPredios: number;
  numVeredas: number;
};
