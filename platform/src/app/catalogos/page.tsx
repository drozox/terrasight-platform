// =============================================================================
// /catalogos — Hub de catalogos del modelo BDG (HU-TC-03 + HU-TC-06..10)
//
// Server Component: solo ADMIN. Carga:
//   - 2 catalogos principales (componentes + acciones) en paralelo
//   - 5 catalogos secundarios en paralelo (municipios, veredas, propietarios,
//     microcuencas, beneficiarios) para mostrar contadores en las cards
//
// La mitad superior mantiene las 2 tablas CRUD existentes (HU-TC-03). La
// mitad inferior son 5 cards que linkean a sub-paginas (HU-TC-06..10).
// =============================================================================

import Link from "next/link";
import {
  BookMarked, AlertTriangle, Building2, Map, Users,
  Droplet, UserCheck, ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth-guard";
import {
  listComponentesFull,
  listAccionesFull,
  listMunicipiosFull,
  listVeredasFull,
  listPropietariosFull,
  listMicrocuencasFull,
  listBeneficiariosFull,
  COMPONENTES_VALIDOS,
  ACCIONES_VALIDAS,
  type MunicipioFull,
  type VeredaFull,
  type PropietarioFull,
  type MicrocuencaFull,
  type BeneficiarioFull,
} from "@/lib/repository";
import { CatalogosTable } from "./catalogos-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Catálogos — TerraSight" };

export default async function CatalogosPage() {
  await requireAdmin();
  const [
    componentes,
    acciones,
    municipios,
    veredas,
    propietarios,
    microcuencas,
    beneficiarios,
  ] = await Promise.all([
    listComponentesFull(),
    listAccionesFull(),
    listMunicipiosFull(),
    listVeredasFull(),
    listPropietariosFull(),
    listMicrocuencasFull(),
    listBeneficiariosFull(),
  ]);

  const totalPropuestasEnAcciones = acciones.reduce(
    (acc, a) => acc + a.totalPropuestas,
    0,
  );

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-7xl flex-col gap-gutter">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tertiary/10 text-tertiary">
              <BookMarked className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">Catálogos</h1>
              <p className="text-body-sm text-on-surface-variant">
                {componentes.length} componentes · {acciones.length} acciones ·{" "}
                {totalPropuestasEnAcciones} propuesta(s) vinculadas en total.
              </p>
            </div>
          </div>
        </div>

        {/* Aviso de modelo cerrado */}
        <Card className="border-l-4 border-l-tertiary bg-tertiary/5 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 flex-shrink-0 text-tertiary" />
            <div className="text-body-sm text-on-surface">
              <p className="font-semibold">Catálogo cerrado del modelo BDG</p>
              <p className="mt-0.5 text-on-surface-variant">
                Los nombres válidos están restringidos por el modelo:{" "}
                <span className="font-mono font-semibold text-on-surface">
                  {COMPONENTES_VALIDOS.join(", ")}
                </span>{" "}
                para componentes y{" "}
                <span className="font-mono font-semibold text-on-surface">
                  {ACCIONES_VALIDAS.join(", ")}
                </span>{" "}
                para acciones. Cualquier cambio impacta todos los reportes, las
                propuestas y los dashboards del convenio. Usar con precaución.
              </p>
            </div>
          </div>
        </Card>

        {/* Componentes + Acciones (catalogos cerrados del modelo BDG) */}
        <CatalogosTable componentes={componentes} acciones={acciones} />

        {/* Catalogos secundarios: 5 cards linkeando a sub-paginas */}
        <div>
          <h2 className="mb-3 text-base font-bold text-on-surface">
            Catálogos secundarios
          </h2>
          <p className="mb-4 text-body-sm text-on-surface-variant">
            Gestión de las tablas base del modelo territorial. Cada card abre
            su propia vista con CRUD completo y pre-check de dependencias.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <SecundarioCard
              href="/catalogos/municipios"
              title="Municipios"
              description="Entidades territoriales del área de influencia"
              icon={Building2}
              counter={counterMunicipios(municipios)}
            />
            <SecundarioCard
              href="/catalogos/veredas"
              title="Veredas"
              description="División territorial intermedia, agrupada por municipio"
              icon={Map}
              counter={counterVeredas(veredas)}
            />
            <SecundarioCard
              href="/catalogos/propietarios"
              title="Propietarios"
              description="Dueños o razón social de los predios intervenidos"
              icon={Users}
              counter={counterPropietarios(propietarios)}
            />
            <SecundarioCard
              href="/catalogos/microcuencas"
              title="Microcuencas"
              description="Unidades hidrográficas mayores del territorio"
              icon={Droplet}
              counter={counterMicrocuencas(microcuencas)}
            />
            <SecundarioCard
              href="/catalogos/beneficiarios"
              title="Beneficiarios"
              description="Usuarios beneficiarios de las propuestas de tipo punto"
              icon={UserCheck}
              counter={counterBeneficiarios(beneficiarios)}
            />
          </div>
        </div>

        <p className="text-center text-[11px] text-on-surface-variant">
          Solo ADMIN puede modificar catálogos. Las propuestas y reportes
          derivados se actualizan automáticamente al guardar cambios.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// SecundarioCard — sub-componente server para las 5 cards de los catalogos
// secundarios. Server-rendered, no usa estado. Es un Link con todo el estilo.
// =============================================================================
function SecundarioCard({
  href, title, description, icon: Icon, counter,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  counter: string;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="flex h-full flex-col gap-3 p-4 transition-all hover:border-primary hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <ArrowRight className="size-4 text-on-surface-variant transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
        <div>
          <h3 className="text-base font-bold text-on-surface">{title}</h3>
          <p className="mt-0.5 text-[12px] text-on-surface-variant">{description}</p>
        </div>
        <p className="mt-auto text-[11px] font-mono text-on-surface-variant">
          {counter}
        </p>
      </Card>
    </Link>
  );
}

// =============================================================================
// Helpers de KPI: contadores para las cards de catalogos secundarios.
// Sumamos los totalXxx ya calculados por el repository (no hacen SQL extra).
// =============================================================================
function counterMunicipios(rows: MunicipioFull[]): string {
  const veredas = rows.reduce((acc, r) => acc + r.totalVeredas, 0);
  const predios = rows.reduce((acc, r) => acc + r.totalPredios, 0);
  return `${rows.length} municipio(s) · ${veredas} veredas · ${predios} predios linkeados`;
}
function counterVeredas(rows: VeredaFull[]): string {
  const predios = rows.reduce((acc, r) => acc + r.totalPredios, 0);
  const pob = rows.reduce((acc, r) => acc + r.poblacionEstimada, 0);
  return `${rows.length} vereda(s) · ${predios} predios · ${pob.toLocaleString("es-CO")} hab.`;
}
function counterPropietarios(rows: PropietarioFull[]): string {
  const predios = rows.reduce((acc, r) => acc + r.totalPredios, 0);
  return `${rows.length} propietario(s) · ${predios} predios asociados`;
}
function counterMicrocuencas(rows: MicrocuencaFull[]): string {
  const quebradas = rows.reduce((acc, r) => acc + r.totalQuebradas, 0);
  const area = rows.reduce((acc, r) => acc + r.area, 0);
  return `${rows.length} microcuenca(s) · ${quebradas} quebradas · ${area.toLocaleString("es-CO", { maximumFractionDigits: 1 })} ha`;
}
function counterBeneficiarios(rows: BeneficiarioFull[]): string {
  const rel = rows.reduce((acc, r) => acc + r.totalRelaciones, 0);
  return `${rows.length} beneficiario(s) · ${rel} relacion(es) a puntos de monitoreo`;
}
