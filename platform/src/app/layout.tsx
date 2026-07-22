import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { getAlertas } from "@/lib/repos";
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

  // Sin sesión: NO renderizamos sidebar ni topbar. El middleware redirige a
  // /login cuando la ruta lo requiere, pero durante esa redirección el
  // layout todavía se evalúa y mostraba el sidebar+topbar sobre un form
  // que está pensado para ocupar la pantalla completa (ver /login/page.tsx).
  // Renderizar solo children hace que el form de login tenga el ancho
  // correcto y no aparezca la navegación.
  if (!usuario) {
    return (
      <html lang="es" className="light">
        <body className="min-h-screen bg-background text-on-surface">
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="es" className="light">
      <body className="flex h-screen overflow-hidden bg-background text-on-surface">
        <AuthSessionProvider>
          <Sidebar rol={usuario.rol} />
          <main className="flex h-screen flex-1 flex-col overflow-hidden">
            <TopBar alertas={alertas} usuario={usuario} />
            <div className="flex-1 overflow-hidden">{children}</div>
          </main>
        </AuthSessionProvider>
      </body>
    </html>
  );
}