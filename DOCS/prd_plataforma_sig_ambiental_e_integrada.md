# Documento de Requisitos del Proyecto (PRD): Plataforma SIG Ambiental e Integrada

## 1. Visión General del Proyecto
Desarrollar una plataforma de Sistema de Información Geográfica (SIG) avanzada para el monitoreo ambiental y la gestión territorial en el departamento de Cundinamarca, Colombia. La herramienta facilita la supervisión de intervenciones ambientales, la gestión de predios y el análisis de datos geoespaciales para entidades como WWF, CAR y la Fundación Natura.

## 2. Objetivos Estratégicos
*   **Monitoreo en Tiempo Real:** Visualizar el avance de proyectos de restauración ecológica, cercos vivos y sistemas agroforestales.
*   **Gestión Territorial:** Centralizar la información de predios concertados y zonificación predial.
*   **Análisis Geoespacial:** Proporcionar herramientas de mapeo 2D/3D para la toma de decisiones basada en datos geográficos.
*   **Transparencia y Reporte:** Generar indicadores claros sobre hectáreas intervenidas, municipios impactados y fuentes hídricas monitoreadas.

## 3. Perfiles de Usuario
*   **Administrador del Sistema:** Gestión de usuarios, configuración de capas y supervisión global (Ej: Ana María).
*   **Analista Ambiental:** Consulta de datos técnicos, generación de reportes y análisis de alertas de deforestación.
*   **Gestor de Campo:** Actualización de estados de intervención y carga de datos de monitoreo.

## 4. Funcionalidades Principales

### 4.1. Dashboard de Control
*   **Indicadores Clave (KPIs):** Visualización de Predios Concertados, Intervenciones Realizadas, Hectáreas Intervenidas y Municipios Activos.
*   **Distribución por Componentes:** Gráficos de desglose para Componente 1 (Recurso hídrico), Componente 2 (Suelos) y Componente 3 (Participación predial).
*   **Alertas y Notificaciones:** Panel de avisos críticos (deforestación, niveles de estaciones hidrométricas).

### 4.2. Visor Geográfico (Mapa)
*   **Gestión de Capas:** Control de límites administrativos, hidrografía, áreas protegidas, cobertura vegetal y uso del suelo.
*   **Herramientas de Mapa:** Medición, dibujo, búsqueda de predios, zoom y cambio de vista (Callejero/Satélite/3D).
*   **Filtros Territoriales:** Segmentación por Departamento, Municipio, Vereda y Predio.

### 4.3. Módulo de Monitoreo de Intervenciones
*   **Tabla de Seguimiento:** Listado detallado con tipo de intervención, código de predio, ubicación, estado (En ejecución/Finalizada), porcentaje de avance y fecha.

## 5. Especificaciones de Diseño
*   **Tema Principal:** "TerraSight Intelligence" (Modo Claro).
*   **Paleta de Colores:** Verdes institucionales (#27ae60), azules profundos para agua, y superficies limpias (grises claros y blanco).
*   **Tipografía:** Hanken Grotesk (Moderna y legible para datos densos).
*   **Identidad Visual:** Integración de logos de WWF, CAR, Fundación Natura y marca regional (Cundinamarca).

## 6. Stack Tecnológico (Propuesto)
*   **Frontend:** HTML5, Tailwind CSS, JavaScript (React/Vue).
*   **Mapas:** Mapbox GL JS o ArcGIS API for JavaScript.
*   **Visualización de Datos:** Chart.js o D3.js para gráficos dinámicos.
