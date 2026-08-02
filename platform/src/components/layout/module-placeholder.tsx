import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, MessageCircle } from "lucide-react";

export function ModulePlaceholder({
  title,
  description,
  Icon,
}: {
  title: string;
  description: string;
  Icon: LucideIcon;
}) {
  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto bg-surface-container-low p-gutter">
      <div className="flex max-w-xl flex-col items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-10 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-7" />
        </div>
        <h2 className="text-2xl font-bold text-on-surface">{title}</h2>
        <p className="text-body-md text-on-surface-variant">{description}</p>
        {/* UX-15/UX-62 (audit 2026-07-24): antes solo decia 'Proxima fase'
           sin contexto. Ahora un pill con timeframe vago (no comprometemos
           fecha) + un CTA de feedback al equipo de producto. Asi el usuario
           puede votar por esta feature o pedir mas prioridad. */}
        <span className="inline-flex items-center gap-2 rounded-full bg-tertiary-container/40 px-3 py-1 text-[11px] font-bold uppercase text-tertiary">
          Próxima fase · roadmap
        </span>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-label-lg text-primary hover:underline"
          >
            <ArrowLeft className="size-4" />
            Volver al dashboard
          </Link>
          <a
            href="mailto:producto@terrasight.local?subject=Solicitar%20modulo%3A%20"
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant px-3 py-1.5 text-label-lg text-on-surface-variant transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
          >
            <MessageCircle className="size-3.5" />
            Pedir esta función
          </a>
        </div>
      </div>
    </div>
  );
}
