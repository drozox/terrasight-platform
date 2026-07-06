"use client";

// =============================================================================
// Form de intersección por bounding box (HU-AA-03).
// 4 inputs (min/max lon/lat) + submit → GET search params → el server corre
// la consulta PostGIS.
// Defaults: bounding box que cubre el centro de Cundinamarca, útil para
// demos. El usuario los cambia.
// =============================================================================

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Initial = {
  minLon: string;
  minLat: string;
  maxLon: string;
  maxLat: string;
};

const DEFAULT: Initial = {
  minLon: "-74.20",
  minLat: "4.40",
  maxLon: "-73.80",
  maxLat: "4.90",
};

export function IntersectionBBoxForm({ initial }: { initial: Initial | null }) {
  const router = useRouter();
  const init = initial ?? DEFAULT;
  const [minLon, setMinLon] = React.useState(init.minLon);
  const [minLat, setMinLat] = React.useState(init.minLat);
  const [maxLon, setMaxLon] = React.useState(init.maxLon);
  const [maxLat, setMaxLat] = React.useState(init.maxLat);
  const [busy, setBusy] = React.useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const p = new URLSearchParams();
    p.set("ibbox_minLon", minLon);
    p.set("ibbox_minLat", minLat);
    p.set("ibbox_maxLon", maxLon);
    p.set("ibbox_maxLat", maxLat);
    router.push(`/analisis?${p.toString()}&btipo=quebrada#bbox`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <label className="block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Min lon (W)</span>
        <Input
          type="number"
          step="0.0001"
          min={-180}
          max={180}
          value={minLon}
          onChange={(e) => setMinLon(e.target.value)}
          required
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Min lat (S)</span>
        <Input
          type="number"
          step="0.0001"
          min={-90}
          max={90}
          value={minLat}
          onChange={(e) => setMinLat(e.target.value)}
          required
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Max lon (E)</span>
        <Input
          type="number"
          step="0.0001"
          min={-180}
          max={180}
          value={maxLon}
          onChange={(e) => setMaxLon(e.target.value)}
          required
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-label-lg font-medium text-on-surface">Max lat (N)</span>
        <Input
          type="number"
          step="0.0001"
          min={-90}
          max={90}
          value={maxLat}
          onChange={(e) => setMaxLat(e.target.value)}
          required
        />
      </label>
      <div className="flex items-end">
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
          Analizar
        </Button>
      </div>
    </form>
  );
}
