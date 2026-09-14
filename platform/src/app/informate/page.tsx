// =============================================================================
// /informate — DEEPSEEK-F5
//
// Página estática que explica el objetivo, contexto, qué encontrarás en la
// plataforma y el detalle del convenio. Redacción de borrador (Pedro revisa).
// =============================================================================

import { Card } from "@/components/ui/card";
import {
  Info,
  Target,
  Globe,
  ListChecks,
  MapPin,
  Wrench,
  Building2,
  FileText,
} from "lucide-react";

export const metadata = {
  title: "Infórmate — SIG TERRITORIO",
  description: "Objetivo, contexto y guía de uso de la plataforma del Convenio 3038-2024 CAR–WWF–Fundación Natura.",
};

export default function InformatePage() {
  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-3xl flex-col gap-gutter">
        <header className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Info className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Infórmate</h1>
            <p className="text-body-sm text-on-surface-variant">
              Qué es SIG TERRITORIO y cómo usar la plataforma.
            </p>
          </div>
        </header>

        {/* Objetivo */}
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <Target className="size-5 text-primary" />
            <h2 className="text-title-lg font-bold text-on-surface">Objetivo</h2>
          </div>
          <p className="text-body-md text-on-surface">
            SIG TERRITORIO es la plataforma de gestión del Convenio 3038-2024
            CAR–WWF–Fundación Natura. Su objetivo es integrar, sistematizar y
            gestionar la información ambiental y territorial de las acciones
            de conservación, restauración, reconversión productiva y manejo
            del recurso hídrico en los predios concertados, como herramienta
            de seguimiento, monitoreo y toma de decisiones.
          </p>
        </Card>

        {/* Contexto */}
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <Globe className="size-5 text-primary" />
            <h2 className="text-title-lg font-bold text-on-surface">Contexto</h2>
          </div>
          <p className="text-body-md text-on-surface">
            El Convenio 3038-2024 entre la CAR Cundinamarca, WWF Colombia y
            Fundación Natura busca consolidar un modelo de gestión territorial
            participativo en cuencas priorizadas del departamento. La plataforma
            sistematiza la información de los predios concertados, las
            intervenciones realizadas y su avance, así como el cumplimiento de
            las metas operativas. La cobertura actual incluye 20 municipios
            del departamento y más de 130 predios con intervenciones activas.
          </p>
        </Card>

        {/* Qué vas a encontrar */}
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <ListChecks className="size-5 text-primary" />
            <h2 className="text-title-lg font-bold text-on-surface">Qué vas a encontrar</h2>
          </div>
          <p className="mb-3 text-body-md text-on-surface">
            La plataforma tiene 5 módulos principales que cumplen los
            objetivos del convenio:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="font-bold text-on-surface">
                  Mapa (visor geográfico)
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  Predios, intervenciones, capas ambientales (bioma, páramo,
                  POMCA, RFP) y herramientas de análisis (medir, identificar,
                  buffer, selección por rectángulo).
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Building2 className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="font-bold text-on-surface">Predios concertados</p>
                <p className="text-body-sm text-on-surface-variant">
                  Ficha con información del propietario, cédula catastral,
                  núcleo predial, área, intervenciones asociadas y análisis
                  ambiental (Fase 6).
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Wrench className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="font-bold text-on-surface">Intervenciones</p>
                <p className="text-body-sm text-on-surface-variant">
                  Listado y ficha de propuestas (punto/línea/polígono), con
                  workflow de aprobación (BORRADOR → EN_REVISIÓN → APROBADA
                  → EN_EJECUCIÓN → FINALIZADA) y registro de alarmas cuando
                  hay problemas que requieren atención.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Target className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="font-bold text-on-surface">Metas del convenio</p>
                <p className="text-body-sm text-on-surface-variant">
                  10 indicadores operativos con su avance vs target y
                  drill-down por municipio para identificar dónde hay que
                  reforzar la implementación.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="font-bold text-on-surface">Reportes</p>
                <p className="text-body-sm text-on-surface-variant">
                  10 reportes operativos (R1–R10) exportables a CSV para
                  alimentar la toma de decisiones y el seguimiento del
                  convenio.
                </p>
              </div>
            </li>
          </ul>
        </Card>

        {/* Estructura del convenio */}
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            <h2 className="text-title-lg font-bold text-on-surface">Estructura del convenio</h2>
          </div>
          <p className="mb-3 text-body-md text-on-surface">
            Las acciones del convenio se organizan en 3 componentes y 5 acciones:
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
              <p className="text-label-lg font-bold text-primary">C1 — Conservación del recurso hídrico</p>
              <ul className="mt-1 ml-4 list-disc text-body-sm text-on-surface-variant">
                <li>C1A1: Cercos vivos + aislamientos (líneas)</li>
                <li>C1A2: Conectividad + silvopastoril + agroforestal (polígonos)</li>
              </ul>
            </div>
            <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
              <p className="text-label-lg font-bold text-secondary">C2 — Manejo integral del agua</p>
              <ul className="mt-1 ml-4 list-disc text-body-sm text-on-surface-variant">
                <li>C2A1: Cosecha de agua + compostaje (puntos)</li>
                <li>C2A2: Estaciones limnimétricas + obras de captación (puntos)</li>
              </ul>
            </div>
            <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-3 sm:col-span-2">
              <p className="text-label-lg font-bold text-tertiary">C3 — Planificación predial</p>
              <ul className="mt-1 ml-4 list-disc text-body-sm text-on-surface-variant">
                <li>C3AU: Predios intervenidos en áreas protegidas (count distinct)</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Convenio + aliados */}
        <Card className="p-6">
          <h2 className="mb-3 text-title-lg font-bold text-on-surface">
            Convenio y aliados
          </h2>
          <p className="text-body-md text-on-surface">
            El Convenio 3038-2024 es una alianza entre tres actores clave para
            la conservación territorial en Cundinamarca:
          </p>
          <ul className="mt-2 space-y-1 text-body-md text-on-surface">
            <li>
              <strong>CAR Cundinamarca</strong> — autoridad ambiental del
              departamento.
            </li>
            <li>
              <strong>WWF Colombia</strong> — organización internacional de
              conservación.
            </li>
            <li>
              <strong>Fundación Natura</strong> — aliado técnico local con
              presencia en las comunidades.
            </li>
          </ul>
        </Card>

        <p className="text-center text-[11px] text-on-surface-variant">
          ¿Dudas o sugerencias? Contacta al equipo del convenio a través del
          módulo de Administración → Usuarios.
        </p>
      </div>
    </div>
  );
}
