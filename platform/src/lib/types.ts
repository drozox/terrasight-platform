// =============================================================================
// Tipos compartidos entre repositorio y componentes
// =============================================================================

export interface DashboardKpis {
  predios: number;
  propuestas: number;
  propuestasEjecucion: number;
  hectareasPredios: number;
  hectareasPropuestas: number;
  hectareasPropuestasEjecucion: number;
  hectareasPropuestasPoligono: number;
}

export interface ComponenteTotal {
  nombre: string; // "C1" | "C2" | "C3"
  total: number;
  linea: number;
  poligono: number;
  punto: number;
  porcentaje: number;
}

export interface CoberturaTotal {
  nombre: string;
  area: number;
  porcentaje: number;
  color: "primary" | "secondary" | "tertiary" | "outline";
}

export interface IntervencionReciente {
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
  estado: "En ejecución" | "Finalizada" | "Pendiente";
}

export interface Alerta {
  id: number;
  tipo: "error" | "warning" | "info";
  titulo: string;
  descripcion: string;
  fecha: string;
}

export interface FooterKpis {
  municipios: number;
  veredas: number;
  predios: number;
  hectareasIntervenidas: number;
  quebradas: number;
}

export interface MapProperties {
  id: number;
  nombre: string;
  codigo: string;
  areaHa: number;
  componente: string;
}

export interface MapFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: MapProperties;
}

export interface MapFeatureCollection {
  type: "FeatureCollection";
  features: MapFeature[];
}

export interface PredioMini {
  id: number;
  nombre: string;
  lon: number;
  lat: number;
}

export interface PredioPorMunicipio {
  id_municipio: number;
  nombre_municipio: string;
  predios: number;
  hectareas: number;
}

export interface SerieTemporal {
  etiqueta: string;          // "2024", "Q1 2025", "Bosque Natural", "La Calera"
  valor: number;
}
