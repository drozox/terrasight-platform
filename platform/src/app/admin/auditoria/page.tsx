// =============================================================================
// Página /admin/auditoria (HU-AD-04) — solo ADMIN.
// Tabla paginada con filtros básicos vía searchParams.
// =============================================================================

import Link from "next/link";
import { ShieldAlert, ShieldCheck, Lock, LogIn, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guard";
import {
  listAuditEventos,
  listEventTypes,
} from "@/lib/repos";
import type { AuditEvento, AuditFiltros } from "@/lib/types";

export const metadata = { title: "Auditoría de accesos — TerraSight" };

const PAGE_SIZE = 50;

function isEvento(s: string | undefined): s is AuditEvento {
  return (
    s === "LOGIN_OK" ||
    s === "LOGIN_FAIL" ||
    s === "LOGOUT" ||
    s === "ACCESS_DENY" ||
    s === "ACCOUNT_LOCKED"
  );
}

function EventoIcon({ evento }: { evento: AuditEvento }) {
  if (evento === "LOGIN_OK")        return <LogIn       className="size-4 text-primary" />;
  if (evento === "LOGOUT")          return <LogOut      className="size-4 text-on-surface-variant" />;
  if (evento === "ACCESS_DENY")     return <ShieldAlert className="size-4 text-warning" />;
  if (evento === "ACCOUNT_LOCKED")  return <Lock        className="size-4 text-error" />;
  return                                       <ShieldCheck className="size-4 text-error" />; // LOGIN_FAIL
}

function EventoBadge({ evento }: { evento: AuditEvento }) {
  const styles: Record<AuditEvento, string> = {
    LOGIN_OK:       "bg-primary/10 text-primary",
    LOGIN_FAIL:     "bg-error/10  text-error",
    LOGOUT:         "bg-surface-variant/40 text-on-surface-variant",
    ACCESS_DENY:    "bg-warning/10 text-warning",
    ACCOUNT_LOCKED: "bg-error/15  text-error ring-1 ring-error/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[evento]}`}>
      <EventoIcon evento={evento} />
      {evento}
    </span>
  );
}

function fmtFechaHora(d: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(d);
}

export default async function AdminAuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    evento?: string;
    idUsuario?: string;
    email?: string;
    page?: string;
  }>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const page = Math.max(0, Number(sp?.page ?? "0") || 0);
  const filtros: AuditFiltros = {
    evento:    isEvento(sp?.evento) ? sp.evento : null,
    idUsuario: sp?.idUsuario ? Number(sp.idUsuario) : null,
    emailLike: sp?.email?.trim() || null,
    limit:     PAGE_SIZE,
    offset:    page * PAGE_SIZE,
  };

  const [{ rows: eventos, total }, tipos] = await Promise.all([
    listAuditEventos(filtros),
    listEventTypes(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Construir search string preservando filtros actuales al cambiar página
  function buildHref(overrides: Record<string, string | number | undefined>) {
    const params = new URLSearchParams();
    if (filtros.evento)    params.set("evento", filtros.evento);
    if (filtros.idUsuario) params.set("idUsuario", String(filtros.idUsuario));
    if (filtros.emailLike) params.set("email", filtros.emailLike);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `/admin/auditoria?${qs}` : "/admin/auditoria";
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-surface-container-lowest px-margin-edge py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Auditoría de accesos</h1>
          <p className="text-body-sm text-on-surface-variant">
            Eventos de autenticación y denegaciones. {total.toLocaleString("es-CO")} registros en total.
          </p>
        </div>
        <Link
          href="/admin/usuarios"
          className="text-label-lg font-semibold text-primary hover:underline"
        >
          ← Gestión de usuarios
        </Link>
      </header>

      {/* Filtros */}
      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">Evento</span>
          <select
            name="evento"
            defaultValue={filtros.evento ?? ""}
            className="h-10 rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">— Todos —</option>
            {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">Email contiene</span>
          <input
            name="email"
            defaultValue={filtros.emailLike ?? ""}
            placeholder="ejemplo@car.gov.co"
            className="h-10 rounded-lg border border-outline-variant bg-surface-container-highest px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <button
          type="submit"
          className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary/90"
        >
          Aplicar filtros
        </button>
        <Link
          href="/admin/auditoria"
          className="h-10 rounded-lg border border-outline-variant px-4 text-sm font-semibold text-on-surface hover:bg-surface-variant/40 flex items-center"
        >
          Limpiar
        </Link>
      </form>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low text-[11px] uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Evento</th>
              <th className="px-4 py-3 font-semibold">Usuario</th>
              <th className="px-4 py-3 font-semibold">Recurso</th>
              <th className="px-4 py-3 font-semibold">IP</th>
              <th className="px-4 py-3 font-semibold">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {eventos.map((e) => (
              <tr key={e.idEvento} className="hover:bg-surface-container-low/40">
                <td className="whitespace-nowrap px-4 py-3 text-[12px] text-on-surface-variant">
                  {fmtFechaHora(e.ocurridoEn)}
                </td>
                <td className="px-4 py-3"><EventoBadge evento={e.evento} /></td>
                <td className="px-4 py-3">
                  {e.nombreUsuario ? (
                    <div>
                      <p className="text-on-surface">{e.nombreUsuario}</p>
                      <p className="font-mono text-[11px] text-on-surface-variant">{e.emailUsado}</p>
                    </div>
                  ) : (
                    <span className="font-mono text-[12px] text-on-surface-variant">
                      {e.emailUsado ?? "—"}
                    </span>
                  )}
                </td>
                <td className="max-w-xs truncate px-4 py-3 font-mono text-[11px] text-on-surface-variant" title={e.recurso ?? undefined}>
                  {e.recurso ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-on-surface-variant">{e.ip ?? "—"}</td>
                <td className="max-w-sm truncate px-4 py-3 text-[12px] text-on-surface-variant" title={e.detalle ?? undefined}>
                  {e.detalle ?? "—"}
                </td>
              </tr>
            ))}
            {eventos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                  No hay eventos que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <nav className="mt-4 flex items-center justify-between">
        <p className="text-[11px] text-on-surface-variant">
          Página {page + 1} de {totalPages} · mostrando {eventos.length} de {total}
        </p>
        <div className="flex gap-1">
          <Link
            aria-disabled={page === 0}
            href={page > 0 ? buildHref({ page: page - 1 }) : "/admin/auditoria"}
            className={
              page === 0
                ? "pointer-events-none flex h-9 items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-low px-3 text-[12px] font-semibold text-on-surface-variant/40"
                : "flex h-9 items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-low px-3 text-[12px] font-semibold text-on-surface hover:bg-surface-variant/40"
            }
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Link>
          <Link
            aria-disabled={page >= totalPages - 1}
            href={page < totalPages - 1 ? buildHref({ page: page + 1 }) : "/admin/auditoria"}
            className={
              page >= totalPages - 1
                ? "pointer-events-none flex h-9 items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-low px-3 text-[12px] font-semibold text-on-surface-variant/40"
                : "flex h-9 items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-low px-3 text-[12px] font-semibold text-on-surface hover:bg-surface-variant/40"
            }
          >
            Siguiente
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </nav>
    </div>
  );
}
