"use client";

// =============================================================================
// PuntoDetalle — ficha expandible dentro de la tabla de monitoreo.
//
// Renderiza todos los campos del punto + gestión de beneficiarios +
// edición inline (si canEdit). Reusa el patrón Field de intervencion-detail.
// =============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  UserMinus,
  Plus,
  Calendar,
  Hash,
  Layers,
  Wrench,
  Building2,
  MapPin,
  Compass,
  Box,
  FileText,
  Save,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TIPOS_PUNTO,
  TIPO_PUNTO_LABEL,
  TIPO_PUNTO_COLOR,
  isEstadoIntervencion,
  type MonitoreoPunto,
  type BeneficiarioMini,
  type TipoPunto,
  type EstadoIntervencion,
} from "@/lib/repository";
import {
  actualizarPuntoAction,
  asociarBeneficiarioAction,
  desasociarBeneficiarioAction,
  crearBeneficiarioAction,
  getBeneficiariosByPuntoAction,
} from "./actions";

const INPUT_CLS =
  "h-10 w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

const ESTADO_COLOR: Record<EstadoIntervencion, "warning" | "info" | "success"> = {
  Pendiente: "warning",
  "En ejecución": "info",
  Finalizada: "success",
};

type Flash = { tipo: "ok" | "error"; msg: string };

export function PuntoDetalle({
  punto,
  canEdit,
  onClose,
}: {
  punto: MonitoreoPunto;
  canEdit: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [flash, setFlash] = React.useState<Flash | null>(null);

  function showFlash(f: Flash) {
    setFlash(f);
    if (f.tipo === "ok") setTimeout(() => setFlash(null), 3500);
  }

  // Beneficiarios: cargados on-demand cuando se monta la ficha.
  const [actuales, setActuales] = React.useState<BeneficiarioMini[]>([]);
  const [disponibles, setDisponibles] = React.useState<BeneficiarioMini[]>([]);
  const [loadingBenef, setLoadingBenef] = React.useState(true);

  async function refreshBeneficiarios() {
    setLoadingBenef(true);
    try {
      const res = await getBeneficiariosByPuntoAction(punto.idPropPunto);
      if (res.ok) {
        setActuales(res.actuales);
        setDisponibles(res.disponibles);
      } else {
        showFlash({ tipo: "error", msg: res.error });
      }
    } catch (err) {
      showFlash({ tipo: "error", msg: (err as Error).message ?? "No se pudieron cargar los beneficiarios." });
    } finally {
      setLoadingBenef(false);
    }
  }

  React.useEffect(() => {
    void refreshBeneficiarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [punto.idPropPunto]);

  // Sub-estados locales para UI.
  const [editOpen, setEditOpen] = React.useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = React.useState<string>("");
  const [newBenefOpen, setNewBenefOpen] = React.useState(false);

  async function handleSubmitEdicion(fd: FormData) {
    setBusy(true);
    const res = await actualizarPuntoAction(fd);
    if (res.ok) {
      showFlash({ tipo: "ok", msg: res.message });
      setEditOpen(false);
      router.refresh();
    } else {
      showFlash({ tipo: "error", msg: res.message });
    }
    setBusy(false);
  }

  async function handleAsociar(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserToAdd) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("idPropPunto", String(punto.idPropPunto));
    fd.set("idUsuario", selectedUserToAdd);
    const res = await asociarBeneficiarioAction(fd);
    if (res.ok) {
      showFlash({ tipo: "ok", msg: res.message });
      setSelectedUserToAdd("");
      await refreshBeneficiarios();
    } else {
      showFlash({ tipo: "error", msg: res.message });
    }
    setBusy(false);
  }

  async function handleDesasociar(b: BeneficiarioMini) {
    if (!confirm(`¿Quitar a "${b.nombre}" como beneficiario de este punto?`)) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("idPropPunto", String(punto.idPropPunto));
    fd.set("idUsuario", String(b.idUsuario));
    const res = await desasociarBeneficiarioAction(fd);
    if (res.ok) {
      showFlash({ tipo: "ok", msg: res.message });
      await refreshBeneficiarios();
    } else {
      showFlash({ tipo: "error", msg: res.message });
    }
    setBusy(false);
  }

  async function handleSubmitNuevoBenef(fd: FormData) {
    setBusy(true);
    // Paso 1: crear el beneficiario.
    const resCrear = await crearBeneficiarioAction(fd);
    if (!resCrear.ok) {
      showFlash({ tipo: "error", msg: resCrear.message });
      setBusy(false);
      return;
    }
    // Paso 2: asociarlo al punto actual (auto-asociar — el spec dice
    // "llama 2 actions en secuencia").
    if (resCrear.id != null) {
      const fdAso = new FormData();
      fdAso.set("idPropPunto", String(punto.idPropPunto));
      fdAso.set("idUsuario", String(resCrear.id));
      const resAso = await asociarBeneficiarioAction(fdAso);
      if (!resAso.ok) {
        showFlash({
          tipo: "error",
          msg: `Beneficiario creado pero no se pudo asociar: ${resAso.message}`,
        });
        setBusy(false);
        return;
      }
    }
    showFlash({ tipo: "ok", msg: "Beneficiario creado y asociado." });
    setNewBenefOpen(false);
    await refreshBeneficiarios();
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      {/* Flash */}
      {flash && (
        <div
          role="status"
          className={
            flash.tipo === "ok"
              ? "flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-body-sm text-primary"
              : "flex items-start gap-2 rounded-lg border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error"
          }
        >
          {flash.tipo === "ok"
            ? <CheckCircle2 className="mt-0.5 size-4 flex-shrink-0" />
            : <AlertCircle className="mt-0.5 size-4 flex-shrink-0" />}
          <span>{flash.msg}</span>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge variant={TIPO_PUNTO_COLOR[punto.tipoPunto]}>
              {TIPO_PUNTO_LABEL[punto.tipoPunto]}
            </Badge>
            {isEstadoIntervencion(punto.estadoPropuesta) && (
              <Badge variant={ESTADO_COLOR[punto.estadoPropuesta]}>
                {punto.estadoPropuesta}
              </Badge>
            )}
            <span className="font-mono text-[11px] text-on-surface-variant">
              #{punto.idPropPunto} · propuesta #{punto.idPropuesta}
            </span>
          </div>
          <h3 className="text-base font-bold text-on-surface">{punto.actividad}</h3>
          {punto.descripcion && (
            <p className="mt-1 text-body-sm text-on-surface-variant">{punto.descripcion}</p>
          )}
        </div>
        <div className="flex gap-2">
          {canEdit && !editOpen && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditOpen(true)}
              disabled={busy}
            >
              <Pencil className="size-3.5" />
              Editar atributos
            </Button>
          )}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface"
            title="Cerrar ficha"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Edición inline */}
      {editOpen && canEdit ? (
        <EditPuntoForm
          punto={punto}
          busy={busy}
          onCancel={() => setEditOpen(false)}
          onSubmit={handleSubmitEdicion}
        />
      ) : (
        <>
          {/* Grid de campos */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Componente" icon={<Layers className="size-3.5" />}>
              <Badge variant={punto.nombreComponente === "C1" ? "primary" : punto.nombreComponente === "C2" ? "secondary" : "tertiary"}>
                {punto.nombreComponente}
              </Badge>
              <span className="ml-2 font-normal text-on-surface-variant">
                · {punto.nombreAccion}
              </span>
            </Field>
            <Field label="Predio" icon={<Building2 className="size-3.5" />}>
              <a
                href={`/predios/${punto.idPredio}`}
                className="text-primary hover:underline"
              >
                <span className="font-mono">{punto.codigoPredio}</span>
              </a>
              <span className="ml-2 font-normal text-on-surface-variant">
                {punto.nombrePredio}
              </span>
            </Field>
            <Field label="Municipio / Vereda" icon={<MapPin className="size-3.5" />}>
              {punto.nombreMunicipio ?? "—"}
              {punto.nombreVereda && (
                <span className="ml-1 font-normal text-on-surface-variant">
                  / {punto.nombreVereda}
                </span>
              )}
            </Field>

            <Field label="Coordenadas planas" icon={<Compass className="size-3.5" />}>
              <span className="font-mono text-[12px]">
                E {punto.este.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
              </span>
              <span className="ml-3 font-mono text-[12px]">
                N {punto.norte.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
              </span>
            </Field>
            <Field label="Coordenadas geográficas" icon={<Compass className="size-3.5" />}>
              {punto.lat !== null && punto.lon !== null ? (
                <span className="font-mono text-[12px]">
                  {punto.lat.toFixed(4)}, {punto.lon.toFixed(4)}
                </span>
              ) : (
                <span className="font-normal text-on-surface-variant">—</span>
              )}
            </Field>
            <Field label="Tipo de obra" icon={<Wrench className="size-3.5" />}>
              #{punto.tipoObra}
            </Field>

            <Field label="Estructura de anclaje" icon={<Box className="size-3.5" />}>
              {punto.estructuraAnclaje ? "Sí" : "No"}
            </Field>
            <Field label="Nivel de complejidad" icon={<Layers className="size-3.5" />}>
              {punto.nivelComplejidad || "—"}
            </Field>
            <Field label="Códigos" icon={<Hash className="size-3.5" />}>
              <span className="font-mono text-[12px]">tipo: {punto.codTipo || "—"}</span>
              <span className="ml-2 font-mono text-[12px]">caj: {punto.codigoCaj || "—"}</span>
              <span className="ml-2 font-mono text-[12px]">est: {punto.idEstacionOriginal || "—"}</span>
            </Field>

            <Field label="Quebrada" icon={<MapPin className="size-3.5" />}>
              {punto.nombreQuebrada ? (
                punto.idQuebrada ? (
                  <a
                    href={`/quebradas/${punto.idQuebrada}`}
                    className="text-secondary hover:underline"
                  >
                    {punto.nombreQuebrada}
                  </a>
                ) : (
                  punto.nombreQuebrada
                )
              ) : (
                <span className="font-normal text-on-surface-variant">—</span>
              )}
            </Field>
            <Field label="Creado" icon={<Calendar className="size-3.5" />}>
              <span className="text-[12px] font-normal text-on-surface-variant">
                {punto.createdAt ? punto.createdAt.toLocaleString("es-CO") : "—"}
              </span>
            </Field>
            <Field label="Actualizado" icon={<Calendar className="size-3.5" />}>
              <span className="text-[12px] font-normal text-on-surface-variant">
                {punto.updatedAt ? punto.updatedAt.toLocaleString("es-CO") : "—"}
              </span>
            </Field>
          </div>

          {/* Beneficiarios */}
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="size-4 text-primary" />
                <h4 className="text-sm font-bold text-on-surface">
                  Beneficiarios ({actuales.length})
                </h4>
              </div>
              {canEdit && !newBenefOpen && (
                <button
                  onClick={() => setNewBenefOpen(true)}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-md border border-outline-variant bg-surface-container-highest px-2 py-1 text-[11px] font-semibold text-on-surface hover:bg-surface-variant/40 disabled:opacity-50"
                >
                  <Plus className="size-3" />
                  Nuevo beneficiario
                </button>
              )}
            </div>

            {loadingBenef ? (
              <p className="flex items-center gap-2 py-2 text-[12px] text-on-surface-variant">
                <Loader2 className="size-3 animate-spin" />
                Cargando beneficiarios…
              </p>
            ) : actuales.length === 0 ? (
              <p className="py-2 text-[12px] text-on-surface-variant">
                Sin beneficiarios asociados.
              </p>
            ) : (
              <ul className="space-y-1">
                {actuales.map((b) => (
                  <li
                    key={b.idUsuario}
                    className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-[12px]"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-on-surface">{b.nombre}</p>
                      <p className="text-[10px] text-on-surface-variant">
                        {b.telefono || "—"}
                        {b.vereda && ` · ${b.vereda}`}
                        {b.municipio && ` · ${b.municipio}`}
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleDesasociar(b)}
                        disabled={busy}
                        title="Quitar beneficiario"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-error/70 hover:bg-error/10 hover:text-error disabled:opacity-50"
                      >
                        <UserMinus className="size-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Form para nuevo beneficiario (alta rápida) */}
            {newBenefOpen && canEdit && (
              <form
                action={handleSubmitNuevoBenef}
                className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 md:grid-cols-4"
              >
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">
                    Nombre
                  </span>
                  <input
                    name="nombre"
                    required
                    minLength={2}
                    maxLength={200}
                    className={INPUT_CLS}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">
                    Teléfono
                  </span>
                  <input
                    name="telefono"
                    minLength={7}
                    maxLength={20}
                    className={INPUT_CLS}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">
                    Vereda
                  </span>
                  <input
                    name="vereda"
                    maxLength={200}
                    className={INPUT_CLS}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">
                    Municipio
                  </span>
                  <input
                    name="municipio"
                    maxLength={200}
                    className={INPUT_CLS}
                  />
                </label>
                <div className="md:col-span-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setNewBenefOpen(false)}
                    disabled={busy}
                    className="h-9 rounded-lg border border-outline-variant px-3 text-sm font-semibold hover:bg-surface-variant/40 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50"
                  >
                    {busy && <Loader2 className="size-3.5 animate-spin" />}
                    Crear y asociar
                  </button>
                </div>
              </form>
            )}

            {/* Selector de beneficiario existente */}
            {canEdit && disponibles.length > 0 && !newBenefOpen && (
              <form
                onSubmit={handleAsociar}
                className="mt-3 flex flex-col gap-2 rounded-lg border border-outline-variant/60 bg-surface-container-low p-3 md:flex-row md:items-end"
              >
                <label className="block flex-1">
                  <span className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">
                    Agregar beneficiario existente
                  </span>
                  <select
                    value={selectedUserToAdd}
                    onChange={(e) => setSelectedUserToAdd(e.target.value)}
                    className={INPUT_CLS}
                  >
                    <option value="">— Seleccionar —</option>
                    {disponibles.map((d) => (
                      <option key={d.idUsuario} value={d.idUsuario}>
                        {d.nombre} {d.municipio && `(${d.municipio})`}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={busy || !selectedUserToAdd}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-all hover:bg-primary/90 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                  Agregar
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// Field — label + value, con icono opcional. Mismo patrón que intervencion-detail.
// =============================================================================
function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase text-on-surface-variant">
        {icon}
        {label}
      </p>
      <p className="font-bold text-on-surface">{children}</p>
    </div>
  );
}

// =============================================================================
// EditPuntoForm — form inline de edición de atributos del punto.
// tipoObra es required (1..3) según el CHECK constraint de la BD.
// =============================================================================
function EditPuntoForm({
  punto,
  busy,
  onCancel,
  onSubmit,
}: {
  punto: MonitoreoPunto;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <form
      action={onSubmit}
      className="grid grid-cols-1 gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-3 md:grid-cols-2 lg:grid-cols-3"
    >
      <input type="hidden" name="idPropPunto" value={punto.idPropPunto} />

      <label className="md:col-span-2 lg:col-span-3 block">
        <span className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-on-surface-variant">
          <FileText className="size-3.5" /> Actividad
        </span>
        <input
          name="actividad"
          required
          minLength={2}
          maxLength={255}
          defaultValue={punto.actividad}
          className={INPUT_CLS}
        />
      </label>

      <label className="md:col-span-2 lg:col-span-3 block">
        <span className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">
          Descripción
        </span>
        <textarea
          name="descripcion"
          maxLength={2000}
          defaultValue={punto.descripcion}
          rows={2}
          className="w-full rounded-lg border border-outline-variant bg-surface-container-highest px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">
          Tipo de punto
        </span>
        <select
          name="tipoPunto"
          required
          defaultValue={punto.tipoPunto}
          className={INPUT_CLS}
        >
          {TIPOS_PUNTO.map((t: TipoPunto) => (
            <option key={t} value={t}>
              {TIPO_PUNTO_LABEL[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">
          Tipo de obra (1-3)
        </span>
        <select
          name="tipoObra"
          required
          defaultValue={punto.tipoObra}
          className={INPUT_CLS}
        >
          <option value="1">1 — Captación</option>
          <option value="2">2 — Almacenamiento</option>
          <option value="3">3 — Distribución</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">
          Nivel de complejidad
        </span>
        <input
          name="nivelComplejidad"
          maxLength={50}
          defaultValue={punto.nivelComplejidad}
          className={INPUT_CLS}
        />
      </label>

      <label className="flex items-center gap-2 self-end pb-2 md:col-span-3">
        <input
          type="checkbox"
          name="estructuraAnclaje"
          defaultChecked={punto.estructuraAnclaje}
          value="on"
          className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
        />
        <span className="text-body-sm text-on-surface">Estructura de anclaje</span>
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">
          ID estación original
        </span>
        <input
          name="idEstacionOriginal"
          maxLength={50}
          defaultValue={punto.idEstacionOriginal}
          className={INPUT_CLS}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">
          Código tipo
        </span>
        <input
          name="codTipo"
          maxLength={50}
          defaultValue={punto.codTipo}
          className={INPUT_CLS}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant">
          Código CAJ
        </span>
        <input
          name="codigoCaj"
          maxLength={50}
          defaultValue={punto.codigoCaj}
          className={INPUT_CLS}
        />
      </label>

      <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="h-9 rounded-lg border border-outline-variant px-4 text-sm font-semibold hover:bg-surface-variant/40 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar
        </button>
      </div>
    </form>
  );
}
