"use client";

// =============================================================================
// BookmarksDialog — modal "Marcadores guardados" (próximamente).
//
// El botón Bookmark del MapSearchBar (UX-P3 backlog) era no-op. Ahora abre
// este dialog que muestra:
//  - Estado vacío (no hay marcadores guardados)
//  - Preview de cómo se verá la lista cuando esté implementada
//  - Features que vendrán (sincronización entre dispositivos, compartir con
//    equipo, exportar a KML/GeoJSON)
//  - CTA "Pedir esta función" (mailto)
//
// Patrón: reuse Radix Dialog + EmptyState visual. Reemplaza a un botón
// decorativo / disabled por un flujo honesto ("sé que está vacío, esto es
// lo que va a venir").
// =============================================================================

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Bookmark,
  MapPin,
  Share2,
  Download,
  Mail,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BookmarksDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PREVIEW_BOOKMARKS = [
  { nombre: "PNN Chingaza · Sector Centro",   coords: "4.45°N, 73.65°W",  when: "Hace 2 días" },
  { nombre: "Vereda El Salitre · Predio #14", coords: "4.92°N, 73.93°W", when: "Hace 1 semana" },
  { nombre: "Río Bogotá · Km 32",             coords: "4.78°N, 74.10°W", when: "Hace 2 semanas" },
];

const COMING_FEATURES = [
  { icon: MapPin,   text: "Guarda la vista actual con un nombre (centro, zoom, capas activas)" },
  { icon: Share2,   text: "Comparte marcadores con tu equipo vía link seguro" },
  { icon: Download, text: "Exporta marcadores a KML o GeoJSON para usar en QGIS" },
  { icon: Clock,    text: "Historial de las últimas 10 vistas con timestamp" },
];

export function BookmarksDialog({ open, onOpenChange }: BookmarksDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-surface/80 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        />
        <Dialog.Content
          aria-describedby="bookmarks-dialog-desc"
          className={cn(
            "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
            "gap-5 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          )}
        >
          {/* Header */}
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <Bookmark className="size-6" />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-xl font-bold text-on-surface">
                Marcadores guardados · Próxima fase
              </Dialog.Title>
              <Dialog.Description
                id="bookmarks-dialog-desc"
                className="mt-1 text-body-sm text-on-surface-variant"
              >
                Guarda vistas del mapa (centro, zoom, capas activas) con un
                nombre y recárgalas desde cualquier dispositivo. En desarrollo.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Cerrar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Estado vacío + preview */}
          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Vista previa (sin datos aún)
            </p>
            <div className="overflow-hidden rounded-xl border border-dashed border-outline-variant/50">
              {PREVIEW_BOOKMARKS.map((b, i) => (
                <div
                  key={b.nombre}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-body-sm",
                    i > 0 && "border-t border-outline-variant/30",
                  )}
                >
                  <MapPin className="size-4 shrink-0 text-on-surface-variant" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-on-surface">{b.nombre}</p>
                    <p className="font-mono text-[11px] text-on-surface-variant">
                      {b.coords} · {b.when}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-on-surface-variant">
              Cuando esté implementado, tus marcadores aparecerán aquí.
            </p>
          </section>

          {/* Features */}
          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Features incluidas
            </p>
            <ul className="space-y-1.5">
              {COMING_FEATURES.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex items-center gap-2 text-body-sm text-on-surface"
                >
                  <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button type="button" variant="outline">
                Cerrar
              </Button>
            </Dialog.Close>
            <a
              href="mailto:producto@terrasight.local?subject=Solicitar%20marcadores%20guardados&body=Hola%2C%20me%20interesar%C3%ADa%20tener%20marcadores%20guardados%20en%20el%20mapa"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-label-lg font-bold text-on-primary transition-[background-color,box-shadow] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
            >
              <Mail className="size-4" />
              Pedir esta función
            </a>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
