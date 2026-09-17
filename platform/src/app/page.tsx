import { ImportPanel } from "@/components/dashboard/import-panel";
import { SummaryBar } from "@/components/dashboard/bottom-sections";
import Link from "next/link";
import {
  getDashboardKpis,
  getDashboardKpisComponente,
  getComponentes,
  getFooterKpis,
  getPropuestasPorComponente,
  getAvancePorComponente,
  getResumenComponente,
  listMunicipios,
  listVeredas,
  listPredios,
  pingDb,
} from "@/lib/repos";
import { getCurrentUser } from "@/lib/auth-guard";
import { normalizarAccion, componenteEfectivo } from "@/lib/acciones";
import { DashboardContent } from "./dashboard-suspense";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  componente?: string;
  accion?: string;
  q?: string;
  municipio?: string;
  vereda?: string;
  predio?: string;
}>;

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const accionFiltro = normalizarAccion(params.accion ?? null);
  const componenteFiltro = componenteEfectivo(accionFiltro, params.componente ?? null);
  const queryTexto = params.q ?? "";
  const esImportar = componenteFiltro === "IMPORT";
  const territorio = {
    municipio: params.municipio ?? null,
    vereda: params.vereda ?? null,
    predio: params.predio ?? null,
  };

  // Modo "Importar capa": reemplazamos el cuerpo por el ImportPanel.
  if (esImportar) {
    const [componentes, footer] = await Promise.all([
      getComponentes(),
      getFooterKpis(),
    ]);
    return (
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <div className="border-b border-outline-variant bg-surface-container-lowest px-8 py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-primary hover:underline"
          >
            ← Volver al panel
          </Link>
          <h1 className="mt-2 text-[24px] font-semibold leading-tight text-on-surface">
            Importar capa
          </h1>
        </div>
        <div className="flex flex-1 overflow-y-auto bg-surface-container-low p-gutter">
          <div className="mx-auto w-full max-w-5xl">
            <ImportPanel />
          </div>
        </div>
        <SummaryBar footer={footer!} />
      </div>
    );
  }

  const [
    kpis,
    componentes,
    footerInicial,
    seriesComponentes,
    dbHealth,
    avances,
    resumen,
    usuario,
    municipios,
    veredas,
    predios,
  ] = await Promise.all([
    componenteFiltro || accionFiltro
      ? getDashboardKpisComponente(componenteFiltro, accionFiltro)
      : getDashboardKpis(),
    getComponentes(),
    getFooterKpis(),
    getPropuestasPorComponente(),
    pingDb(),
    getAvancePorComponente(),
    getResumenComponente(componenteFiltro, accionFiltro),
    getCurrentUser(),
    listMunicipios(),
    listVeredas(),
    listPredios(),
  ]);

  const opcionesTerritorio = {
    municipios: municipios.map((m) => ({ idMunicipio: m.idMunicipio, nombre: m.nombreMunicipio })),
    veredas: veredas.map((v) => ({
      idVereda: v.idVereda,
      nombre: v.nombreVereda,
      idMunicipio: v.idMunicipio,
    })),
    predios: predios.map((p) => ({
      idPredio: p.idPredio,
      nombrePredio: p.nombrePredio,
      idVereda: p.idVereda,
    })),
  };

  return (
    <DashboardContent
      componenteFiltro={componenteFiltro}
      accionFiltro={accionFiltro}
      territorio={territorio}
      opcionesTerritorio={opcionesTerritorio}
      usuarioNombre={usuario?.name ?? "usuario"}
      kpis={kpis}
      componentes={componentes}
      footerInicial={footerInicial}
      seriesComponentes={seriesComponentes}
      dbHealth={dbHealth}
      avances={avances}
      resumen={resumen}
    />
  );
}
