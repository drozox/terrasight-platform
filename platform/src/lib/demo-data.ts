// =============================================================================
// Datos demo para SIG TERRITORIO
//
// Se usan como fallback automático cuando la BD PostgreSQL/PostGIS no está
// disponible (entornos de demo, presentaciones offline, CI, dev local sin
// Docker levantado). Permiten que la UI se renderice completa con KPIs
// realistas del Convenio CAR–WWF–Fundación Natura sobre Cundinamarca.
//
// Los datos se basan en los mostrados en los documentos del cliente
// (Stitch + Datos_ejemplo.txt + tablero de control 2.458 predios).
// =============================================================================

import type {
  DashboardKpis,
  ComponenteTotal,
  CoberturaTotal,
  IntervencionReciente,
  Alerta,
  FooterKpis,
  MapFeatureCollection,
  MapFeature,
  PredioMini,
  PredioPorMunicipio,
  SerieTemporal,
} from "./types";

// -----------------------------------------------------------------------------
// Dashboard KPIs (HU-CO-01) — números del Stitch/Datos_ejemplo
// -----------------------------------------------------------------------------

export const DEMO_DASHBOARD_KPIS: DashboardKpis = {
  predios: 2458,
  propuestas: 132,
  propuestasEjecucion: 78,
  hectareasPredios: 18420.5,
  hectareasPropuestas: 3265.8,
  hectareasPropuestasEjecucion: 2140.2,
  hectareasPropuestasPoligono: 3265.8,
};

// -----------------------------------------------------------------------------
// Distribución por componente (HU-CO-01)
// -----------------------------------------------------------------------------

export const DEMO_COMPONENTES: ComponenteTotal[] = [
  {
    nombre: "C1",
    total: 38,
    linea: 12,
    poligono: 18,
    punto: 8,
    porcentaje: 29,
  },
  {
    nombre: "C2",
    total: 54,
    linea: 22,
    poligono: 24,
    punto: 8,
    porcentaje: 41,
  },
  {
    nombre: "C3",
    total: 40,
    linea: 6,
    poligono: 28,
    punto: 6,
    porcentaje: 30,
  },
];

// -----------------------------------------------------------------------------
// Cobertura vegetal (HU-CO-02)
// -----------------------------------------------------------------------------

export const DEMO_COBERTURA: CoberturaTotal[] = [
  { nombre: "Bosque Natural", area: 38, porcentaje: 38, color: "primary" },
  { nombre: "Vegetación Sec.", area: 24, porcentaje: 24, color: "secondary" },
  { nombre: "Agropecuario", area: 28, porcentaje: 28, color: "tertiary" },
  { nombre: "Otros", area: 10, porcentaje: 10, color: "outline" },
];

// -----------------------------------------------------------------------------
// Intervenciones recientes (HU-CO-01, HU-TC-04)
// -----------------------------------------------------------------------------

export const DEMO_INTERVENCIONES: IntervencionReciente[] = [
  {
    id: 1001,
    tipo: "poligono",
    actividad: "Sistema silvopastoril intensivo",
    nombrePredio: "La Esperanza",
    codigoPredio: "PR-00012",
    municipio: "Guasca",
    componente: "C2",
    accion: "A1",
    hectareas: 24.5,
    longitud: null,
    avance: 100,
    estado: "Finalizada",
  },
  {
    id: 1002,
    tipo: "linea",
    actividad: "Cerca viva multiestrato",
    nombrePredio: "El Edén",
    codigoPredio: "PR-00008",
    municipio: "Guasca",
    componente: "C1",
    accion: "A1",
    hectareas: null,
    longitud: 1.85,
    avance: 75,
    estado: "En ejecución",
  },
  {
    id: 1003,
    tipo: "punto",
    actividad: "Obra de captación",
    nombrePredio: "San Rafael",
    codigoPredio: "PR-00021",
    municipio: "La Calera",
    componente: "C2",
    accion: "A2",
    hectareas: null,
    longitud: null,
    avance: 20,
    estado: "En ejecución",
  },
  {
    id: 1004,
    tipo: "poligono",
    actividad: "Restauración activa",
    nombrePredio: "Las Margaritas",
    codigoPredio: "PR-00033",
    municipio: "Cogua",
    componente: "C1",
    accion: "A2",
    hectareas: 12.8,
    longitud: null,
    avance: 100,
    estado: "Finalizada",
  },
  {
    id: 1005,
    tipo: "linea",
    actividad: "Aislamiento de fuentes",
    nombrePredio: "El Porvenir",
    codigoPredio: "PR-00045",
    municipio: "Sopo",
    componente: "C1",
    accion: "A1",
    hectareas: null,
    longitud: 2.4,
    avance: 75,
    estado: "En ejecución",
  },
  {
    id: 1006,
    tipo: "punto",
    actividad: "Estación limnimétrica",
    nombrePredio: "Quebrada Honda",
    codigoPredio: "PR-00051",
    municipio: "Gachancipa",
    componente: "C2",
    accion: "A2",
    hectareas: null,
    longitud: null,
    avance: 100,
    estado: "Finalizada",
  },
  {
    id: 1007,
    tipo: "poligono",
    actividad: "Plantación forestal protectora",
    nombrePredio: "Vista Hermosa",
    codigoPredio: "PR-00062",
    municipio: "Zipaquirá",
    componente: "C1",
    accion: "A2",
    hectareas: 8.2,
    longitud: null,
    avance: 100,
    estado: "Finalizada",
  },
  {
    id: 1008,
    tipo: "punto",
    actividad: "Bebedero tipo 1",
    nombrePredio: "Los Pinos",
    codigoPredio: "PR-00078",
    municipio: "Tabio",
    componente: "C3",
    accion: "A1",
    hectareas: null,
    longitud: null,
    avance: 20,
    estado: "En ejecución",
  },
];

// -----------------------------------------------------------------------------
// Predios para el mapa (centros sobre municipios reales del convenio)
// -----------------------------------------------------------------------------

export const DEMO_PREDIOS: PredioMini[] = [
  { id: 12, nombre: "La Esperanza", lon: -73.8742, lat: 4.8666 },
  { id: 8, nombre: "El Edén", lon: -73.8802, lat: 4.8732 },
  { id: 21, nombre: "San Rafael", lon: -73.9712, lat: 4.7208 },
  { id: 33, nombre: "Las Margaritas", lon: -73.9783, lat: 5.0642 },
  { id: 45, nombre: "El Porvenir", lon: -73.9418, lat: 4.9077 },
  { id: 51, nombre: "Quebrada Honda", lon: -73.8802, lat: 4.9918 },
  { id: 62, nombre: "Vista Hermosa", lon: -74.0012, lat: 5.0212 },
  { id: 78, nombre: "Los Pinos", lon: -73.9212, lat: 4.9172 },
  { id: 91, nombre: "Alto Viento", lon: -73.8528, lat: 4.8312 },
  { id: 102, nombre: "La Pradera", lon: -73.9102, lat: 4.8542 },
];

// -----------------------------------------------------------------------------
// Quebradas para el mapa (capas hidrografía reales de Cundinamarca)
// -----------------------------------------------------------------------------

export const DEMO_QUEBRADAS = [
  { id: 1, nombre: "Q. La Calera", lon: -73.9712, lat: 4.7208 },
  { id: 2, nombre: "Q. El Salitre", lon: -73.9783, lat: 5.0642 },
  { id: 3, nombre: "Q. Las Delicias", lon: -73.8802, lat: 4.9918 },
  { id: 4, nombre: "Q. Honda", lon: -73.9418, lat: 4.9077 },
  { id: 5, nombre: "Río Frío", lon: -73.9212, lat: 4.9172 },
  { id: 6, nombre: "Río Bogotá Alto", lon: -73.8528, lat: 4.8312 },
  { id: 7, nombre: "Q. Seca", lon: -73.9102, lat: 4.8542 },
];

// -----------------------------------------------------------------------------
// GeoJSON para el mapa de predios
// -----------------------------------------------------------------------------

export const DEMO_PREDIOS_GEOJSON: MapFeatureCollection = {
  type: "FeatureCollection",
  features: DEMO_PREDIOS.map((p): MapFeature => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [p.lon, p.lat] },
    properties: {
      id: p.id,
      nombre: p.nombre,
      codigo: `PR-${String(p.id).padStart(5, "0")}`,
      areaHa: 12 + (p.id % 8) * 3.4,
      componente: ["C1", "C2", "C3"][p.id % 3] ?? "C1",
    },
  })),
};

// -----------------------------------------------------------------------------
// Alertas (panel derecho — placeholder hasta tener tabla real)
// -----------------------------------------------------------------------------

export const DEMO_ALERTAS: Alerta[] = [
  {
    id: 1,
    tipo: "error",
    titulo: "Deforestación Crítica",
    descripcion:
      "Detección de tala ilegal en sector San Rafael, Guasca — pérdida de cobertura boscosa >0.5 ha en 7 días.",
    fecha: "Hoy",
  },
  {
    id: 2,
    tipo: "warning",
    titulo: "Nivel Hídrico Bajo",
    descripcion:
      "Estación hidrométrica Río Negro (Est. 04) reporta caudal 18% bajo el promedio histórico para el mes.",
    fecha: "14/05",
  },
  {
    id: 3,
    tipo: "warning",
    titulo: "Propuestas con Avance Bajo",
    descripcion:
      "3 propuestas de tipo punto en finca El Edén (Guasca) llevan más de 30 días con avance <25%.",
    fecha: "12/05",
  },
  {
    id: 4,
    tipo: "info",
    titulo: "Nueva Fuente Hídrica Registrada",
    descripcion:
      "Se incorporó la quebrada La Parada al inventario — microcuenca Río Bogotá alto, municipio Cogua.",
    fecha: "08/05",
  },
  {
    id: 5,
    tipo: "info",
    titulo: "Reporte Mensual Disponible",
    descripcion:
      "Reporte de monitoreo correspondiente a abril 2026 listo para descarga. 3 predios intervenidos, 2.3 ha.",
    fecha: "01/05",
  },
];

// -----------------------------------------------------------------------------
// Footer KPIs (totales geográficos)
// -----------------------------------------------------------------------------

export const DEMO_FOOTER: FooterKpis = {
  municipios: 116,
  veredas: 1820,
  predios: 2458,
  hectareasIntervenidas: 3265.8,
  quebradas: 2985,
};

// -----------------------------------------------------------------------------
// Top municipios por número de predios (para gráficos de series)
// -----------------------------------------------------------------------------

export const DEMO_TOP_MUNICIPIOS: PredioPorMunicipio[] = [
  {
    id_municipio: 1,
    nombre_municipio: "Guasca",
    predios: 312,
    hectareas: 2480.5,
  },
  {
    id_municipio: 2,
    nombre_municipio: "La Calera",
    predios: 278,
    hectareas: 2150.2,
  },
  {
    id_municipio: 3,
    nombre_municipio: "Cogua",
    predios: 245,
    hectareas: 1920.8,
  },
  {
    id_municipio: 4,
    nombre_municipio: "Sopo",
    predios: 198,
    hectareas: 1640.1,
  },
  {
    id_municipio: 5,
    nombre_municipio: "Tabio",
    predios: 176,
    hectareas: 1410.4,
  },
  {
    id_municipio: 6,
    nombre_municipio: "Zipaquirá",
    predios: 154,
    hectareas: 1280.7,
  },
];

// -----------------------------------------------------------------------------
// Serie temporal por componente (proxy con id_propuesta como eje)
// -----------------------------------------------------------------------------

export const DEMO_SERIES_COMPONENTES: Record<"C1" | "C2" | "C3", SerieTemporal[]> = {
  C1: [
    { etiqueta: "Trim 1", valor: 6.8 },
    { etiqueta: "Trim 2", valor: 13.3 },
    { etiqueta: "Trim 3", valor: 22.8 },
    { etiqueta: "Trim 4", valor: 32.3 },
    { etiqueta: "Acum.", valor: 38 },
  ],
  C2: [
    { etiqueta: "Trim 1", valor: 9.7 },
    { etiqueta: "Trim 2", valor: 18.9 },
    { etiqueta: "Trim 3", valor: 32.4 },
    { etiqueta: "Trim 4", valor: 45.9 },
    { etiqueta: "Acum.", valor: 54 },
  ],
  C3: [
    { etiqueta: "Trim 1", valor: 7.2 },
    { etiqueta: "Trim 2", valor: 14.0 },
    { etiqueta: "Trim 3", valor: 24.0 },
    { etiqueta: "Trim 4", valor: 34.0 },
    { etiqueta: "Acum.", valor: 40 },
  ],
};

// -----------------------------------------------------------------------------
// Metas del convenio (HU-CO-04) — fallback cuando la DB no responde
// -----------------------------------------------------------------------------

export const DEMO_METAS_CONVENIO = {
  c1a1: {
    componente: "C1", accion: "A1",
    descripcion: "Conservación del Recurso Hídrico a través de Medidas de Adaptación al Cambio Climático",
    indicadores: [
      { label: "Cercos vivos", actual: 11.1, meta: 12, unidad: "km", pct: 92 },
      { label: "Aislamientos (cerco de alambre)", actual: 8.9, meta: 12, unidad: "km", pct: 74 },
      { label: "Cercas multiestratificadas (extra)", actual: 0.15, meta: 0, unidad: "km", pct: 0 },
    ],
  },
  c1a2: {
    componente: "C1", accion: "A2",
    descripcion: "Conectividad y reconversión agroforestal",
    indicadores: [
      { label: "Franjas de conectividad", actual: 0, meta: 15, unidad: "ha", pct: 0 },
      { label: "Sistemas silvopastoriles", actual: 6.46, meta: 15, unidad: "ha", pct: 43 },
      { label: "Sistemas agroforestales", actual: 3.17, meta: 15, unidad: "ha", pct: 21 },
    ],
  },
  c2a1: {
    componente: "C2", accion: "A1",
    descripcion: "Manejo del Ciclo del Agua y Restauración de Suelos",
    indicadores: [
      { label: "Cosecha de agua", actual: 79, meta: 79, unidad: "obras", pct: 100 },
      { label: "Kit de compostaje", actual: 79, meta: 79, unidad: "kits", pct: 100 },
    ],
  },
  c2a2: {
    componente: "C2", accion: "A2",
    descripcion: "Estaciones limnimétricas y obras de captación",
    indicadores: [
      { label: "Estaciones limnimétricas", actual: 6, meta: 7, unidad: "estaciones", pct: 86 },
      { label: "Obras de captación", actual: 95, meta: 48, unidad: "obras", pct: 198 },
    ],
  },
  c3: {
    componente: "C3", accion: "*",
    descripcion: "Reconversión Productiva en Áreas Protegidas y Páramos",
    indicadores: [
      { label: "Predios intervenidos en áreas protegidas", actual: 39, meta: 35, unidad: "predios", pct: 111 },
    ],
  },
  municipios_intervenidos: [
    { id_municipio: 1, nombre: "Guatavita", num_propuestas: 120 },
    { id_municipio: 2, nombre: "El Rosal", num_propuestas: 115 },
  ],
  veredas_intervenidas: [
    { id_vereda: 1, nombre: "Aposentos", id_municipio: 1, nombre_municipio: "Guatavita", num_propuestas: 12 },
  ],
};