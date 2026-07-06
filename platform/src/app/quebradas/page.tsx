// =============================================================================
// /quebradas — Listado de quebradas (HU-TC-02)
// Server Component: requiere sesión + lista quebradas + municipio lookup.
// =============================================================================

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Droplet, Search } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-guard";
import { listQuebradasFull, listMunicipios } from "@/lib/repository";
import { QuebradaTable } from "./quebrada-table";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export default async function QuebradasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [params, usuario, quebradas, municipios] = await Promise.all([
    searchParams,
    getCurrentUser(),
    listQuebradasFull(),
    listMunicipios(),
  ]);
  const q = (params.q ?? "").trim().toLowerCase();
  const canEdit = usuario?.rol === "ADMIN" || usuario?.rol === "GESTOR";

  const filtered = q
    ? quebradas.filter(
        (qb) =>
          qb.nombreQuebrada.toLowerCase().includes(q) ||
          String(qb.idQuebrada).includes(q),
      )
    : quebradas;

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-7xl flex-col gap-gutter">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
              <Droplet className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">Quebradas</h1>
              <p className="text-body-sm text-on-surface-variant">
                {quebradas.length} fuentes hídricas en el inventario
              </p>
            </div>
          </div>
          {canEdit && (
            <Link
              href="/quebradas/nuevo"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              + Nueva quebrada
            </Link>
          )}
        </div>

        <Card className="overflow-hidden">
          <form className="relative flex w-full max-w-sm items-center border-b border-outline-variant p-4">
            <Search className="absolute left-7 size-4 text-on-surface-variant" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre o ID…"
              className="pl-9"
            />
          </form>
          <QuebradaTable
            quebradas={filtered}
            municipios={municipios}
            canEdit={canEdit}
          />
        </Card>

        <p className="text-center text-[11px] text-on-surface-variant">
          {canEdit
            ? "Edición disponible — alta, baja y modificación de fuentes hídricas."
            : "Modo lectura: tu rol no permite editar quebradas."}
        </p>
      </div>
    </div>
  );
}
