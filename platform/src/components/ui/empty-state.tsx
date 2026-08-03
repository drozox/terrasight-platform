import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// EmptyState — estado vacio reusable para listas, tablas, secciones.
// UX-67 (audit 2026-07-24): antes los vacios eran <p> centrados con texto
// solo, sin icono ni accion. La skill ui-ux-pro-max recomienda empty states
// con icono + titulo + descripcion + CTA opcional. La presencia de una
// ilustracion/icon reduce la sensacion de "no hay nada" y la convierte en
// "todavia no, pero aca hay un siguiente paso".
//
// Uso:
//   <EmptyState
//     icon={Inbox}
//     title="Sin alertas"
//     description="Cuando se generen alertas del sistema de monitoreo aparecera aca."
//     action={{ label: "Ir al monitoreo", href: "/monitoreo" }}
//   />
// =============================================================================

type Size = "sm" | "md" | "lg";

const SIZE_CLASS: Record<Size, { padding: string; iconBox: string; icon: string; title: string; description: string }> = {
  sm: { padding: "py-6 px-4",  iconBox: "h-10 w-10", icon: "size-5",  title: "text-body-md",  description: "text-body-sm" },
  md: { padding: "py-10 px-6", iconBox: "h-14 w-14", icon: "size-7",  title: "text-title-md", description: "text-body-md" },
  lg: { padding: "py-16 px-8", iconBox: "h-20 w-20", icon: "size-10", title: "text-title-lg", description: "text-body-md" },
};

type Tone = "neutral" | "primary" | "success" | "warning";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-surface-container text-on-surface-variant",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

export type EmptyStateProps = {
  /** Icono principal (Lucide o custom). Si no se pasa, usa Inbox svg. */
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  /** Eyebrow chico arriba del titulo (label-style, uppercase opcional). */
  eyebrow?: string;
  /** Titulo principal, sentence case, accion en infinitivo cuando aplica. */
  title: string;
  /** Descripcion que da contexto. NO incluir comandos ni paths tecnicos. */
  description: string;
  /** Accion opcional. Si pasas href usa <Link>, sino onClick con <button>. */
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** Tamano del bloque. Default "md" — el standard para tables/sections. */
  size?: Size;
  /** Tono del icono. Default "neutral" — no implica accion ni estado. */
  tone?: Tone;
  /** className extra para override de padding/border. */
  className?: string;
};

function DefaultInboxIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </svg>
  );
}

export function EmptyState({
  icon: Icon = DefaultInboxIcon,
  eyebrow,
  title,
  description,
  action,
  size = "md",
  tone = "neutral",
  className,
}: EmptyStateProps) {
  const s = SIZE_CLASS[size];
  const t = TONE_CLASS[tone];

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        s.padding,
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          s.iconBox,
          t,
        )}
        aria-hidden="true"
      >
        <Icon className={s.icon} />
      </div>
      {eyebrow && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
          {eyebrow}
        </p>
      )}
      <h3 className={cn("font-bold text-on-surface", s.title)}>{title}</h3>
      <p className={cn("max-w-sm text-on-surface-variant", s.description)}>
        {description}
      </p>
      {action && (
        action.href ? (
          <a
            href={action.href}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-label-lg font-bold text-on-primary transition-[background-color,color,box-shadow] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
          >
            {action.label}
          </a>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-label-lg font-bold text-on-primary transition-[background-color,color,box-shadow] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
