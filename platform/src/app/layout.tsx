import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { getAlertas } from "@/lib/repository";
import { getCurrentUser } from "@/lib/auth-guard";

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
  const [alertas, usuario] = await Promise.all([
    getAlertas(5),
    getCurrentUser(),
  ]);
  return (
    <html lang="es" className="light">
      <body className="flex h-screen overflow-hidden bg-background text-on-surface">
        <AuthSessionProvider>
          {/* Si no hay sesión el middleware redirige a /login; dejamos
              renderizar el sidebar igual para no romper el layout. */}
          <Sidebar rol={usuario?.rol ?? null} />
          <main className="flex h-screen flex-1 flex-col overflow-hidden">
            <TopBar alertas={alertas} usuario={usuario} />
            <div className="flex-1 overflow-hidden">{children}</div>
          </main>
        </AuthSessionProvider>
      </body>
    </html>
  );
}