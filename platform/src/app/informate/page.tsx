// =============================================================================
// /informate — "Acerca de"
//
// Presenta el objetivo y contexto del Convenio 3038-2024 CAR–WWF–Fundación
// Natura, lo que ofrece la plataforma, y el manual de usuario.
// =============================================================================

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SigTerritorioLogo } from "@/components/icons";
import {
  Info,
  Target,
  Map as MapIcon,
  BarChart3,
  FileText,
  Wrench,
  Download,
  BookOpen,
  Building2,
} from "lucide-react";

export const metadata = {
  title: "Acerca de — SIG TERRITORIO",
  description:
    "Objetivo, contexto y guía de uso de la plataforma del Convenio 3038-2024 CAR–WWF–Fundación Natura.",
};

const QUE_ENCONTRARAS = [
  { emoji: "📊", texto: "Visualizar los predios concertados, las intervenciones realizadas y su avance en el territorio." },
  { emoji: "🗺️", texto: "Explorar el mapa interactivo con capas de predios, quebradas, vías, coberturas vegetales y áreas protegidas." },
  { emoji: "📈", texto: "Monitorear el cumplimiento de las metas del convenio a través de indicadores en tiempo real." },
  { emoji: "📋", texto: "Consultar reportes detallados por componente, acción, municipio y predio." },
  { emoji: "🔧", texto: "Registrar nuevas intervenciones, predios y reportar problemas o necesidades en campo." },
  { emoji: "📥", texto: "Exportar información en formatos CSV, GeoJSON y PDF para análisis externos." },
  { emoji: "📱", texto: "Acceder desde cualquier dispositivo con conexión a internet." },
];

const MODULOS = [
  { icon: MapIcon, titulo: "Mapa interactivo", desc: "Predios, intervenciones y capas ambientales (biomas, páramos, drenajes, vías) con herramientas de análisis (medir, identificar, buffer, selección)." },
  { icon: Building2, titulo: "Predios concertados", desc: "Ficha con propietario, cédula catastral, núcleo predial, área, intervenciones asociadas y análisis ambiental." },
  { icon: Wrench, titulo: "Intervenciones", desc: "Listado y ficha de propuestas (punto/línea/polígono) con workflow de estados y alarmas." },
  { icon: Target, titulo: "Metas del convenio", desc: "Indicadores operativos con su avance vs. meta y drill-down por municipio." },
  { icon: FileText, titulo: "Reportes", desc: "Reportes operativos exportables a CSV para la toma de decisiones y el seguimiento." },
  { icon: BarChart3, titulo: "Monitoreo", desc: "Seguimiento del avance por componente y acción, con alertas de lo que requiere atención." },
];

export default function AcercaDePage() {
  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        {/* Encabezado con marca */}
        <header className="flex items-center gap-5 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <SigTerritorioLogo className="h-12 w-12" />
          </span>
          <div>
            <h1 className="text-[28px] font-semibold leading-tight text-on-surface">Acerca de</h1>
            <p className="mt-1 text-[14px] text-on-surface-variant">
              Qué es SIG Territorio y cómo usar la plataforma del convenio.
            </p>
          </div>
        </header>

        {/* Objetivo y contexto (unificado) */}
        <Card className="rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Info className="size-5" />
            </span>
            <h2 className="text-[20px] font-semibold text-on-surface">Objetivo y contexto</h2>
          </div>
          <p className="text-[15px] leading-relaxed text-on-surface">
            SIG TERRITORIO es la plataforma de gestión del Convenio 3038-2024
            CAR–WWF–Fundación Natura. Su objetivo es integrar, sistematizar y
            gestionar la información ambiental y territorial de las acciones de
            conservación, restauración, reconversión productiva y manejo del
            recurso hídrico en los predios concertados, como herramienta de
            seguimiento, monitoreo y toma de decisiones.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-on-surface">
            El Convenio 3038-2024 entre la CAR Cundinamarca, WWF Colombia y
            Fundación Natura busca consolidar un modelo de gestión territorial
            participativo en cuencas priorizadas del departamento. La plataforma
            sistematiza la información de los predios concertados, las
            intervenciones realizadas y su avance, así como el cumplimiento de
            las metas operativas. La cobertura actual incluye 20 municipios del
            departamento y más de 130 predios con intervenciones activas.
          </p>
        </Card>

        {/* ¿Qué vas a encontrar? */}
        <Card className="rounded-2xl p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <MapIcon className="size-5" />
            </span>
            <h2 className="text-[20px] font-semibold text-on-surface">¿Qué vas a encontrar?</h2>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {QUE_ENCONTRARAS.map((item) => (
              <li
                key={item.texto}
                className="flex items-start gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-4"
              >
                <span className="text-xl leading-none" aria-hidden="true">{item.emoji}</span>
                <span className="text-[14px] leading-snug text-on-surface">{item.texto}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Módulos */}
        <Card className="rounded-2xl p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary/10 text-tertiary">
              <BarChart3 className="size-5" />
            </span>
            <h2 className="text-[20px] font-semibold text-on-surface">Módulos de la plataforma</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULOS.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.titulo} className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-5">
                  <Icon className="size-5 text-primary" />
                  <p className="mt-3 font-semibold text-on-surface">{m.titulo}</p>
                  <p className="mt-1 text-[13px] leading-snug text-on-surface-variant">{m.desc}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Manual de usuario */}
        <Card className="rounded-2xl p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="size-5" />
              </span>
              <div>
                <h2 className="text-[20px] font-semibold text-on-surface">Manual de usuario</h2>
                <p className="mt-1 text-[13px] text-on-surface-variant">
                  Guía paso a paso para usar la plataforma. (Documento en preparación.)
                </p>
              </div>
            </div>
            <Button asChild variant="secondary" className="shrink-0">
              <a href="/manual/manual-usuario-sig-territorio.pdf" download>
                <Download className="size-4" />
                Descargar manual PDF
              </a>
            </Button>
          </div>
        </Card>

        {/* Estructura del convenio */}
        <Card className="rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Target className="size-5" />
            </span>
            <h2 className="text-[20px] font-semibold text-on-surface">Estructura del convenio</h2>
          </div>
          <p className="mb-4 text-[14px] text-on-surface">
            Las acciones del convenio se organizan en 3 componentes y 5 acciones:
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
              <p className="text-[13px] font-bold text-primary">C1 — Conservación del recurso hídrico</p>
              <ul className="mt-2 ml-4 list-disc text-[13px] text-on-surface-variant">
                <li>C1A1: Cercos vivos + aislamientos (líneas)</li>
                <li>C1A2: Conectividad + silvopastoril + agroforestal (polígonos)</li>
              </ul>
            </div>
            <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
              <p className="text-[13px] font-bold text-secondary">C2 — Manejo integral del agua</p>
              <ul className="mt-2 ml-4 list-disc text-[13px] text-on-surface-variant">
                <li>C2A1: Cosecha de agua + compostaje (puntos)</li>
                <li>C2A2: Estaciones limnimétricas + obras de captación (puntos)</li>
              </ul>
            </div>
            <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-4 sm:col-span-2">
              <p className="text-[13px] font-bold text-tertiary">C3 — Planificación predial</p>
              <ul className="mt-2 ml-4 list-disc text-[13px] text-on-surface-variant">
                <li>C3AU: Predios intervenidos en áreas protegidas</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Convenio y aliados */}
        <Card className="rounded-2xl p-6">
          <h2 className="mb-3 text-[20px] font-semibold text-on-surface">Convenio y aliados</h2>
          <p className="text-[14px] text-on-surface">
            El Convenio 3038-2024 es una alianza entre tres actores clave para la
            conservación territorial en Cundinamarca:
          </p>
          <ul className="mt-3 space-y-2 text-[14px] text-on-surface">
            <li><strong>CAR Cundinamarca</strong> — autoridad ambiental del departamento.</li>
            <li><strong>WWF Colombia</strong> — organización internacional de conservación.</li>
            <li><strong>Fundación Natura</strong> — aliado técnico local con presencia en las comunidades.</li>
          </ul>
        </Card>

        <p className="text-center text-[12px] text-on-surface-variant">
          ¿Dudas o sugerencias? Contactá al equipo del convenio a través del módulo
          de Administración → Usuarios.
        </p>
      </div>
    </div>
  );
}
