// =============================================================================
// tests/components/map-layer-data-panel.test.tsx — DEEPSEEK-67
//
// Cubre el panel que muestra los datos (atributos) de una capa del mapa.
// Patrón: vi.stubGlobal("fetch", ...) para mockear la respuesta de
// /api/geo?layer=X sin levantar server.
//
// Casos:
//  - layer=null → no renderiza nada
//  - layer="propuestas_punto" + fetch OK → muestra título + fila con la actividad
//  - layer="propuestas_punto" + fetch 500 → muestra "Error"
//  - Verifica que se llamó a /api/geo?layer=propuestas_punto
// =============================================================================

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MapLayerDataPanel } from "@/components/map/map-layer-data-panel";

describe("<MapLayerDataPanel>", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("layer=null → no renderiza nada", () => {
    const { container } = render(
      <MapLayerDataPanel layer={null} onClose={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("layer='propuestas_punto' + fetch OK → muestra título y fila con la actividad", async () => {
    const fc = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [0, 0] },
          properties: { nombre: "Cerco vivo en V1", tipo: "C1" },
        },
      ],
    };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => fc,
    });

    render(<MapLayerDataPanel layer="propuestas_punto" onClose={() => {}} />);

    // Título del panel (de LAYER_DATA_META.propuestas_punto.title)
    await waitFor(() => {
      expect(screen.getByText("Intervenciones (puntos)")).toBeInTheDocument();
    });

    // Fila con la actividad
    await waitFor(() => {
      expect(screen.getByText("Cerco vivo en V1")).toBeInTheDocument();
    });
    // Tipo de la fila
    expect(screen.getByText("C1")).toBeInTheDocument();

    // El fetch fue al endpoint correcto
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/geo?layer=propuestas_punto");
  });

  it("layer='propuestas_punto' + fetch 500 → muestra 'Error'", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
    });

    render(<MapLayerDataPanel layer="propuestas_punto" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Error/)).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/geo?layer=propuestas_punto");
  });

  it("layer desconocida → no renderiza (defensa)", () => {
    const { container } = render(
      <MapLayerDataPanel layer="layer_inexistente" onClose={() => {}} />,
    );
    // No hay meta → no renderiza
    expect(container).toBeEmptyDOMElement();
    // Y no se hizo fetch
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
