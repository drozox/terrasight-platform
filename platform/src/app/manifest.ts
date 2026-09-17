import type { MetadataRoute } from "next";

/**
 * Web App Manifest — íconos del logo (frailejón) para Android / PWA y color
 * de marca. Next.js lo expone automáticamente en /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SIG TERRITORIO — Plataforma SIG Integrada",
    short_name: "SIG Territorio",
    description:
      "Plataforma de Sistemas de Información Geográfica para el monitoreo ambiental y la gestión territorial (Convenio CAR · WWF · Fundación Natura).",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#006d37",
    icons: [
      { src: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { src: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
