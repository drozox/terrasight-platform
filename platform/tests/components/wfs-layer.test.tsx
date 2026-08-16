// =============================================================================
// Tests para WfsLayer — capa de polígonos fetched on-demand desde un endpoint
// backend (e.g. /api/wfs/parques, /api/wfs/reservas). Testeamos:
//   1. Patrón fetch + L.geoJSON.addTo(map) cuando el endpoint responde OK
//   2. No-op silencioso cuando el endpoint responde error
//   3. Cleanup: la capa se remueve del mapa al desmontar
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { WfsLayer } from "@/components/map/wfs-layer";

// Mock react-leaflet para inyectar un map mock
const mockAddTo = vi.fn();
const mockRemove = vi.fn();
const mockGeoJson = vi.fn((..._args: unknown[]) => ({ addTo: mockAddTo, remove: mockRemove })) as unknown as ReturnType<typeof vi.fn> & ((...args: unknown[]) => unknown);
const mockMap = { _mock: true };

vi.mock("react-leaflet", () => ({
  useMap: () => mockMap,
}));

vi.mock("leaflet", () => ({
  default: {
    geoJSON: ((...args: unknown[]) => mockGeoJson(...args)) as never,
  },
}));

describe("<WfsLayer>", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockAddTo.mockClear();
    mockRemove.mockClear();
    mockGeoJson.mockClear();
    mockAddTo.mockReturnValue({ remove: mockRemove });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hace fetch al endpoint y agrega la capa al mapa cuando responde 200", async () => {
    const fakeGeoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { nombre: "PNN Chingaza" },
          geometry: {
            type: "Polygon",
            coordinates: [[[-73.85, 4.45], [-73.45, 4.45], [-73.45, 4.85], [-73.85, 4.85], [-73.85, 4.45]]],
          },
        },
      ],
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeGeoJson),
    } as Response);

    render(<WfsLayer url="/api/wfs/parques" color="#2e7d32" fillOpacity={0.18} />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/wfs/parques",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
    await waitFor(() => {
      expect(mockGeoJson).toHaveBeenCalledWith(
        fakeGeoJson,
        expect.objectContaining({
          style: expect.any(Function),
          onEachFeature: expect.any(Function),
        }),
      );
    });
    await waitFor(() => {
      expect(mockAddTo).toHaveBeenCalledWith(mockMap);
    });
  });

  it("no agrega la capa al mapa cuando el endpoint responde error (404, 500)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    render(<WfsLayer url="/api/wfs/parques" color="#2e7d32" fillOpacity={0.18} />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });
    // mockGeoJson / addTo NO deben ser invocados
    expect(mockGeoJson).not.toHaveBeenCalled();
    expect(mockAddTo).not.toHaveBeenCalled();
  });

  it("remueve la capa del mapa al desmontar (cleanup)", async () => {
    const fakeGeoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeGeoJson),
    } as Response);

    const { unmount } = render(
      <WfsLayer url="/api/wfs/reservas" color="#558b2f" fillOpacity={0.12} />,
    );

    await waitFor(() => {
      expect(mockAddTo).toHaveBeenCalled();
    });
    unmount();
    expect(mockRemove).toHaveBeenCalled();
  });

  it("no rompe si la URL falla por red (catch silencioso)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { container } = render(
      <WfsLayer url="/api/wfs/parques" color="#2e7d32" fillOpacity={0.18} />,
    );

    // El componente retorna null, no debe crashear
    expect(container.firstChild).toBeNull();
  });

  it("el style() devuelve el color y fillOpacity correctos", async () => {
    const fakeGeoJson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { nombre: "X" },
          geometry: {
            type: "Polygon",
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
          },
        },
      ],
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeGeoJson),
    } as Response);

    render(<WfsLayer url="/api/wfs/parques" color="#ff0000" fillOpacity={0.42} />);

    await waitFor(() => {
      expect(mockGeoJson).toHaveBeenCalled();
    });
    const styleFn = (mockGeoJson.mock.calls[0] as unknown[] | undefined)?.[1] as { style: () => unknown } | undefined;
    expect(styleFn).toBeDefined();
    const style = styleFn!.style();
    expect(style).toMatchObject({
      color: "#ff0000",
      fillColor: "#ff0000",
      fillOpacity: 0.42,
    });
  });
});
