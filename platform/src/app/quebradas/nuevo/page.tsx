// =============================================================================
// /quebradas/nuevo — Alta de quebrada (HU-TC-02)
// =============================================================================

import Link from "next/link";
import { ArrowLeft, Droplet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/auth-guard";
import { listMunicipios } from "@/lib/repos";
import { crearQuebradaAction } from "../actions";

export const metadata = { title: "Nueva quebrada — SIG TERRITORIO" };

export default async function NuevaQuebradaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; field?: string }>;
}) {
  await requireRole(["ADMIN", "GESTOR"] as const);
  const municipios = await listMunicipios();
  const sp = await searchParams;
  const initialError = sp?.error ? decodeURIComponent(sp.error) : null;

  async function handle(formData: FormData) {
    "use server";
    await crearQuebradaAction(formData);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-gutter">
      <div className="mx-auto flex max-w-3xl flex-col gap-gutter">
        <Link
          href="/quebradas"
          className="inline-flex w-fit items-center gap-2 text-label-lg font-bold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Volver a Quebradas
        </Link>

        <Card className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info">
              <Droplet className="size-6" />
            </div>
            <div>
              <p className="font-mono text-[11px] text-on-surface-variant">NUEVO</p>
              <h1 className="text-2xl font-bold text-on-surface">Registrar quebrada</h1>
              <p className="text-body-sm text-on-surface-variant">
                Inventario de fuentes hídricas. Coordenadas en WGS84 (lon, lat).
              </p>
            </div>
          </div>

          {initialError && (
            <div role="alert" className="mb-4 rounded-lg border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error">
              {initialError}
            </div>
          )}

          <form action={handle} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="md:col-span-2 block">
              <span className="mb-1 block text-label-lg font-medium text-on-surface">Nombre</span>
              <Input name="nombreQuebrada" required minLength={2} maxLength={255} placeholder="Ej: Quebrada La Parada" />
            </label>

            <label className="block">
              <span className="mb-1 block text-label-lg font-medium text-on-surface">Latitud</span>
              <Input name="latitud" type="number" step="0.000001" min={-90} max={90} required placeholder="4.6500" />
            </label>

            <label className="block">
              <span className="mb-1 block text-label-lg font-medium text-on-surface">Longitud</span>
              <Input name="longitud" type="number" step="0.000001" min={-180} max={180} required placeholder="-73.8500" />
            </label>

            <label className="block">
              <span className="mb-1 block text-label-lg font-medium text-on-surface">Área (opcional)</span>
              <Input name="area" type="number" step="0.01" min={0} placeholder="0.00" />
            </label>

            <label className="block">
              <span className="mb-1 block text-label-lg font-medium text-on-surface">Municipio</span>
              <select
                name="idMunicipio"
                defaultValue=""
                className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Ninguno —</option>
                {municipios.map((m) => (
                  <option key={m.idMunicipio} value={m.idMunicipio}>{m.nombreMunicipio}</option>
                ))}
              </select>
            </label>

            <div className="md:col-span-2 flex justify-end gap-2 border-t border-outline-variant pt-4">
              <Button type="button" variant="ghost" asChild>
                <Link href="/quebradas">Cancelar</Link>
              </Button>
              <Button type="submit">Crear quebrada</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
