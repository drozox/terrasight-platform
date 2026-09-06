"use client";

// =============================================================================
// HelpDialog — modal "Ayuda" que se abre desde el botón HelpCircle del TopBar.
//
// El botón HelpCircle del topbar (UX-P3 backlog) era no-op. Ahora abre este
// dialog con:
//  - Información del producto (qué es SIG TERRITORIO, para quién)
//  - Atajos de teclado básicos (búsqueda, navegación sidebar)
//  - Contacto del equipo (mailto)
//
// Patrón: reuse Radix Dialog primitive (mismo que View3DDialog y ConfirmDialog).
// El usuario entiende qué hace el producto + cómo pedir soporte sin necesidad
// de documentación externa.
// =============================================================================

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  HelpCircle,
  Mail,
  ExternalLink,
  Keyboard,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SHORTCUTS = [
  { keys: ["⌘", "K"],   description: "Buscar municipio, vereda o predio" },
  { keys: ["?"],        description: "Abrir este diálogo de ayuda" },
  { keys: ["Esc"],      description: "Cerrar diálogos y modales" },
  { keys: ["←", "→"],   description: "Navegar entre páginas (atrás / adelante)" },
];

const ABOUT_LINKS = [
  {
    label: "Documentación del convenio",
    href: "https://github.com/drozox/terrasight-platform",
    description: "Repositorio, README y notas técnicas",
  },
  {
    label: "Manual de usuario (PDF)",
    href: "mailto:producto@terrasight.local?subject=Solicitar%20manual%20de%20usuario",
    description: "Versión imprimible con flujos paso a paso",
  },
];

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
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
          aria-describedby="help-dialog-desc"
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
              <HelpCircle className="size-6" />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-xl font-bold text-on-surface">
                Ayuda y soporte
              </Dialog.Title>
              <Dialog.Description
                id="help-dialog-desc"
                className="mt-1 text-body-sm text-on-surface-variant"
              >
                SIG TERRITORIO es la plataforma SIG del convenio CAR Cundinamarca –
                WWF – Fundación Natura para monitoreo ambiental y gestión
                territorial. Aquí encuentras cómo usarla y cómo contactarnos.
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

          {/* Acerca de */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-label-lg font-bold uppercase text-on-surface-variant">
              <Sprout className="size-3.5" /> Acerca de
            </h3>
            <div className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-4 text-body-sm text-on-surface">
              <p>
                Monitoreo de predios, quebradas, áreas protegidas y alertas
                ambientales en Cundinamarca. Datos espaciales servidos vía
                PostGIS + GeoJSON y visualizados con Leaflet.
              </p>
            </div>
          </section>

          {/* Atajos de teclado */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-label-lg font-bold uppercase text-on-surface-variant">
              <Keyboard className="size-3.5" /> Atajos de teclado
            </h3>
            <ul className="space-y-1.5">
              {SHORTCUTS.map((s) => (
                <li
                  key={s.description}
                  className="flex items-center justify-between gap-3 rounded-md bg-surface-container-low px-3 py-2 text-body-sm text-on-surface"
                >
                  <span>{s.description}</span>
                  <span className="flex shrink-0 items-center gap-0.5">
                    {s.keys.map((k) => (
                      <kbd
                        key={k}
                        className="rounded border border-outline-variant/60 bg-surface-container-lowest px-1.5 py-0.5 font-mono text-[11px] font-bold text-on-surface-variant"
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Links */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-label-lg font-bold uppercase text-on-surface-variant">
              <ExternalLink className="size-3.5" /> Recursos
            </h3>
            <ul className="space-y-1.5">
              {ABOUT_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="flex flex-col rounded-md bg-surface-container-low px-3 py-2 transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="text-label-lg font-bold text-primary">
                      {link.label}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      {link.description}
                    </span>
                  </a>
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
              href="mailto:soporte@terrasight.local?subject=Soporte%20SIG TERRITORIO&body=Hola%2C%20necesito%20ayuda%20con..."
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-label-lg font-bold text-on-primary transition-[background-color,box-shadow] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
            >
              <Mail className="size-4" />
              Contactar soporte
            </a>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
