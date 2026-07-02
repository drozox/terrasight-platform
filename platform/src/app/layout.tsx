import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { getAlertas } from "@/lib/repository";

export const metadata: Metadata = {
  title: "TerraSight — Plataforma SIG Integrada | Convenio CAR-WWF-Natura",
  description:
    "Plataforma de Sistemas de Información Geográfica para el monitoreo ambiental y la gestión territorial en Cundinamarca.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const alertas = await getAlertas(5);
  return (
    <html lang="es" className="light">
      <body className="flex h-screen overflow-hidden bg-background text-on-surface">
        <Sidebar />
        <main className="flex h-screen flex-1 flex-col overflow-hidden">
          <TopBar alertas={alertas} />
          <div className="flex-1 overflow-hidden">{children}</div>
        </main>
      </body>
    </html>
  );
}