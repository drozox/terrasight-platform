"use client";

// =============================================================================
// View3DDialog — modal "Coming soon" para el botón 3D del search bar.
//
// El botón "3D · pronto" del MapSearchBar (UX-27/57) abría un alert nativo
// o no hacia nada. Ahora abre este dialog que muestra:
//  - Screenshot del mockup del Stitch (style guide de referencia)
//  - Lista de features que vendran en la vista 3D
//  - CTA "Pedir acceso anticipado" (mailto) — feedback al equipo
//
// Patrón: reuse del UI dialog primitive + tomografia visual del diseno
// target (sin prometer fecha). Cuando se implemente la vista 3D real,
// este dialog se reemplaza por el componente del mapa 3D (cesium /
// maplibre-gl con terreno).
// =============================================================================

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Box, Layers, Mountain, TreePine, Droplets, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type View3DDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const FEATURES = [
  { icon: Mountain,   text: "Modelo de terreno con curvas de nivel cada 50m" },
  { icon: TreePine,   text: "Cobertura forestal en 3D con extrusión de copas" },
  { icon: Droplets,   text: "Red hidrográfica animada con caudal simulado" },
  { icon: Layers,     text: "Comparativa temporal 2010-2025-2030" },
  { icon: Box,        text: "Rotación libre + zoom a escala de edificio" },
];

export function View3DDialog({ open, onOpenChange }: View3DDialogProps) {
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
          className={cn(
            "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
            "gap-5 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          )}
        >
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Box className="size-6" />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-xl font-bold text-on-surface">
                Vista 3D · Próxima fase
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-body-sm text-on-surface-variant">
                Renderizado 3D del territorio con terreno, cobertura forestal,
                red hidrográfica y series temporales. En desarrollo.
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

          {/* Mockup visual: SVG inline del mockup del Stitch (no screenshot
              — los SVGs son deterministas, ligeros, y se pueden versionar). */}
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-gradient-to-br from-surface-container-low to-surface-container">
            <svg
              viewBox="0 0 400 140"
              xmlns="http://www.w3.org/2000/svg"
              className="h-auto w-full"
              role="img"
              aria-label="Mockup de la vista 3D del territorio de Cundinamarca"
            >
              <defs>
                <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#cee5d8" />
                  <stop offset="100%" stopColor="#e6e8ea" />
                </linearGradient>
                <linearGradient id="mtn1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#006d37" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#00391a" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="mtn2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#27ae60" stopOpacity="0.65" />
                  <stop offset="100%" stopColor="#005228" stopOpacity="0.85" />
                </linearGradient>
                <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#a3d4fe" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#27ae60" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              {/* Sky */}
              <rect width="400" height="140" fill="url(#sky)" />
              {/* Background mountains */}
              <polygon
                points="0,90 50,55 90,75 140,40 200,68 260,45 320,72 380,50 400,80 400,140 0,140"
                fill="url(#mtn2)"
              />
              {/* Foreground mountains */}
              <polygon
                points="0,110 60,80 110,95 170,70 220,90 280,75 340,95 400,82 400,140 0,140"
                fill="url(#mtn1)"
              />
              {/* Ground / water */}
              <ellipse cx="200" cy="140" rx="220" ry="32" fill="url(#ground)" />
              {/* River */}
              <path
                d="M 0 124 Q 100 116 200 122 T 400 118"
                stroke="#2f6388"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                opacity="0.85"
              />
              {/* Tree dots scattered */}
              {Array.from({ length: 20 }).map((_, i) => (
                <circle
                  key={i}
                  cx={20 + (i * 19) % 380}
                  cy={120 + ((i * 7) % 14)}
                  r="1.4"
                  fill="#005228"
                  opacity="0.6"
                />
              ))}
              {/* Label overlay */}
              <text x="14" y="22" fontSize="9" fontWeight="700" fill="#191c1e" fontFamily="Hanken Grotesk, sans-serif">
                CUNDINAMARCA · Vista 3D (mockup)
              </text>
              <text x="14" y="34" fontSize="7" fill="#3d4a3f" fontFamily="Hanken Grotesk, sans-serif">
                TERRENO + COBERTURA + HIDROGRAFÍA
              </text>
            </svg>
          </div>

          {/* Features list */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Features incluidas
            </p>
            <ul className="space-y-1.5">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2 text-body-sm text-on-surface">
                  <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button type="button" variant="outline">
                Cerrar
              </Button>
            </Dialog.Close>
            <a
              href="mailto:producto@terrasight.local?subject=Solicitar%20acceso%20anticipado%20a%20vista%203D&body=Hola%2C%20me%20interesar%C3%ADa%20ser%20beta-tester%20de%20la%20vista%203D"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-label-lg font-bold text-on-primary transition-[background-color,box-shadow] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
            >
              <Mail className="size-4" />
              Pedir acceso anticipado
            </a>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
