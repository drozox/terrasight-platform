"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ComponenteFull, AccionFull } from "@/lib/repository";
import { ComponentesPanel, AccionesPanel } from "./catalogos-panels";

type Flash = { tipo: "ok" | "error"; msg: string };

export function CatalogosTable({
  componentes,
  acciones,
}: {
  componentes: ComponenteFull[];
  acciones: AccionFull[];
}) {
  const [busy, setBusy] = React.useState(false);
  const [flash, setFlash] = React.useState<Flash | null>(null);

  function showFlash(f: Flash) {
    setFlash(f);
    if (f.tipo === "ok") setTimeout(() => setFlash(null), 3500);
  }

  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-1 gap-gutter xl:grid-cols-2">
        <Card className="overflow-hidden">
          <ComponentesPanel
            componentes={componentes}
            busy={busy}
            onBusyChange={setBusy}
            showFlash={showFlash}
          />
        </Card>
        <Card className="overflow-hidden">
          <AccionesPanel
            acciones={acciones}
            componentes={componentes}
            busy={busy}
            onBusyChange={setBusy}
            showFlash={showFlash}
          />
        </Card>
      </div>
    </div>
  );
}